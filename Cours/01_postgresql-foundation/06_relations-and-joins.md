# Relations & Joins

## Goal

Master table relationships and JOIN queries. These are the foundation of multi-table apps like your todos project.

---

## Setup

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (name, user_id)
);

CREATE TABLE todo_tags (
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
);

-- Insert test data
INSERT INTO users (id, name, email) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'Alice', 'alice@example.com'),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'Bob', 'bob@example.com');

INSERT INTO categories (name, color, user_id) VALUES
    ('Work', '#EF4444', 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('Personal', '#3B82F6', 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('Learning', '#10B981', 'aaaaaaaa-0000-0000-0000-000000000002');

INSERT INTO todos (title, priority, category_id, user_id) VALUES
    ('Write report', 3,
        (SELECT id FROM categories WHERE name = 'Work'), 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('Buy groceries', 1, NULL, 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('Learn Supabase', 2,
        (SELECT id FROM categories WHERE name = 'Learning'), 'aaaaaaaa-0000-0000-0000-000000000002'),
    ('Fix bug', 3,
        (SELECT id FROM categories WHERE name = 'Work'), 'aaaaaaaa-0000-0000-0000-000000000001');

INSERT INTO tags (name, color, user_id) VALUES
    ('urgent', '#EF4444', 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('quick-win', '#10B981', 'aaaaaaaa-0000-0000-0000-000000000001'),
    ('blocked', '#F59E0B', 'aaaaaaaa-0000-0000-0000-000000000002');

INSERT INTO todo_tags (todo_id, tag_id)
SELECT t.id, tg.id FROM todos t, tags tg
WHERE t.title = 'Write report' AND tg.name = 'urgent';

INSERT INTO todo_tags (todo_id, tag_id)
SELECT t.id, tg.id FROM todos t, tags tg
WHERE t.title = 'Fix bug' AND tg.name = 'urgent';

INSERT INTO todo_tags (todo_id, tag_id)
SELECT t.id, tg.id FROM todos t, tags tg
WHERE t.title = 'Fix bug' AND tg.name = 'quick-win';
```

---

## 1. Relationship Types

### One-to-Many (1:N)

One parent row has many child rows. The most common relationship.

```
users  ──1:N──►  todos       (one user has many todos)
users  ──1:N──►  categories  (one user has many categories)
categories ──1:N──► todos    (one category has many todos)
```

Implemented with a **foreign key on the child table**:

```sql
-- The FK is on todos (the "many" side)
category_id UUID REFERENCES categories(id) ON DELETE SET NULL
```

### Many-to-Many (M:N)

Both sides can have many of the other. Requires a **junction table**.

```
todos  ──M:N──►  tags   (a todo has many tags, a tag is on many todos)
```

Implemented with a **junction table** that has two foreign keys:

```sql
CREATE TABLE todo_tags (
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)   -- prevents duplicates
);
```

### One-to-One (1:1)

Rare. One row in table A corresponds to exactly one row in table B. Implemented with a FK + UNIQUE constraint:

```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'light',
    language TEXT NOT NULL DEFAULT 'en'
);
-- Using user_id as both PK and FK guarantees 1:1
```

---

## 2. JOIN Types

JOINs combine rows from two or more tables based on a related column.

### Visual overview

Given tables A and B:

```
INNER JOIN       → only matching rows from both
LEFT JOIN        → all from A + matching from B (NULL if no match)
RIGHT JOIN       → all from B + matching from A (NULL if no match)
FULL OUTER JOIN  → all from both (NULL where no match)
CROSS JOIN       → every row in A × every row in B (cartesian product)
```

---

### INNER JOIN

Returns only rows that have a match in **both** tables.

```sql
-- Todos with their category name (only todos that HAVE a category)
SELECT t.title, t.priority, c.name AS category
FROM todos t
INNER JOIN categories c ON t.category_id = c.id;
```

Result — "Buy groceries" is excluded because it has no category (`NULL`):

```
     title      | priority | category
----------------+----------+----------
 Write report   |        3 | Work
 Learn Supabase |        2 | Learning
 Fix bug        |        3 | Work
```

> **`INNER JOIN`** is the default. Writing `JOIN` without a prefix means `INNER JOIN`.

---

### LEFT JOIN (LEFT OUTER JOIN)

Returns **all rows from the left table** + matching rows from the right. If no match, right columns are `NULL`.

```sql
-- All todos, with category name if they have one
SELECT t.title, t.priority, c.name AS category
FROM todos t
LEFT JOIN categories c ON t.category_id = c.id;
```

Result — "Buy groceries" appears with `NULL` category:

```
     title      | priority | category
----------------+----------+----------
 Write report   |        3 | Work
 Buy groceries  |        1 | (null)
 Learn Supabase |        2 | Learning
 Fix bug        |        3 | Work
```

> **`LEFT JOIN` is the most common JOIN in practice.** You almost always want to keep all rows from the main table even if related data is missing.

---

### RIGHT JOIN

Returns **all rows from the right table** + matching rows from the left. Rarely used — just swap the table order and use LEFT JOIN instead.

```sql
-- All categories, with their todos (if any)
SELECT c.name AS category, t.title
FROM todos t
RIGHT JOIN categories c ON t.category_id = c.id;
```

Result — "Personal" appears with `NULL` because no todos are linked to it:

```
 category |     title
----------+----------------
 Work     | Write report
 Work     | Fix bug
 Learning | Learn Supabase
 Personal | (null)
```

---

### FULL OUTER JOIN

Returns **all rows from both tables**. NULLs where there's no match on either side.

```sql
SELECT t.title, c.name AS category
FROM todos t
FULL OUTER JOIN categories c ON t.category_id = c.id;
```

Result — shows unmatched rows from both sides:

```
     title      | category
----------------+----------
 Write report   | Work
 Fix bug        | Work
 Learn Supabase | Learning
 Buy groceries  | (null)       ← todo with no category
 (null)         | Personal     ← category with no todos
```

---

### CROSS JOIN

Every row in A paired with every row in B. Rarely needed but useful for generating combinations.

```sql
-- Every user × every category (cartesian product)
SELECT u.name, c.name AS category
FROM users u
CROSS JOIN categories c;
-- 2 users × 3 categories = 6 rows
```

---

## 3. Joining Multiple Tables

You can chain JOINs to combine many tables.

```sql
-- Todos with category name and user name
SELECT
    t.title,
    t.priority,
    c.name AS category,
    u.name AS user_name
FROM todos t
LEFT JOIN categories c ON t.category_id = c.id
INNER JOIN users u ON t.user_id = u.id
ORDER BY t.priority DESC;
```

---

## 4. Many-to-Many Joins

To query across a junction table, you JOIN through it:

```sql
-- Todos with their tags
SELECT t.title, tg.name AS tag, tg.color AS tag_color
FROM todos t
INNER JOIN todo_tags tt ON t.id = tt.todo_id
INNER JOIN tags tg ON tt.tag_id = tg.id;
```

Result:

```
    title     |   tag     | tag_color
--------------+-----------+-----------
 Write report | urgent    | #EF4444
 Fix bug      | urgent    | #EF4444
 Fix bug      | quick-win | #10B981
```

### Aggregate tags per todo

```sql
-- Each todo with all its tags as a comma-separated list
SELECT t.title, string_agg(tg.name, ', ') AS tags
FROM todos t
LEFT JOIN todo_tags tt ON t.id = tt.todo_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
GROUP BY t.id, t.title;
```

Result:

```
     title      |      tags
----------------+-----------------
 Write report   | urgent
 Fix bug        | urgent, quick-win
 Buy groceries  | (null)
 Learn Supabase | (null)
```

### Aggregate tags as a JSON array

```sql
-- Tags as JSON array (this is what Supabase PostgREST returns)
SELECT
    t.title,
    COALESCE(
        json_agg(json_build_object('name', tg.name, 'color', tg.color))
        FILTER (WHERE tg.id IS NOT NULL),
        '[]'
    ) AS tags
FROM todos t
LEFT JOIN todo_tags tt ON t.id = tt.todo_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
GROUP BY t.id, t.title;
```

Result:

```
     title      |                        tags
----------------+-----------------------------------------------------
 Write report   | [{"name":"urgent","color":"#EF4444"}]
 Fix bug        | [{"name":"urgent","color":"#EF4444"},{"name":"quick-win","color":"#10B981"}]
 Buy groceries  | []
 Learn Supabase | []
```

> **`FILTER (WHERE ...)`** is PostgreSQL-specific. It filters rows before passing them to the aggregate function. Without it, `json_agg` would produce `[null]` instead of `[]` for todos with no tags.

---

## 5. Subqueries vs JOINs

### Subquery in WHERE

```sql
-- Todos from categories that belong to Alice
SELECT * FROM todos
WHERE category_id IN (
    SELECT id FROM categories
    WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
);
```

### EXISTS — check if related rows exist

```sql
-- Todos that have at least one tag
SELECT * FROM todos t
WHERE EXISTS (
    SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id
);

-- Todos that have NO tags
SELECT * FROM todos t
WHERE NOT EXISTS (
    SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id
);
```

> **`EXISTS` is often faster than `IN` for large datasets** because it stops as soon as it finds one match.

### When to use which

| Use | When |
|-----|------|
| `JOIN` | You need columns from both tables in the result |
| `IN (subquery)` | You're filtering by a list of values from another table |
| `EXISTS` | You only need to check if related rows exist (yes/no) |

---

## 6. Self-Join

A table joined to itself. Useful for hierarchical data.

```sql
-- Example: tasks with subtasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE
);

INSERT INTO tasks (id, title, parent_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000010', 'Project', NULL),
    ('aaaaaaaa-0000-0000-0000-000000000011', 'Design', 'aaaaaaaa-0000-0000-0000-000000000010'),
    ('aaaaaaaa-0000-0000-0000-000000000012', 'Implement', 'aaaaaaaa-0000-0000-0000-000000000010');

-- Get tasks with their parent title
SELECT child.title, parent.title AS parent
FROM tasks child
LEFT JOIN tasks parent ON child.parent_id = parent.id;

DROP TABLE tasks;
```

---

## 7. Useful Aggregate Functions

| Function | Description | Example |
|----------|-------------|---------|
| `COUNT(*)` | Number of rows | `COUNT(*)` |
| `COUNT(col)` | Non-null values | `COUNT(due_date)` |
| `SUM(col)` | Total | `SUM(priority)` |
| `AVG(col)` | Average | `AVG(priority)` |
| `MIN(col)` / `MAX(col)` | Min / Max | `MAX(created_at)` |
| `string_agg(col, sep)` | Concatenate strings | `string_agg(name, ', ')` |
| `array_agg(col)` | Collect into array | `array_agg(name)` |
| `json_agg(expr)` | Collect into JSON array | `json_agg(name)` |
| `json_build_object(...)` | Build JSON object | `json_build_object('k', v)` |
| `bool_and(col)` | All true? | `bool_and(completed)` |
| `bool_or(col)` | Any true? | `bool_or(completed)` |

---

## Practice

```sql
-- Using the tables from the Setup section

-- 1. LEFT JOIN: all todos with their category name (NULL if none)
SELECT t.title, c.name AS category
FROM todos t
LEFT JOIN categories c ON t.category_id = c.id;

-- 2. Find all categories that have NO todos
SELECT c.name
FROM categories c
LEFT JOIN todos t ON c.id = t.category_id
WHERE t.id IS NULL;

-- 3. Many-to-many: all todos with their tags as comma-separated
SELECT t.title, string_agg(tg.name, ', ') AS tags
FROM todos t
LEFT JOIN todo_tags tt ON t.id = tt.todo_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
GROUP BY t.id, t.title;

-- 4. Full query: todos with user, category, and tags
SELECT
    t.title,
    u.name AS owner,
    c.name AS category,
    string_agg(tg.name, ', ') AS tags
FROM todos t
INNER JOIN users u ON t.user_id = u.id
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN todo_tags tt ON t.id = tt.todo_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
GROUP BY t.id, t.title, u.name, c.name
ORDER BY t.priority DESC;

-- 5. EXISTS: find todos that have the 'urgent' tag
SELECT t.title FROM todos t
WHERE EXISTS (
    SELECT 1 FROM todo_tags tt
    INNER JOIN tags tg ON tt.tag_id = tg.id
    WHERE tt.todo_id = t.id AND tg.name = 'urgent'
);

-- 6. Count todos per user, including users with 0 todos
SELECT u.name, COUNT(t.id) AS todo_count
FROM users u
LEFT JOIN todos t ON u.id = t.user_id
GROUP BY u.id, u.name;

-- Cleanup
DROP TABLE todo_tags;
DROP TABLE tags;
DROP TABLE todos;
DROP TABLE categories;
DROP TABLE users;
```
