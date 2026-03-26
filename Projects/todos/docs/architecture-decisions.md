# Architecture Decisions

Engineering trade-offs for a Supabase + Next.js application. Each decision includes the options, when to pick each one, and the scale at which one starts to beat the other.

---

## 1. Mutations: Server Actions vs Browser Client

**The question:** Where do we call `supabase.from("todos").update(...)` — on the server (Server Action) or in the browser (browser client)?

### Option A: Server Actions

```
User click → Server Action (Node.js) → Supabase API → revalidatePath → page re-renders
```

```ts
// lib/todos/actions.ts
"use server"
export async function toggleTodo(id: string, completed: boolean) {
  const supabase = await createClient() // server client
  await supabase.from("todos").update({ completed }).eq("id", id)
  revalidatePath("/dashboard")
}
```

### Option B: Browser Client

```
User click → Browser JS → Supabase API directly → optimistic UI or router.refresh()
```

```ts
// Inside a Client Component
const supabase = createClient() // browser client
await supabase.from("todos").update({ completed }).eq("id", id)
router.refresh() // or update local state optimistically
```

### Comparison

| Criteria | Server Actions | Browser Client |
|----------|---------------|----------------|
| **Latency** | Higher — extra hop through your server | Lower — direct to Supabase |
| **Data refresh** | Natural with `revalidatePath` | Must call `router.refresh()` or manage state manually |
| **Secret safety** | service_role key never reaches browser | Only anon key in browser (fine, but no server-only logic) |
| **Validation** | Can add server-side validation before DB call | Must rely on DB constraints + RLS only |
| **Optimistic UI** | Harder — must use `useOptimistic` or `useTransition` | Natural — update local state immediately, rollback on error |
| **Real-time** | Not applicable — server actions are request/response | Pairs naturally with Supabase Realtime subscriptions |
| **Offline** | Does not work offline | Can queue mutations and sync later |
| **Testing** | Easy to unit test (pure async function) | Requires browser/component test environment |

### When to use which

| Scale / Context | Recommended | Why |
|-----------------|-------------|-----|
| CRUD forms, admin panels | **Server Actions** | Simple, secure, pairs with Server Components |
| Real-time collaborative features (chat, cursors) | **Browser Client** | Need Realtime subscriptions + instant updates |
| Optimistic UI (toggle checkbox, drag-and-drop) | **Browser Client** | User expects instant feedback |
| Multi-step wizard / transactions | **Server Actions** | Can orchestrate multiple DB calls atomically |
| Mobile-first / offline-capable | **Browser Client** | Can queue mutations offline |
| Mixed (most production apps) | **Both** | Server Actions for forms, Browser Client for real-time + optimistic |

### Our choice

Server Actions — because we have Server Components fetching data, and `revalidatePath` keeps everything in sync. When we add Realtime (Phase 2), we'll add browser client subscriptions alongside.

---

## 2. Filtering: Client-Side vs Server-Side

**The question:** Do we fetch all rows and filter in JavaScript, or pass filters to Supabase and only fetch matching rows?

### Option A: Client-Side Filtering

```
Server: SELECT * FROM todos → send all rows to browser → JavaScript .filter() in useMemo
```

```ts
// Server Component
const { data: todos } = await supabase.from("todos").select("*").is("deleted_at", null)

// Client Component
const filtered = useMemo(() => {
  return todos.filter(t => filters.category === "all" || t.category_id === filters.category)
}, [todos, filters])
```

### Option B: Server-Side Filtering

```
Browser: user picks filter → URL search params change → Server Component re-fetches with WHERE clause
```

```ts
// Server Component with search params
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams
  let query = supabase.from("todos").select("*").is("deleted_at", null)
  if (params.category) query = query.eq("category_id", params.category)
  const { data: todos } = await query
}
```

### Option C: Hybrid (best of both)

Initial load fetches all rows. Simple filters (status, priority) are client-side. Heavy filters (full-text search, date ranges across large datasets) are server-side.

### Comparison

| Criteria | Client-Side | Server-Side |
|----------|-------------|-------------|
| **Filter speed** | Instant — no network request | 100-300ms round-trip per filter change |
| **Initial load** | Heavier — downloads all rows | Lighter — only matching rows |
| **Network usage** | One request, larger payload | Many requests, smaller payloads |
| **URL state** | Filters lost on refresh (unless you sync to URL) | Filters in URL — shareable, back button works |
| **Pagination** | Must implement in JS (slice array) | Natural with `.range(from, to)` |
| **Full-text search** | Slow on large datasets | Fast with `pg_trgm` or `tsvector` indexes |
| **Complexity** | Simple — one fetch, filter in memo | More code — URL params, conditional query building |
| **Offline** | Works — data already in memory | Breaks — needs network for every filter |

### When to use which

| Dataset Size | Recommended | Why |
|--------------|-------------|-----|
| **< 200 rows** | Client-side | Instant filters, simpler code, minimal payload |
| **200–1,000 rows** | Hybrid | Client-side for simple filters, server-side for search |
| **1,000–10,000 rows** | Server-side + pagination | Too much data to send all at once |
| **10,000+ rows** | Server-side + cursor pagination + search indexes | Must use DB indexes, `LIMIT`/`OFFSET` or keyset pagination |

### Bandwidth math

A single todo row (with relations) is roughly **500 bytes** JSON. At different scales:

| Rows | Payload | Client-side OK? |
|------|---------|-----------------|
| 50 | 25 KB | Yes |
| 200 | 100 KB | Yes |
| 1,000 | 500 KB | Borderline |
| 5,000 | 2.5 MB | No — too slow on mobile |
| 50,000 | 25 MB | Absolutely not |

### Our choice

Client-side filtering — a single user will have 50-200 todos. The entire dataset fits in one small response, and filter switching is instant with zero loading states.

---

## 3. Query Architecture: Where to Put DB Functions

**The question:** Do we write Supabase queries inline in page files, extract them to a service layer, or use a repository pattern?

### Option A: Inline (current)

Queries live directly in the file that uses them.

```
app/dashboard/page.tsx       ← supabase.from("todos").select(...)
app/dashboard/actions.ts     ← supabase.from("todos").update(...)
```

### Option B: Service / Query Layer

Extract all queries into dedicated files grouped by domain.

```
lib/
├── queries/
│   ├── todos.ts             ← fetchTodos(), fetchTodoById()
│   ├── categories.ts        ← fetchCategories()
│   └── tags.ts              ← fetchTags(), fetchTagsWithCount()
└── actions/
    ├── todos.ts             ← createTodo(), updateTodo(), softDeleteTodo()
    ├── categories.ts        ← createCategory(), updateCategory()
    └── tags.ts              ← createTag(), deleteTag()
```

```ts
// lib/queries/todos.ts
export async function fetchTodos(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("todos")
    .select("*, categories(*), todo_tags(*, tags(*))")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("priority", { ascending: false })
  if (error) throw error
  return data
}

// app/dashboard/page.tsx — clean
import { fetchTodos } from "@/lib/queries/todos"
const todos = await fetchTodos(userId)
```

### Option C: Repository Pattern

Formal class-based abstraction per table.

```ts
// lib/repositories/todo.repository.ts
class TodoRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findAll(userId: string) { ... }
  async findById(id: string) { ... }
  async create(data: TodoInsert) { ... }
  async update(id: string, data: TodoUpdate) { ... }
  async softDelete(id: string) { ... }
}
```

### Comparison

| Criteria | Inline | Service Layer | Repository |
|----------|--------|---------------|------------|
| **Simplicity** | Simplest — query right where you use it | Moderate — one extra file per domain | Complex — classes, interfaces, DI |
| **Duplication** | Same query copied across pages | Single source of truth | Single source of truth |
| **Discoverability** | Must search all pages for queries | `lib/queries/todos.ts` — obvious | Formal API, easy to navigate |
| **Testability** | Must mock Supabase in page tests | Easy to mock one function | Easy to mock, but over-engineered |
| **Refactoring** | Must find/replace across files | Change in one place | Change in one place |
| **Supabase fit** | Natural — Supabase IS the query builder | Good balance | Overkill — wrapping a query builder in another query builder |

### When to use which

| Project Size | Team | Recommended | Why |
|-------------|------|-------------|-----|
| Side project / learning | 1 dev | **Inline** | No duplication yet, minimum files |
| Startup MVP / small app | 1-3 devs | **Service Layer** | Queries get reused across pages, needs one source of truth |
| Large app / enterprise | 5+ devs | **Service Layer** | Still the sweet spot — repositories add ceremony without value when Supabase already provides a typed query builder |
| Non-Supabase (raw SQL, Prisma) | Any | **Repository** | Makes sense when you need to abstract the ORM away |

### The evolution rule

```
Start inline → extract when you duplicate → never over-abstract

1. Query used in 1 place    → keep inline
2. Query used in 2+ places  → extract to lib/queries/
3. Query with complex logic  → extract to lib/queries/ even if used once
4. Never: repository classes wrapping Supabase client
```

### Our choice

Inline — we're early, no duplication yet. When the same query appears in a second page, we'll extract to `lib/queries/`.

---

## 4. Data Security: Query Filter vs RLS

**The question:** How do we ensure a user only sees their own data?

### Layer 1: Query Filter (application level)

```ts
const { data } = await supabase
  .from("todos")
  .select("*")
  .eq("user_id", userId)  // ← application-level filter
```

### Layer 2: Row Level Security (database level)

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own todos"
  ON todos FOR SELECT
  USING (user_id = auth.uid());
```

### Why you need BOTH

| Scenario | Query Filter Only | RLS Only | Both |
|----------|-------------------|----------|------|
| Normal app usage | Works | Works | Works |
| Attacker calls REST API directly (no `.eq()`) | **Data leaked** | Blocked by DB | Blocked by DB |
| Developer forgets filter in new page | **Data leaked** | Blocked by DB | Blocked by DB |
| Performance (DB can optimize) | No index hint from policy | Automatic filter pushdown | Best — DB uses both |
| Debugging (unexpected empty results) | Easy to debug | Policy might silently filter | Keep query filter for clarity |

### The rule

```
RLS  = security   (mandatory, enforced by PostgreSQL, cannot be bypassed)
.eq() = clarity   (optional, makes intent obvious, helps with debugging)
```

Never rely on `.eq("user_id", ...)` alone for security. Always enable RLS. Then add `.eq()` for readability and to help the query planner.

### Our roadmap

| Chapter | What we add |
|---------|-------------|
| Now (Ch 03) | `.eq("user_id", USER_ID)` — hardcoded, no real security |
| Chapter 04 (Auth) | Replace `USER_ID` with `auth.uid()` from real logged-in user |
| Chapter 05 (RLS) | Enable RLS on all tables — database enforces access |

---

## 5. Data Fetching: SSR vs CSR vs ISR

**The question:** When and how do we fetch data from Supabase?

### Option A: Server-Side Rendering (SSR) — what we use

```ts
// Server Component — runs on every request
export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from("todos").select("*")
  return <TodoList todos={data} />
}
```

### Option B: Client-Side Rendering (CSR)

```ts
// Client Component — fetches after mount
"use client"
export default function Page() {
  const [todos, setTodos] = useState([])
  useEffect(() => {
    const supabase = createClient()
    supabase.from("todos").select("*").then(({ data }) => setTodos(data))
  }, [])
  return <TodoList todos={todos} />
}
```

### Option C: SSR + Real-time (hybrid for live features)

```ts
// Server Component fetches initial data
// Client Component subscribes to changes
export default async function Page() {
  const todos = await fetchTodos()               // SSR initial load
  return <TodoListRealtime initialTodos={todos} /> // client subscribes to changes
}
```

### Comparison

| Criteria | SSR | CSR | SSR + Realtime |
|----------|-----|-----|----------------|
| **First paint** | Fast — HTML includes data | Slow — blank then loading spinner | Fast — HTML includes data |
| **SEO** | Full content in HTML | No content until JS runs | Full content in HTML |
| **Freshness** | Fresh on every request | Fresh after mount | Always fresh (live updates) |
| **Complexity** | Simple | Simple | More complex — manage subscriptions |
| **Server load** | Every page view hits DB | DB hit only when user interacts | Initial hit + WebSocket connection |
| **Offline** | Blank page | Can show cached data | Can show cached + queue updates |

### When to use which

| Use Case | Recommended |
|----------|-------------|
| Dashboard, CRUD pages, admin | **SSR** |
| Chat, notifications, collaborative editing | **SSR + Realtime** |
| Public marketing page with dynamic data | **SSR** (or ISR if data changes rarely) |
| Heavy interactive app (drag-and-drop board) | **CSR** with SWR/React Query |
| Data changes every few seconds | **SSR + Realtime** |

### Our choice

SSR — dashboard data doesn't need live updates. Server Components fetch fresh data on every request. When we add Realtime in Phase 2, we'll move to SSR + Realtime hybrid.

---

## Decision Summary

| Decision | Our Choice | Scale Threshold to Reconsider |
|----------|------------|-------------------------------|
| Mutations | Server Actions | Add browser client when we need Realtime or optimistic UI |
| Filtering | Client-side | Switch to server-side at 500+ rows or when adding search |
| Query architecture | Inline | Extract to `lib/queries/` when a query is used in 2+ places |
| Security | `.eq()` filter now | Add RLS in Chapter 05 — mandatory for production |
| Data fetching | SSR | Add Realtime subscriptions in Phase 2 |
