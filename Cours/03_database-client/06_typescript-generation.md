# 06 — TypeScript Generation

## The problem

Without types, the Supabase client returns `any`:

```typescript
const { data } = await supabase.from('todos').select('*')
// data: any[] — no autocomplete, no type checking
data[0].titl  // typo — no error at compile time, crashes at runtime
```

Supabase solves this by **generating TypeScript types directly from your database schema**.

---

## Generating types

Make sure your local stack is running (`supabase start`), then:

```bash
supabase gen types typescript --local > types/database.types.ts
```

This reads every table, column, type, and relation from your local database and outputs a TypeScript file.

> Create the `types/` folder first if it doesn't exist:
> ```bash
> mkdir -p types
> ```

### What's inside the generated file

The file exports a `Database` type that describes your entire schema:

```typescript
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          color: string
          icon: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string           // optional — has default
          name: string          // required
          color?: string        // optional — has default
          icon?: string | null  // optional — nullable
          user_id: string       // required
          created_at?: string   // optional — has default
        }
        Update: {
          id?: string
          name?: string
          color?: string
          icon?: string | null
          user_id?: string
          created_at?: string
        }
      }
      todos: { ... }
      tags: { ... }
      todo_tags: { ... }
    }
  }
}
```

Three types per table:

| Type | Used for | Required fields |
|------|----------|----------------|
| `Row` | Data you **read** from the table | All columns |
| `Insert` | Data you **insert** | Only columns without defaults |
| `Update` | Data you **update** | All optional (you update what you want) |

---

## Wiring types to the client

### Step 1: Pass the Database type to `createClient`

Update your client files to use the generated types.

**`utils/supabase/client.ts`:**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`utils/supabase/server.ts`:**

```typescript
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components can't set cookies
          }
        },
      },
    }
  )
}
```

The key change is `<Database>` — the generic type parameter.

### Step 2: Enjoy type safety

Now every query is fully typed:

```typescript
const { data: todos } = await supabase
  .from('todos')        // ← autocomplete: 'categories' | 'todos' | 'tags' | 'todo_tags'
  .select('id, title, priority')

// todos is typed as:
// { id: string; title: string; priority: number }[]

todos[0].title     // ✓ string
todos[0].titl      // ✗ compile error — property 'titl' does not exist
todos[0].priority  // ✓ number
```

Insert is also typed:

```typescript
await supabase.from('todos').insert({
  title: 'New todo',   // ✓ required
  user_id: userId,     // ✓ required
  priority: 5,         // ✗ compile error — Check constraint won't show, but type is number
  // id, created_at, updated_at, completed, etc. — all optional (have defaults)
})
```

---

## Helper types

Extract types for use in components and functions:

```typescript
// types/database.types.ts (add at the bottom, or in a separate file)
import { Database } from './database.types'

// Row types (for reading)
export type Category = Database['public']['Tables']['categories']['Row']
export type Todo = Database['public']['Tables']['todos']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']

// Insert types (for creating)
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type TagInsert = Database['public']['Tables']['tags']['Insert']

// Update types (for updating)
export type TodoUpdate = Database['public']['Tables']['todos']['Update']
```

Usage in components:

```typescript
// components/todo-card.tsx
import { Todo, Category, Tag } from '@/types/database.types'

interface TodoWithRelations {
  id: string
  title: string
  priority: number
  completed: boolean
  categories: Category | null
  tags: Tag[]
}

function TodoCard({ todo }: { todo: TodoWithRelations }) {
  return (
    <div>
      <h3>{todo.title}</h3>
      <span>{todo.categories?.name}</span>
      {todo.tags.map(tag => (
        <span key={tag.id}>{tag.name}</span>
      ))}
    </div>
  )
}
```

---

## Regenerating types

Every time you change the schema (new migration), regenerate:

```bash
supabase db reset                                       # apply migrations
supabase gen types typescript --local > types/database.types.ts  # regenerate
```

In Chapter 06 (CI/CD), you'll automate this in GitHub Actions so types are always in sync.

### Add a script to package.json

```json
{
  "scripts": {
    "gen:types": "supabase gen types typescript --local > types/database.types.ts"
  }
}
```

Then just run:

```bash
npm run gen:types
```

---

## Generating from remote (production)

For production types (from your hosted project):

```bash
supabase gen types typescript --project-id <your-project-ref> > types/database.types.ts
```

This requires `supabase login` first. Useful in CI/CD when you don't have a local stack running.

---

## Summary

| Command | What it does |
|---------|-------------|
| `supabase gen types typescript --local` | Generate types from local database |
| `supabase gen types typescript --project-id <ref>` | Generate types from remote database |

| Type | Purpose | Fields |
|------|---------|--------|
| `Row` | Reading data | All columns, correct nullability |
| `Insert` | Inserting data | Required = no default, Optional = has default |
| `Update` | Updating data | All optional |

### Workflow

```
1. Write migration          supabase migration new ...
2. Reset database           supabase db reset
3. Regenerate types         npm run gen:types
4. Use typed client         supabase.from('todos').select(...)  ← fully typed
```

---

## Chapter 03 — Complete

You now know how to:
- **PostgREST** auto-generates a REST API from your tables
- **Client setup** — browser, server, and middleware clients
- **CRUD** — insert, select, update, delete, upsert
- **Filtering** — eq, gt, like, or, order, limit, range
- **Relations** — nested queries for joined data in one round-trip
- **TypeScript** — generated types for full type safety

### What's next

**Task 02** — Implement the Supabase client in your todos project: generate types, wire up the client, build dashboard pages with real data from your local database.

After that: **Chapter 04 — Auth** (Google OAuth + Magic Link).
