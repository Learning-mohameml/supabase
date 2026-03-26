# 05 — Relations & Nested Queries

## The problem

Your todos app has related data across multiple tables:

```
todos → categories     (many-to-one via category_id)
todos → tags           (many-to-many via todo_tags)
```

Without nested queries, fetching a todo with its category and tags requires 3 separate queries:

```typescript
// Bad: 3 round-trips to the server
const { data: todo } = await supabase.from('todos').select('*').eq('id', todoId).single()
const { data: category } = await supabase.from('categories').select('*').eq('id', todo.category_id).single()
const { data: tags } = await supabase.from('todo_tags').select('tag_id').eq('todo_id', todoId)
// ... then fetch each tag
```

PostgREST solves this with **embedded resources** — fetch related data in a single query.

---

## How it works

PostgREST reads your **foreign keys** and uses them to join tables automatically. You just name the related table inside `.select()`:

```typescript
// One query, all related data
const { data } = await supabase
  .from('todos')
  .select(`
    id,
    title,
    priority,
    categories (name, color),
    tags (name, color)
  `)
```

PostgREST sees:
- `todos.category_id` → FK to `categories` → embeds the category
- `todo_tags.todo_id` → FK to `todos`, `todo_tags.tag_id` → FK to `tags` → embeds tags via the junction table

---

## Many-to-one: Todo → Category

Each todo belongs to one category (via `category_id` FK):

```typescript
const { data: todos } = await supabase
  .from('todos')
  .select(`
    id,
    title,
    priority,
    completed,
    categories (
      id,
      name,
      color
    )
  `)
  .is('deleted_at', null)
```

Result:

```json
[
  {
    "id": "...",
    "title": "Finish report",
    "priority": 3,
    "completed": false,
    "categories": {
      "id": "bbbbbbbb-...",
      "name": "Work",
      "color": "#EF4444"
    }
  },
  {
    "id": "...",
    "title": "Gym session",
    "priority": 1,
    "completed": false,
    "categories": {
      "id": "bbbbbbbb-...",
      "name": "Personal",
      "color": "#3B82F6"
    }
  }
]
```

The category is embedded as an **object** (not an array) because it's a many-to-one relation — one todo has one category.

> If `category_id` is null, `categories` will be `null` in the result.

---

## One-to-many: Category → Todos

The reverse — get a category with all its todos:

```typescript
const { data: category } = await supabase
  .from('categories')
  .select(`
    id,
    name,
    color,
    todos (
      id,
      title,
      priority,
      completed
    )
  `)
  .eq('id', categoryId)
  .single()
```

Result:

```json
{
  "id": "bbbbbbbb-...",
  "name": "Work",
  "color": "#EF4444",
  "todos": [
    { "id": "...", "title": "Finish report", "priority": 3, "completed": false },
    { "id": "...", "title": "Email client", "priority": 2, "completed": false },
    { "id": "...", "title": "Fix bug", "priority": 3, "completed": false }
  ]
}
```

Here `todos` is an **array** because it's a one-to-many relation — one category has many todos.

---

## Many-to-many: Todo → Tags (via junction table)

Todos and tags are connected through `todo_tags`. PostgREST follows the junction table automatically:

```typescript
const { data: todos } = await supabase
  .from('todos')
  .select(`
    id,
    title,
    tags (
      id,
      name,
      color
    )
  `)
  .is('deleted_at', null)
```

Result:

```json
[
  {
    "id": "...",
    "title": "Finish report",
    "tags": [
      { "id": "cccccccc-...", "name": "urgent", "color": "#3B82F6" },
      { "id": "cccccccc-...", "name": "blocked", "color": "#3B82F6" }
    ]
  },
  {
    "id": "...",
    "title": "Gym session",
    "tags": []
  }
]
```

You never mention `todo_tags` — PostgREST discovers the junction table from the foreign keys and joins through it.

---

## Combining relations: the full query

Fetch todos with **both** category and tags:

```typescript
const { data: todos } = await supabase
  .from('todos')
  .select(`
    id,
    title,
    description,
    priority,
    completed,
    due_date,
    created_at,
    categories (
      id,
      name,
      color
    ),
    tags (
      id,
      name,
      color
    )
  `)
  .is('deleted_at', null)
  .order('priority', { ascending: false })
```

This is the **core query for your dashboard** — one round-trip, all the data you need.

SQL equivalent:

```sql
SELECT
    t.id, t.title, t.description, t.priority, t.completed, t.due_date, t.created_at,
    c.id, c.name, c.color,
    tg.id, tg.name, tg.color
FROM todos t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN todo_tags tt ON t.id = tt.todo_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
WHERE t.deleted_at IS NULL
ORDER BY t.priority DESC
```

But you didn't write a single JOIN — PostgREST figured it out from your foreign keys.

---

## Filtering on related tables

### Filter todos by category name

```typescript
const { data } = await supabase
  .from('todos')
  .select(`
    id,
    title,
    categories!inner (name)
  `)
  .eq('categories.name', 'Work')
```

`!inner` changes the join from LEFT JOIN to INNER JOIN — only returns todos that **have** a matching category.

Without `!inner`, todos with no category would still appear (with `categories: null`).

### Filter todos by tag name

```typescript
const { data } = await supabase
  .from('todos')
  .select(`
    id,
    title,
    tags!inner (name)
  `)
  .eq('tags.name', 'urgent')
```

Returns only todos that have the "urgent" tag.

---

## Counting related items

Get categories with their todo count:

```typescript
const { data } = await supabase
  .from('categories')
  .select(`
    id,
    name,
    color,
    todos (count)
  `)
```

Result:

```json
[
  { "id": "...", "name": "Work", "color": "#EF4444", "todos": [{ "count": 4 }] },
  { "id": "...", "name": "Personal", "color": "#3B82F6", "todos": [{ "count": 3 }] },
  { "id": "...", "name": "Learning", "color": "#10B981", "todos": [{ "count": 3 }] }
]
```

---

## Renaming relations with aliases

If you want cleaner field names:

```typescript
const { data } = await supabase
  .from('todos')
  .select(`
    id,
    title,
    category:categories (name, color),
    tags (name, color)
  `)
```

Now the result uses `category` (singular) instead of `categories`:

```json
{
  "id": "...",
  "title": "Finish report",
  "category": { "name": "Work", "color": "#EF4444" },
  "tags": [...]
}
```

---

## Quick reference

| Relation type | Schema | Select syntax |
|--------------|--------|---------------|
| Many-to-one | `todos.category_id → categories.id` | `categories (name, color)` |
| One-to-many | `categories.id ← todos.category_id` | `todos (title, priority)` |
| Many-to-many | `todos ← todo_tags → tags` | `tags (name, color)` |

| Feature | Syntax |
|---------|--------|
| Embed related data | `table_name (col1, col2)` inside `.select()` |
| Inner join (filter) | `table_name!inner (col1)` |
| Filter on relation | `.eq('table_name.col', value)` |
| Count relation | `table_name (count)` |
| Rename relation | `alias:table_name (col1, col2)` |

---

## Next

Your queries are working, but everything is typed as `any`. The next section covers **TypeScript generation** — generating types from your schema so every query is fully type-safe.
