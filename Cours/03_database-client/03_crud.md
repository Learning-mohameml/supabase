# 03 — CRUD from the Client

## How client queries map to SQL

Every Supabase client call translates to a PostgREST HTTP request, which translates to SQL:

```
supabase.from('todos').select('*')
    ↓
GET /rest/v1/todos
    ↓
SELECT * FROM todos
```

This section covers the four operations: **Select**, **Insert**, **Update**, **Delete** — plus **Upsert**.

---

## Select (Read)

### Select all rows

```typescript
const { data, error } = await supabase
  .from('todos')
  .select('*')
```

SQL: `SELECT * FROM todos`

### Select specific columns

```typescript
const { data, error } = await supabase
  .from('todos')
  .select('id, title, priority, completed')
```

SQL: `SELECT id, title, priority, completed FROM todos`

> Always select only the columns you need. Avoid `select('*')` in production — it fetches everything including `embedding` (vector) which is large.

### Select a single row

```typescript
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('id', todoId)
  .single()
```

`.single()` expects exactly one row. Returns an **object** instead of an array. Throws an error if 0 or 2+ rows match.

---

## Insert (Create)

### Insert one row

```typescript
const { data, error } = await supabase
  .from('todos')
  .insert({
    title: 'Buy milk',
    priority: 1,
    user_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  })
  .select()
```

SQL: `INSERT INTO todos (title, priority, user_id) VALUES ('Buy milk', 1, 'aaaaaaaa-...') RETURNING *`

> `.select()` at the end is like `RETURNING *` — it returns the inserted row. Without it, you get no data back (just success/error).

### Insert multiple rows

```typescript
const { data, error } = await supabase
  .from('tags')
  .insert([
    { name: 'frontend', user_id: userId },
    { name: 'backend', user_id: userId },
    { name: 'devops', user_id: userId },
  ])
  .select()
```

SQL: `INSERT INTO tags (name, user_id) VALUES ('frontend', ...), ('backend', ...), ('devops', ...) RETURNING *`

### Columns you can skip

Columns with defaults don't need to be specified:

| Column | Default | Can skip? |
|--------|---------|-----------|
| `id` | `gen_random_uuid()` | Yes |
| `created_at` | `now()` | Yes |
| `updated_at` | `now()` | Yes |
| `completed` | `false` | Yes |
| `priority` | `0` | Yes |
| `position` | `0` | Yes |
| `metadata` | `'{}'` | Yes |
| `color` | `'#6B7280'` / `'#3B82F6'` | Yes |

---

## Update

### Update by ID

```typescript
const { data, error } = await supabase
  .from('todos')
  .update({ completed: true })
  .eq('id', todoId)
  .select()
```

SQL: `UPDATE todos SET completed = true WHERE id = '...' RETURNING *`

### Update multiple columns

```typescript
const { data, error } = await supabase
  .from('todos')
  .update({
    title: 'Updated title',
    priority: 3,
    metadata: { notes: 'urgent fix needed' },
  })
  .eq('id', todoId)
  .select()
```

### Update multiple rows

```typescript
// Mark all todos in a category as completed
const { data, error } = await supabase
  .from('todos')
  .update({ completed: true })
  .eq('category_id', categoryId)
  .select()
```

> **Always add a filter** (`.eq()`, `.in()`, etc.) when updating. Without a filter, you update **every row** in the table.

### The trigger works automatically

Remember the `update_updated_at` trigger from Chapter 01? It fires on every UPDATE. When you call `.update()`, the `updated_at` column is set to `now()` automatically — you don't need to include it.

---

## Delete

### Delete by ID

```typescript
const { error } = await supabase
  .from('todos')
  .delete()
  .eq('id', todoId)
```

SQL: `DELETE FROM todos WHERE id = '...'`

### Soft delete (preferred for todos)

Our app uses soft delete — set `deleted_at` instead of actually deleting:

```typescript
const { data, error } = await supabase
  .from('todos')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', todoId)
  .select()
```

Then all queries filter out soft-deleted rows:

```typescript
const { data } = await supabase
  .from('todos')
  .select('*')
  .is('deleted_at', null)  // Only active todos
```

### Hard delete

For junction tables like `todo_tags`, hard delete is fine:

```typescript
// Remove a tag from a todo
const { error } = await supabase
  .from('todo_tags')
  .delete()
  .eq('todo_id', todoId)
  .eq('tag_id', tagId)
```

> **Always add a filter** when deleting. Without one, you delete **every row**.

---

## Upsert

Upsert = **insert if new, update if exists**. It uses the `ON CONFLICT` clause under the hood.

### Upsert a tag (by unique constraint)

```typescript
const { data, error } = await supabase
  .from('tags')
  .upsert({
    name: 'urgent',
    color: '#DC2626',
    user_id: userId,
  })
  .select()
```

SQL: `INSERT INTO tags (name, color, user_id) VALUES ('urgent', '#DC2626', '...') ON CONFLICT (name, user_id) DO UPDATE SET color = '#DC2626' RETURNING *`

This works because `tags` has a `UNIQUE (name, user_id)` constraint. If `urgent` already exists for that user, it updates the color. If not, it inserts a new row.

### Upsert with specific conflict target

```typescript
const { data, error } = await supabase
  .from('tags')
  .upsert(
    { name: 'urgent', color: '#DC2626', user_id: userId },
    { onConflict: 'name, user_id' }
  )
  .select()
```

---

## Error handling

Every query returns `{ data, error }`. Always check for errors:

```typescript
const { data, error } = await supabase
  .from('todos')
  .insert({ title: 'New todo', user_id: userId })
  .select()

if (error) {
  console.error('Insert failed:', error.message)
  // error.code — PostgreSQL error code (e.g., '23505' for unique violation)
  // error.details — more info
  // error.hint — PostgreSQL hint
  return
}

// data is the inserted row
console.log('Created:', data)
```

### Common error codes

| Code | Meaning | Example cause |
|------|---------|---------------|
| `23505` | Unique violation | Duplicate tag name for same user |
| `23503` | Foreign key violation | Referencing a category that doesn't exist |
| `23514` | Check violation | Priority outside 0–3 range |
| `42501` | Permission denied | RLS policy blocks the operation |

---

## Full example: Server Component

```typescript
// app/dashboard/page.tsx (Server Component)
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: todos, error } = await supabase
    .from('todos')
    .select('id, title, priority, completed')
    .is('deleted_at', null)
    .order('priority', { ascending: false })

  if (error) {
    return <p>Error loading todos: {error.message}</p>
  }

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          {todo.completed ? '✓' : '○'} {todo.title} (P{todo.priority})
        </li>
      ))}
    </ul>
  )
}
```

## Full example: Client Component

```typescript
// components/add-todo-form.tsx
'use client'
import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'

export function AddTodoForm() {
  const supabase = createClient()
  const [title, setTitle] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await supabase
      .from('todos')
      .insert({ title, user_id: 'aaaaaaaa-0000-0000-0000-000000000001' })

    if (error) {
      alert('Failed: ' + error.message)
      return
    }

    setTitle('')
    // Refresh the page or update state
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  )
}
```

> In Chapter 04 (Auth), you'll replace the hardcoded `user_id` with `auth.uid()` from the logged-in user.

---

## Quick reference

| Operation | Client method | SQL equivalent |
|-----------|--------------|----------------|
| Read | `.from('table').select('cols')` | `SELECT cols FROM table` |
| Read one | `.select('*').eq('id', x).single()` | `SELECT * FROM table WHERE id = x` |
| Create | `.from('table').insert({...}).select()` | `INSERT INTO table (...) RETURNING *` |
| Create many | `.insert([{...}, {...}]).select()` | `INSERT INTO table VALUES (...), (...)` |
| Update | `.update({...}).eq('id', x).select()` | `UPDATE table SET ... WHERE id = x` |
| Delete | `.delete().eq('id', x)` | `DELETE FROM table WHERE id = x` |
| Upsert | `.upsert({...}).select()` | `INSERT ... ON CONFLICT DO UPDATE` |

---

## Next

You now know how to do basic CRUD. The next section covers **filtering and querying** — how to add WHERE clauses, sorting, pagination, and more.
