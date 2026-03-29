# Backend Workflow Timeline

The complete pipeline from project initialization to application code, as implemented in this todos project.

---

## Overview

```
supabase init → migrations (SQL) → seed.sql → db reset → gen types → types/ → lib/supabase/clients/ → lib/supabase/{domain}/ → app/
```

---

## Step-by-Step

### 1. Project Initialization

```bash
supabase init
```

Creates the `supabase/` directory with `config.toml`.

```
supabase/
├── config.toml       # Local stack config (ports, auth providers, etc.)
├── migrations/       # Empty — ready for SQL files
└── seed.sql          # Empty — ready for test data
```

---

### 2. Write Migrations (SQL)

```bash
supabase migration new create_extensions
supabase migration new create_tables
supabase migration new create_updated_at_trigger
supabase migration new create_indexes
```

Each command creates a timestamped `.sql` file in `supabase/migrations/`. You then write raw SQL inside:

```
supabase/migrations/
├── 20260324170623_create_extensions.sql    # Extensions (vector, pg_trgm)
├── 20260324170713_create_tables.sql        # Tables, constraints, FKs
├── 20260324170728_create_updated_at_trigger.sql  # Trigger functions
└── 20260324170739_create_indexes.sql       # Indexes (B-tree, GIN, etc.)
```

**Rule:** One concern per migration. Extensions, tables, triggers, indexes each get their own file.

---

### 3. Write Seed Data

Edit `supabase/seed.sql` — insert test rows so you have data to work with locally.

```sql
-- Fixed UUIDs for reproducible test data
INSERT INTO categories (id, user_id, name, color) VALUES (...);
INSERT INTO todos (user_id, category_id, title, ...) VALUES (...);
INSERT INTO tags (id, user_id, name) VALUES (...);
INSERT INTO todo_tags (todo_id, tag_id) SELECT ...;
```

**Rule:** Use fixed UUIDs in seeds so relationships are deterministic across resets.

---

### 4. Apply Everything Locally

```bash
supabase db reset
```

This runs: drop all → apply migrations in order → run `seed.sql`. Your local database is now ready.

---

### 5. Generate TypeScript Types

```bash
supabase gen types typescript --local > types/database.types.ts
```

Auto-generates types from your schema. This file contains:

- `Database` — the full schema type (tables, views, functions, enums)
- `Tables<T>` — row type helper
- `TablesInsert<T>` — insert type helper
- `TablesUpdate<T>` — update type helper

**Rule:** Never edit this file by hand. Re-run the command after every migration.

---

### 6. Define Helper Types (`types/`)

Build on the generated types to create domain-specific types:

```
types/
├── database.types.ts   # Auto-generated (step 5) — DO NOT EDIT
├── helpers.ts          # Row/Insert/Update aliases + composite types
└── actions.ts          # ActionResult<T> for server action return types
```

**`helpers.ts`** — extract and compose types from the generated file:

```typescript
export type Todo = Database["public"]["Tables"]["todos"]["Row"];
export type TodoInsert = Database["public"]["Tables"]["todos"]["Insert"];
export type TodoWithRelations = Todo & {
  categories: Category | null;
  todo_tags: (TodoTag & { tags: Tag })[];
};
```

**`actions.ts`** — standardized return type for server actions:

```typescript
export type ActionResult<T = void> =
  | { data: T; error: null }
  | { data: null; error: string }
```

---

### 7. Setup Supabase Clients (`lib/supabase/clients/`)

Create the Supabase client factories — one per environment:

```
lib/supabase/clients/
├── server.ts       # Server Components & Server Actions (uses cookies)
├── client.ts       # Client Components (browser client)
└── middleware.ts    # Next.js middleware (token refresh + auth guard)
```

Both clients are typed with `<Database>` from step 5:

```typescript
// server.ts
import type { Database } from '@/types/database.types'
return createServerClient<Database>(url, key, { cookies: ... })

// client.ts
import type { Database } from '@/types/database.types'
return createBrowserClient<Database>(url, key)
```

**Rule:** Components never import from `@supabase/ssr` directly — always go through these factories.

---

### 8. Build the Data Layer (`lib/supabase/`)

Organized by domain. Each domain folder has:

- **`queries.ts`** — read operations (used in Server Components)
- **`actions.ts`** — write operations (Server Actions with `"use server"`)
- **`client.ts`** — browser-side operations (auth flows, realtime, etc.)

```
lib/supabase/
├── clients/
│   ├── server.ts       # server client factory                ← infrastructure
│   ├── client.ts       # browser client factory               ← infrastructure
│   └── middleware.ts   # token refresh + auth guard            ← infrastructure
├── auth/
│   ├── client.ts       # signInWithGoogle(), signOut()         ← browser
│   └── queries.ts      # getUser()                            ← server
├── categories/
│   └── queries.ts      # getCategories()                      ← server
└── todos/
    ├── queries.ts      # getTodosWithRelations()              ← server
    └── actions.ts      # toggleTodoComplete(), addTodo()      ← server actions
```

**Pattern for queries (reads):**

```typescript
import { createClient } from "@/lib/supabase/clients/server"

export async function getTodosWithRelations() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("todos")
        .select("*, categories(*), todo_tags(*, tags(*))")
    if (error) throw new Error(error.message)
    return data
}
```

**Pattern for actions (writes):**

```typescript
"use server"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail, type ActionResult } from "@/types/actions"

export async function addTodo(data: {...}): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase.from("todos").insert({...})
    if (error) return fail(error.message)
    revalidatePath("/dashboard")
    return ok()
}
```

**Pattern for client-side (browser):**

```typescript
import { createClient } from "@/lib/supabase/clients/client"

export async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: "google", ... })
}
```

---

### 9. Use in App (`app/`)

Pages and components consume `lib/supabase/` functions — they never touch Supabase directly:

```typescript
// app/dashboard/page.tsx (Server Component)
import { getTodosWithRelations } from "@/lib/supabase/todos/queries"
import { getCategories } from "@/lib/supabase/categories/queries"

export default async function DashboardPage() {
    const [todos, categories] = await Promise.all([
        getTodosWithRelations(),
        getCategories(),
    ])
    return <TodoList todos={todos} categories={categories} />
}
```

```typescript
// components/todo-item.tsx (Client Component)
import { toggleTodoComplete } from "@/lib/supabase/todos/actions"

// Call server action directly from onClick
```

---

## Full Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER (supabase/)                       │
│                                                                         │
│  supabase init                                                          │
│       │                                                                 │
│       ▼                                                                 │
│  supabase migration new <name>       ← create empty migration file     │
│       │                                                                 │
│       ▼                                                                 │
│  Write SQL (tables, triggers,        ← you write raw SQL               │
│  indexes, RLS policies)                                                 │
│       │                                                                 │
│       ▼                                                                 │
│  Edit seed.sql                       ← test data with fixed UUIDs      │
│       │                                                                 │
│       ▼                                                                 │
│  supabase db reset                   ← apply migrations + seed         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        TYPE LAYER (types/)                              │
│                                                                         │
│  supabase gen types typescript       ← auto-generate database.types    │
│       │                                                                 │
│       ▼                                                                 │
│  types/helpers.ts                    ← domain aliases + composites     │
│  types/actions.ts                    ← ActionResult<T> pattern         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        CLIENT LAYER (lib/supabase/clients/)             │
│                                                                         │
│  lib/supabase/clients/server.ts      ← typed server client factory     │
│  lib/supabase/clients/client.ts      ← typed browser client factory    │
│  lib/supabase/clients/middleware.ts   ← auth guard + token refresh     │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER (lib/supabase/{domain}/)              │
│                                                                         │
│  lib/supabase/{domain}/queries.ts    ← reads  (Server Components)      │
│  lib/supabase/{domain}/actions.ts    ← writes (Server Actions)         │
│  lib/supabase/{domain}/client.ts     ← browser ops (auth, realtime)    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        UI LAYER (app/ + components/)                    │
│                                                                         │
│  app/ pages import from lib/supabase/ ← never touch Supabase directly  │
│  components/ call server actions      ← via lib/supabase/{domain}/     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## When You Add a New Feature

Repeat this subset of the pipeline:

1. `supabase migration new <name>` — write the SQL
2. `supabase db reset` — apply it
3. `supabase gen types typescript --local > types/database.types.ts` — regenerate types
4. Update `types/helpers.ts` if new types are needed
5. Add `lib/supabase/{domain}/queries.ts` or `actions.ts`
6. Use in `app/` pages and components
