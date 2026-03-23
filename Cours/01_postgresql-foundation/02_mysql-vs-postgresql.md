# MySQL vs PostgreSQL

## Goal

Map your MySQL knowledge to PostgreSQL. Understand the key differences so you stop reaching for MySQL syntax and start thinking in PostgreSQL.

---

## 1. Auto-Increment → GENERATED ALWAYS AS IDENTITY

In MySQL:

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);
```

In PostgreSQL, you have two options:

### Option A — `SERIAL` (legacy, still common)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT
);
```

`SERIAL` is a shortcut that creates an integer column + a sequence behind the scenes. It works but it's the old way.

### Option B — `GENERATED ALWAYS AS IDENTITY` (modern, recommended)

```sql
CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT
);
```

| Feature | `SERIAL` | `GENERATED ALWAYS AS IDENTITY` |
|---------|----------|-------------------------------|
| SQL standard | No (PostgreSQL-specific) | Yes (SQL:2003) |
| Can be overridden on insert | Yes (no protection) | No (unless `OVERRIDING SYSTEM VALUE`) |
| Recommended | Legacy code | New projects |

> **In Supabase**, you'll mostly use `UUID` primary keys instead of auto-increment. But it's important to know both.

---

## 2. Data Types

### Types that differ

| Concept | MySQL | PostgreSQL |
|---------|-------|------------|
| Auto-increment integer | `INT AUTO_INCREMENT` | `INT GENERATED ALWAYS AS IDENTITY` or `SERIAL` |
| Variable-length string | `VARCHAR(255)` | `TEXT` (preferred) or `VARCHAR(n)` |
| Boolean | `TINYINT(1)` (fake boolean) | `BOOLEAN` (true/false/null) |
| JSON | `JSON` (stored as text internally) | `JSON` or `JSONB` (binary, indexable, **use this**) |
| Binary data | `BLOB` | `BYTEA` |
| Date + time + timezone | `DATETIME` (no timezone) | `TIMESTAMPTZ` (timezone-aware, **always use this**) |
| Date + time no timezone | `DATETIME` | `TIMESTAMP` (avoid — use `TIMESTAMPTZ`) |
| UUID | `CHAR(36)` or `BINARY(16)` | `UUID` (native type, 16 bytes) |
| Enum | `ENUM('a', 'b', 'c')` inline | `CREATE TYPE ... AS ENUM (...)` (separate type) |
| Array | Not supported | `TEXT[]`, `INT[]`, etc. (native arrays) |

### TEXT vs VARCHAR in PostgreSQL

In MySQL, you always specify `VARCHAR(255)` because it affects storage. In PostgreSQL:

```sql
-- These three perform identically in PostgreSQL:
name VARCHAR(255)
name VARCHAR
name TEXT
```

PostgreSQL stores all of them the same way. `TEXT` is preferred because:
- No arbitrary length limit to guess
- Same performance as `VARCHAR(n)`
- `VARCHAR(n)` only adds a check constraint — it doesn't save space

> **Rule of thumb:** Use `TEXT` in PostgreSQL. Only use `VARCHAR(n)` if you genuinely need to enforce a maximum length as a business rule.

---

## 3. Boolean

MySQL fakes booleans with `TINYINT(1)`. PostgreSQL has a real `BOOLEAN` type:

```sql
-- PostgreSQL
CREATE TABLE tasks (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false
);

-- Valid boolean values:
INSERT INTO tasks (title, completed) VALUES ('Learn PG', true);
INSERT INTO tasks (title, completed) VALUES ('Learn PG', false);
INSERT INTO tasks (title, completed) VALUES ('Learn PG', 't');
INSERT INTO tasks (title, completed) VALUES ('Learn PG', 'yes');
INSERT INTO tasks (title, completed) VALUES ('Learn PG', '0');  -- false
```

---

## 4. Enums

In MySQL, enums are inline:

```sql
-- MySQL
CREATE TABLE orders (
    status ENUM('pending', 'shipped', 'delivered') NOT NULL
);
```

In PostgreSQL, enums are **separate types**:

```sql
-- PostgreSQL: first create the type
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');

-- Then use it in a table
CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status order_status NOT NULL DEFAULT 'pending'
);
```

### Adding a value to an existing enum

```sql
-- Add a new value (can specify position)
ALTER TYPE order_status ADD VALUE 'cancelled' AFTER 'delivered';
```

> **Warning:** You cannot remove or rename enum values easily in PostgreSQL. Think carefully before creating an enum. For values that change often, consider a `TEXT` column with a `CHECK` constraint instead.

---

## 5. JSONB

MySQL has `JSON` but it's stored as text and has limited indexing. PostgreSQL has `JSONB` — binary JSON that you can index, query, and manipulate natively:

```sql
CREATE TABLE events (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO events (data) VALUES ('{"type": "click", "page": "/home", "count": 42}');

-- Query inside JSON
SELECT data->>'type' AS event_type FROM events;           -- 'click' (as text)
SELECT data->'count' AS count FROM events;                -- 42 (as jsonb)

-- Filter by JSON field
SELECT * FROM events WHERE data->>'type' = 'click';

-- Check if a key exists
SELECT * FROM events WHERE data ? 'page';

-- Contains operator
SELECT * FROM events WHERE data @> '{"type": "click"}';
```

### JSON operators cheat sheet

| Operator | Returns | Example | Result |
|----------|---------|---------|--------|
| `->` | jsonb | `data->'count'` | `42` (as jsonb) |
| `->>` | text | `data->>'type'` | `click` (as text) |
| `#>` | jsonb (nested path) | `data#>'{a,b}'` | nested value |
| `#>>` | text (nested path) | `data#>>'{a,b}'` | nested value as text |
| `?` | boolean (key exists) | `data ? 'type'` | `true` |
| `@>` | boolean (contains) | `data @> '{"type":"click"}'` | `true` |
| `\|\|` | jsonb (merge) | `data \|\| '{"new": 1}'` | merged object |
| `-` | jsonb (remove key) | `data - 'page'` | object without `page` |

> **Supabase** uses `JSONB` heavily. The `metadata` column in your todos app will be `JSONB`.

---

## 6. Arrays

PostgreSQL has native arrays — MySQL doesn't:

```sql
CREATE TABLE posts (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'
);

INSERT INTO posts (title, tags) VALUES ('Learn PG', ARRAY['postgresql', 'database']);
INSERT INTO posts (title, tags) VALUES ('Learn SQL', '{sql, beginner}');  -- alternative syntax

-- Query
SELECT * FROM posts WHERE 'postgresql' = ANY(tags);       -- contains value
SELECT * FROM posts WHERE tags @> ARRAY['sql'];           -- contains array
SELECT array_length(tags, 1) FROM posts;                  -- array length
SELECT unnest(tags) FROM posts;                           -- expand to rows
```

> **When to use arrays vs junction tables:** Arrays are fine for simple, non-relational lists (tags as strings, roles). Use junction tables when the items are entities with their own columns (like your `todo_tags` table).

---

## 7. Quoting & Case Sensitivity

| Concept | MySQL | PostgreSQL |
|---------|-------|------------|
| String literals | `'text'` or `"text"` | `'text'` only |
| Identifiers | `` `backticks` `` | `"double quotes"` |
| Unquoted identifiers | Case-preserving | **Folded to lowercase** |
| Default collation | Depends on config | `C` or `en_US.UTF-8` |

```sql
-- These are the SAME table in PostgreSQL:
SELECT * FROM Users;
SELECT * FROM users;
SELECT * FROM USERS;

-- This is DIFFERENT (preserves case because of quotes):
SELECT * FROM "Users";  -- different from users!
```

**Best practice:** Always use `snake_case`, never quote identifiers.

---

## 8. Other Differences

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| `LIMIT` with offset | `LIMIT 10 OFFSET 5` or `LIMIT 5, 10` | `LIMIT 10 OFFSET 5` only (no comma syntax) |
| `UPSERT` | `INSERT ... ON DUPLICATE KEY UPDATE` | `INSERT ... ON CONFLICT DO UPDATE` |
| `TRUNCATE` + auto-increment reset | `TRUNCATE TABLE t` (auto-resets) | `TRUNCATE TABLE t RESTART IDENTITY` |
| String concatenation | `CONCAT(a, b)` | `a || b` (operator) or `CONCAT(a, b)` |
| `IF EXISTS` on drop | `DROP TABLE IF EXISTS t` | Same: `DROP TABLE IF EXISTS t` |
| Current timestamp | `NOW()` or `CURRENT_TIMESTAMP` | `NOW()` or `CURRENT_TIMESTAMP` (same) |
| `GROUP BY` strictness | Loose (allows non-aggregated columns) | **Strict** — every non-aggregated column must be in `GROUP BY` |
| Schemas | Not supported (database = namespace) | Supported — `public` is default, you can create more |
| Transactions DDL | DDL auto-commits | DDL is **transactional** (you can rollback a `CREATE TABLE`!) |

### Transactional DDL — a big deal

In MySQL, `CREATE TABLE` auto-commits. In PostgreSQL:

```sql
BEGIN;
CREATE TABLE test (id INT);
INSERT INTO test VALUES (1);
-- Oops, wrong schema
ROLLBACK;  -- everything is undone, including the CREATE TABLE!
```

This is extremely useful for migrations — if a migration fails halfway, the entire thing rolls back.

---

## Practice

Connect to your `learn` database and try:

1. Create a table with `GENERATED ALWAYS AS IDENTITY`, `TEXT`, `BOOLEAN`, and `TIMESTAMPTZ` columns
2. Create a custom enum type and use it in a table
3. Create a table with a `JSONB` column, insert a row, and query a field with `->>`
4. Create a table with a `TEXT[]` array column, insert data with `ARRAY[...]`, and query with `ANY()`
5. Try `BEGIN; CREATE TABLE x(id INT); ROLLBACK;` — then verify the table doesn't exist with `\dt`

```sql
-- Cleanup when done
DROP TABLE IF EXISTS test;
DROP TYPE IF EXISTS order_status;
```

Once you're comfortable with these differences, you're ready for the next section where we dive deeper into PostgreSQL types.
