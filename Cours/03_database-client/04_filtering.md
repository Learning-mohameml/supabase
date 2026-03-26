# 04 — Filtering & Querying

## How filtering works

Filters are chained after `.select()`. Each filter maps to a SQL `WHERE` clause:

```typescript
supabase.from('todos').select('*').eq('priority', 3).is('deleted_at', null)
//                                  ↓                  ↓
// SQL: SELECT * FROM todos WHERE priority = 3 AND deleted_at IS NULL
```

Filters are combined with **AND** by default. For **OR**, use `.or()`.

---

## Comparison filters

| Method | SQL | Example |
|--------|-----|---------|
| `.eq('col', val)` | `= val` | `.eq('priority', 3)` |
| `.neq('col', val)` | `!= val` | `.neq('completed', true)` |
| `.gt('col', val)` | `> val` | `.gt('priority', 1)` |
| `.gte('col', val)` | `>= val` | `.gte('priority', 2)` |
| `.lt('col', val)` | `< val` | `.lt('priority', 3)` |
| `.lte('col', val)` | `<= val` | `.lte('priority', 2)` |

### Example: high-priority incomplete todos

```typescript
const { data } = await supabase
  .from('todos')
  .select('id, title, priority')
  .gte('priority', 2)
  .eq('completed', false)
  .is('deleted_at', null)
```

---

## Null checks

| Method | SQL |
|--------|-----|
| `.is('col', null)` | `col IS NULL` |
| `.not('col', 'is', null)` | `col IS NOT NULL` |

```typescript
// Active todos (not soft-deleted)
.is('deleted_at', null)

// Todos that have a due date
.not('due_date', 'is', null)
```

> Use `.is()` for null checks, not `.eq()`. In SQL, `col = NULL` doesn't work — you must use `IS NULL`.

---

## Text search

| Method | SQL | Case sensitive? |
|--------|-----|----------------|
| `.like('col', pattern)` | `LIKE` | Yes |
| `.ilike('col', pattern)` | `ILIKE` | No |

```typescript
// Titles containing "report" (case-insensitive)
const { data } = await supabase
  .from('todos')
  .select('*')
  .ilike('title', '%report%')
```

Patterns use `%` as wildcard:
- `'%report%'` — contains "report"
- `'report%'` — starts with "report"
- `'%report'` — ends with "report"

---

## IN filter

Match against a list of values:

```typescript
// Todos in specific categories
const { data } = await supabase
  .from('todos')
  .select('*')
  .in('category_id', [
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000003',
  ])
```

SQL: `WHERE category_id IN ('bbbbbbbb-...', 'bbbbbbbb-...')`

---

## OR conditions

By default, filters are AND. Use `.or()` for OR:

```typescript
// High priority OR completed
const { data } = await supabase
  .from('todos')
  .select('*')
  .or('priority.gte.3, completed.eq.true')
```

SQL: `WHERE (priority >= 3 OR completed = true)`

The syntax inside `.or()` is a comma-separated string using PostgREST filter syntax: `column.operator.value`.

### Combining AND and OR

```typescript
// Active todos that are either high priority or overdue
const { data } = await supabase
  .from('todos')
  .select('*')
  .is('deleted_at', null)
  .or(`priority.gte.3, due_date.lt.${new Date().toISOString()}`)
```

SQL: `WHERE deleted_at IS NULL AND (priority >= 3 OR due_date < '2026-03-24T...')`

---

## Ordering

```typescript
// By priority descending
const { data } = await supabase
  .from('todos')
  .select('*')
  .order('priority', { ascending: false })
```

### Multiple sort columns

```typescript
// Priority descending, then created_at ascending
const { data } = await supabase
  .from('todos')
  .select('*')
  .order('priority', { ascending: false })
  .order('created_at', { ascending: true })
```

### Nulls first/last

```typescript
.order('due_date', { ascending: true, nullsFirst: false })
// Todos with due dates first, nulls at the end
```

---

## Pagination

### Limit

```typescript
// First 10 todos
const { data } = await supabase
  .from('todos')
  .select('*')
  .limit(10)
```

### Range (offset pagination)

```typescript
// Rows 10–19 (page 2, 10 per page)
const { data } = await supabase
  .from('todos')
  .select('*')
  .range(10, 19)
```

`.range(from, to)` is **inclusive** on both ends. So `.range(0, 9)` returns 10 rows.

### Paginated query helper

```typescript
const PAGE_SIZE = 10

async function getTodos(page: number) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('todos')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .range(from, to)

  return { data, error, count }
  // count = total number of matching rows (for "Page X of Y")
}
```

> `{ count: 'exact' }` in `.select()` tells PostgREST to return the total count in the response header. This adds a small overhead but is needed for pagination UI.

---

## Count without fetching data

```typescript
// Just get the count, no rows
const { count, error } = await supabase
  .from('todos')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null)
```

`head: true` skips the actual data — only returns the count. Useful for badges and stats.

---

## JSONB filtering

Your `todos.metadata` column is JSONB. You can filter inside it:

```typescript
// Todos where metadata has a "notes" key
const { data } = await supabase
  .from('todos')
  .select('*')
  .not('metadata->notes', 'is', null)

// Todos where metadata.url contains "supabase"
const { data } = await supabase
  .from('todos')
  .select('*')
  .ilike('metadata->>url', '%supabase%')
```

The arrow operators:
- `->` returns JSON (for nested access)
- `->>` returns text (for comparisons)

---

## Real-world query: dashboard todos

Combining everything for a typical dashboard query:

```typescript
const { data: todos, error, count } = await supabase
  .from('todos')
  .select('id, title, description, priority, completed, due_date, category_id', {
    count: 'exact',
  })
  .is('deleted_at', null)
  .eq('completed', false)
  .order('priority', { ascending: false })
  .order('created_at', { ascending: false })
  .range(0, 19)
```

SQL equivalent:
```sql
SELECT id, title, description, priority, completed, due_date, category_id
FROM todos
WHERE deleted_at IS NULL AND completed = false
ORDER BY priority DESC, created_at DESC
LIMIT 20 OFFSET 0
```

---

## Quick reference

| Filter | Method | Example |
|--------|--------|---------|
| Equals | `.eq()` | `.eq('priority', 3)` |
| Not equals | `.neq()` | `.neq('completed', true)` |
| Greater than | `.gt()` / `.gte()` | `.gte('priority', 2)` |
| Less than | `.lt()` / `.lte()` | `.lt('priority', 3)` |
| Is null | `.is()` | `.is('deleted_at', null)` |
| Not null | `.not('col', 'is', null)` | `.not('due_date', 'is', null)` |
| In list | `.in()` | `.in('id', [a, b, c])` |
| Like | `.like()` / `.ilike()` | `.ilike('title', '%report%')` |
| OR | `.or()` | `.or('priority.gte.3, completed.eq.true')` |
| Order | `.order()` | `.order('priority', { ascending: false })` |
| Limit | `.limit()` | `.limit(10)` |
| Range | `.range()` | `.range(0, 9)` |
| Count | `{ count: 'exact' }` | `.select('*', { count: 'exact' })` |

---

## Next

You can now filter and paginate single tables. The next section covers **relations** — fetching todos with their category and tags in a single query.
