# CRUD Operations

## Goal

Master INSERT, SELECT, UPDATE, and DELETE in PostgreSQL. Learn PostgreSQL-specific features like `RETURNING`, `UPSERT`, and advanced filtering.

---

## Setup

Run this first to have tables to work with:

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    due_date TIMESTAMPTZ,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO categories (name, color) VALUES
    ('Work', '#EF4444'),
    ('Personal', '#3B82F6'),
    ('Learning', '#10B981');
```

---

## 1. INSERT

### Single row

```sql
INSERT INTO todos (title, priority)
VALUES ('Learn PostgreSQL', 2);
```

Columns with `DEFAULT` are filled automatically (`id`, `completed`, `metadata`, `created_at`, `updated_at`).

### Multiple rows

```sql
INSERT INTO todos (title, priority, description) VALUES
    ('Write migrations', 3, 'Schema for todos app'),
    ('Setup CI/CD', 1, NULL),
    ('Review PR', 2, 'Check security policies');
```

### INSERT with a subquery

```sql
-- Get a category id dynamically
INSERT INTO todos (title, category_id)
VALUES (
    'Read Supabase docs',
    (SELECT id FROM categories WHERE name = 'Learning')
);
```

### RETURNING

**PostgreSQL-specific.** Returns the inserted row(s) — no need for a separate SELECT.

```sql
-- Return the full inserted row
INSERT INTO todos (title, priority)
VALUES ('Deploy app', 3)
RETURNING *;

-- Return only specific columns
INSERT INTO todos (title)
VALUES ('Buy groceries')
RETURNING id, title, created_at;
```

> **This is huge.** In MySQL, you'd do `INSERT` then `SELECT LAST_INSERT_ID()`. In PostgreSQL, `RETURNING` gives you everything in one query. Supabase's `.insert().select()` uses this under the hood.

---

## 2. SELECT

### Basics

```sql
-- All columns, all rows
SELECT * FROM todos;

-- Specific columns
SELECT title, priority, completed FROM todos;

-- With alias
SELECT title, priority AS p, completed AS done FROM todos;
```

### WHERE — Filtering

```sql
-- Comparison
SELECT * FROM todos WHERE priority >= 2;
SELECT * FROM todos WHERE completed = false;
SELECT * FROM todos WHERE due_date IS NULL;
SELECT * FROM todos WHERE due_date IS NOT NULL;

-- Text matching
SELECT * FROM todos WHERE title = 'Learn PostgreSQL';              -- exact
SELECT * FROM todos WHERE title LIKE 'Learn%';                     -- starts with
SELECT * FROM todos WHERE title ILIKE '%postgresql%';              -- case-insensitive contains
SELECT * FROM todos WHERE title ~ '^Learn';                        -- regex

-- IN list
SELECT * FROM todos WHERE priority IN (2, 3);

-- BETWEEN
SELECT * FROM todos WHERE priority BETWEEN 1 AND 3;

-- AND / OR
SELECT * FROM todos WHERE priority >= 2 AND completed = false;
SELECT * FROM todos WHERE priority = 3 OR due_date < now();

-- NOT
SELECT * FROM todos WHERE NOT completed;
```

> **`ILIKE`** is PostgreSQL-specific — case-insensitive LIKE. MySQL's `LIKE` is case-insensitive by default (depending on collation). In PostgreSQL, `LIKE` is always case-sensitive.

### ORDER BY

```sql
-- Ascending (default)
SELECT * FROM todos ORDER BY priority;

-- Descending
SELECT * FROM todos ORDER BY priority DESC;

-- Multiple columns
SELECT * FROM todos ORDER BY priority DESC, created_at ASC;

-- NULLs positioning
SELECT * FROM todos ORDER BY due_date ASC NULLS LAST;
SELECT * FROM todos ORDER BY due_date DESC NULLS FIRST;
```

> **`NULLS FIRST` / `NULLS LAST`** — PostgreSQL-specific. MySQL doesn't have this. By default, NULLs sort as if they're the largest value.

### LIMIT & OFFSET

```sql
-- First 10 rows
SELECT * FROM todos ORDER BY created_at DESC LIMIT 10;

-- Pagination: page 2 (rows 11-20)
SELECT * FROM todos ORDER BY created_at DESC LIMIT 10 OFFSET 10;
```

> **Always use `ORDER BY` with `LIMIT`.** Without it, the order is undefined — you might get different results each time.

### DISTINCT

```sql
-- Unique priorities
SELECT DISTINCT priority FROM todos;

-- Unique combinations
SELECT DISTINCT priority, completed FROM todos;

-- DISTINCT ON (PostgreSQL-specific) — first row per group
SELECT DISTINCT ON (priority) priority, title, created_at
FROM todos
ORDER BY priority, created_at DESC;
-- Returns one todo per priority level (the most recent one)
```

> **`DISTINCT ON`** is very powerful and PostgreSQL-specific. It's like a `GROUP BY` but you get a full row, not just aggregated values.

---

## 3. Aggregations

### Aggregate functions

```sql
SELECT COUNT(*) FROM todos;                                -- total rows
SELECT COUNT(*) FROM todos WHERE completed = true;         -- completed count
SELECT COUNT(due_date) FROM todos;                         -- non-null due_dates only

SELECT MAX(priority) FROM todos;
SELECT MIN(created_at) FROM todos;
SELECT AVG(priority) FROM todos;                           -- returns numeric
SELECT SUM(priority) FROM todos;
```

### GROUP BY

```sql
-- Count todos per priority
SELECT priority, COUNT(*) AS count
FROM todos
GROUP BY priority
ORDER BY priority;

-- Count per completion status
SELECT completed, COUNT(*) AS count
FROM todos
GROUP BY completed;
```

> **PostgreSQL is strict:** every column in `SELECT` must be in `GROUP BY` or inside an aggregate function. MySQL is loose about this — PostgreSQL won't let it slide.

### HAVING — filter after aggregation

```sql
-- Only show priorities with more than 2 todos
SELECT priority, COUNT(*) AS count
FROM todos
GROUP BY priority
HAVING COUNT(*) > 2;
```

| Clause | Filters | When |
|--------|---------|------|
| `WHERE` | Individual rows | Before grouping |
| `HAVING` | Groups | After grouping |

---

## 4. UPDATE

### Basic update

```sql
-- Update a single row
UPDATE todos SET completed = true WHERE title = 'Learn PostgreSQL';

-- Update multiple columns
UPDATE todos
SET priority = 3, description = 'Urgent!'
WHERE title = 'Deploy app';
```

### UPDATE with RETURNING

```sql
UPDATE todos
SET completed = true
WHERE priority = 3
RETURNING id, title, completed;
```

### UPDATE with a subquery

```sql
-- Assign all unlinked todos to the 'Personal' category
UPDATE todos
SET category_id = (SELECT id FROM categories WHERE name = 'Personal')
WHERE category_id IS NULL;
```

### UPDATE from another table

```sql
-- PostgreSQL-specific: UPDATE ... FROM
UPDATE todos
SET category_id = c.id
FROM categories c
WHERE c.name = 'Work' AND todos.priority = 3;
```

> **`UPDATE ... FROM`** is PostgreSQL-specific. It lets you join another table in an UPDATE. MySQL uses `UPDATE ... JOIN` instead.

### Conditional update with CASE

```sql
UPDATE todos
SET priority = CASE
    WHEN due_date < now() THEN 3                 -- overdue → high
    WHEN due_date < now() + INTERVAL '1 day' THEN 2  -- due soon → medium
    ELSE priority                                 -- keep current
END
WHERE completed = false;
```

---

## 5. DELETE

### Basic delete

```sql
-- Delete specific rows
DELETE FROM todos WHERE completed = true;

-- Delete a single row
DELETE FROM todos WHERE id = 'some-uuid-here';
```

### DELETE with RETURNING

```sql
-- Delete and return what was deleted
DELETE FROM todos
WHERE completed = true
RETURNING id, title;
```

### Delete all rows

```sql
-- Delete all rows (slow — logs each row)
DELETE FROM todos;

-- Truncate (fast — doesn't log individual rows)
TRUNCATE TABLE todos;

-- Truncate and reset identity sequences
TRUNCATE TABLE todos RESTART IDENTITY;

-- Truncate with cascade (also truncates tables with foreign keys to this one)
TRUNCATE TABLE categories CASCADE;
```

| Method | Speed | Logs rows | Triggers | Can WHERE |
|--------|-------|-----------|----------|-----------|
| `DELETE` | Slow | Yes | Yes | Yes |
| `TRUNCATE` | Fast | No | No | No |

---

## 6. UPSERT (INSERT ... ON CONFLICT)

Insert a row, but if it conflicts with a UNIQUE or PRIMARY KEY constraint, update it instead.

### MySQL vs PostgreSQL

```sql
-- MySQL
INSERT INTO tags (name, user_id) VALUES ('urgent', '...')
ON DUPLICATE KEY UPDATE name = 'urgent';

-- PostgreSQL
INSERT INTO categories (name, color) VALUES ('Work', '#FF0000')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;
```

### Syntax

```sql
INSERT INTO table (columns...)
VALUES (values...)
ON CONFLICT (conflict_column) DO UPDATE SET column = EXCLUDED.column;
```

`EXCLUDED` refers to the row that **would have been inserted** (the values you provided).

### Examples

```sql
-- Upsert: insert or update color if name exists
INSERT INTO categories (name, color)
VALUES ('Work', '#FF0000')
ON CONFLICT (name) DO UPDATE
SET color = EXCLUDED.color
RETURNING *;

-- Upsert with multiple columns in conflict
INSERT INTO tags (name, user_id, color)
VALUES ('urgent', 'some-uuid', '#EF4444')
ON CONFLICT (name, user_id) DO UPDATE
SET color = EXCLUDED.color;

-- Insert or do nothing (ignore duplicates)
INSERT INTO categories (name, color)
VALUES ('Work', '#EF4444')
ON CONFLICT (name) DO NOTHING;
```

> **`ON CONFLICT` requires a UNIQUE constraint** on the conflict column(s). It won't work without one.

### UPSERT with RETURNING

```sql
-- Know whether it was an insert or update
INSERT INTO categories (name, color)
VALUES ('Work', '#FF0000')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
RETURNING *, (xmax = 0) AS was_inserted;
-- xmax = 0 means it was freshly inserted
-- xmax != 0 means it was updated
```

---

## 7. Query Execution Order

Understanding this helps you debug queries:

```
1. FROM / JOIN         ← which tables
2. WHERE               ← filter rows
3. GROUP BY            ← group rows
4. HAVING              ← filter groups
5. SELECT              ← pick columns, compute expressions
6. DISTINCT            ← remove duplicates
7. ORDER BY            ← sort
8. LIMIT / OFFSET      ← paginate
```

This is why you can't use a column alias from `SELECT` in a `WHERE` clause — `WHERE` runs before `SELECT`:

```sql
-- This FAILS
SELECT title, priority AS p FROM todos WHERE p >= 2;

-- This works (use the original column name)
SELECT title, priority AS p FROM todos WHERE priority >= 2;

-- But ORDER BY CAN use aliases (it runs after SELECT)
SELECT title, priority AS p FROM todos ORDER BY p DESC;
```

---

## Practice

```sql
-- Using the tables from the Setup section above

-- 1. Insert 3 todos with different priorities, return their id and title
INSERT INTO todos (title, priority) VALUES
    ('Task A', 1),
    ('Task B', 2),
    ('Task C', 3)
RETURNING id, title;

-- 2. Select uncompleted todos ordered by priority DESC, NULLS LAST on due_date
SELECT title, priority, due_date
FROM todos
WHERE completed = false
ORDER BY priority DESC, due_date ASC NULLS LAST;

-- 3. Count todos per priority level, only show priorities with > 1 todo
SELECT priority, COUNT(*) AS count
FROM todos
GROUP BY priority
HAVING COUNT(*) > 1
ORDER BY priority;

-- 4. Use DISTINCT ON to get the most recent todo per priority
SELECT DISTINCT ON (priority) priority, title, created_at
FROM todos
ORDER BY priority, created_at DESC;

-- 5. Update all priority 3 todos: set completed = true, return them
UPDATE todos SET completed = true WHERE priority = 3 RETURNING *;

-- 6. Delete completed todos and return what was deleted
DELETE FROM todos WHERE completed = true RETURNING id, title;

-- 7. Upsert: insert a category 'Work' with a new color, or update if exists
INSERT INTO categories (name, color)
VALUES ('Work', '#DC2626')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
RETURNING *;

-- Cleanup
DROP TABLE todos;
DROP TABLE categories;
```
