# Schemas & Tables

## Goal

Understand how PostgreSQL organizes data with schemas, and master `CREATE TABLE` with all constraint types.

---

## 1. Schemas

### What is a schema?

A schema is a **namespace** inside a database. It groups tables, views, functions, and types together. Think of it like a folder for database objects.

```
Database: learn
├── Schema: public        ← default, where your tables go
│   ├── users
│   ├── todos
│   └── categories
├── Schema: auth          ← Supabase puts auth tables here
│   ├── users
│   └── sessions
└── Schema: storage       ← Supabase puts storage tables here
    └── objects
```

> **MySQL doesn't have schemas.** In MySQL, "database" and "schema" are synonyms. In PostgreSQL, a database contains multiple schemas, and each schema contains tables.

### The `public` schema

Every PostgreSQL database comes with a `public` schema. When you write `SELECT * FROM users`, PostgreSQL actually runs `SELECT * FROM public.users`.

```sql
-- These are the same
SELECT * FROM users;
SELECT * FROM public.users;
```

### The search_path

PostgreSQL uses `search_path` to decide which schemas to look in when you don't specify one:

```sql
-- See current search_path
SHOW search_path;
-- Result: "$user", public

-- This means PostgreSQL looks in:
-- 1. A schema named after the current user (if it exists)
-- 2. The public schema
```

### Creating and using schemas

```sql
-- Create a schema
CREATE SCHEMA app;

-- Create a table in a specific schema
CREATE TABLE app.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Query with schema prefix
SELECT * FROM app.settings;

-- List all schemas
\dn

-- List tables in a specific schema
\dt app.*

-- Drop a schema (must be empty)
DROP SCHEMA app;

-- Drop a schema and everything inside it
DROP SCHEMA app CASCADE;
```

### When to use schemas

| Use case | Schema |
|----------|--------|
| Your app tables | `public` (default) |
| Internal/admin tables | Custom schema (e.g., `internal`) |
| Multi-tenant apps | One schema per tenant |
| Supabase auth | `auth` (managed by Supabase) |
| Supabase storage | `storage` (managed by Supabase) |

> **For your todos app**, everything goes in `public`. You'll interact with Supabase's `auth` schema (e.g., `auth.users`) but never modify it directly.

---

## 2. CREATE TABLE

### Basic syntax

```sql
CREATE TABLE table_name (
    column_name TYPE [CONSTRAINTS],
    column_name TYPE [CONSTRAINTS],
    ...
    [TABLE CONSTRAINTS]
);
```

### Full example

```sql
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Constraints

Constraints enforce rules on your data. PostgreSQL checks them on every INSERT and UPDATE.

### NOT NULL

Column must have a value — no `NULL` allowed.

```sql
title TEXT NOT NULL          -- required
description TEXT             -- nullable (NULL allowed by default)
```

### DEFAULT

Value to use when the column is not specified in an INSERT.

```sql
completed BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

> **`NOT NULL DEFAULT`** is a common pattern. It means: the column always has a value — either you provide one, or the default kicks in.

### PRIMARY KEY

Uniquely identifies each row. Implies `NOT NULL` + `UNIQUE`.

```sql
-- Single column
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Composite primary key (table-level constraint)
CREATE TABLE todo_tags (
    todo_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (todo_id, tag_id)
);
```

### UNIQUE

No duplicate values allowed in this column (or combination of columns).

```sql
-- Single column
email TEXT UNIQUE NOT NULL

-- Multi-column unique (table-level)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL,
    UNIQUE (name, user_id)   -- same tag name OK for different users
);
```

> `UNIQUE` allows multiple `NULL` values (NULL ≠ NULL in SQL). If you want uniqueness including nulls, add `NOT NULL`.

### CHECK

Custom validation rule using a boolean expression.

```sql
-- Single column check
priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),

-- Named check (easier to debug and drop later)
price NUMERIC(10, 2) CONSTRAINT positive_price CHECK (price >= 0),

-- Multi-column check (table-level)
CREATE TABLE events (
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CHECK (end_date >= start_date)
);
```

### FOREIGN KEY

References a row in another table. This is how you create relationships.

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category_id UUID REFERENCES categories(id)    -- short syntax
);
```

#### ON DELETE behavior

What happens to the child row when the parent row is deleted?

| Action | Behavior | Use when |
|--------|----------|----------|
| `RESTRICT` (default) | Block deletion if children exist | You want to prevent accidental data loss |
| `CASCADE` | Delete children too | Parent owns the children (user → user's todos) |
| `SET NULL` | Set FK column to NULL | Relationship is optional (todo → category) |
| `SET DEFAULT` | Set FK column to its default | Rare |
| `NO ACTION` | Like RESTRICT but checked at end of transaction | Advanced use |

```sql
-- User deletion deletes all their todos
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE

-- Category deletion keeps todos, just removes the link
category_id UUID REFERENCES categories(id) ON DELETE SET NULL
```

#### ON UPDATE behavior

Same options as `ON DELETE`, applied when the parent's referenced column is updated. Almost always left as default (`RESTRICT`) because you rarely change primary keys.

---

## 4. ALTER TABLE

Modify an existing table.

### Add a column

```sql
ALTER TABLE todos ADD COLUMN due_date TIMESTAMPTZ;
ALTER TABLE todos ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
```

### Drop a column

```sql
ALTER TABLE todos DROP COLUMN due_date;
```

### Rename a column

```sql
ALTER TABLE todos RENAME COLUMN title TO name;
```

### Change column type

```sql
ALTER TABLE todos ALTER COLUMN priority TYPE SMALLINT;
```

### Add/drop constraints

```sql
-- Add NOT NULL
ALTER TABLE todos ALTER COLUMN title SET NOT NULL;

-- Drop NOT NULL
ALTER TABLE todos ALTER COLUMN title DROP NOT NULL;

-- Add a CHECK constraint
ALTER TABLE todos ADD CONSTRAINT valid_priority CHECK (priority BETWEEN 0 AND 3);

-- Drop a constraint by name
ALTER TABLE todos DROP CONSTRAINT valid_priority;

-- Add a UNIQUE constraint
ALTER TABLE tags ADD CONSTRAINT unique_tag_per_user UNIQUE (name, user_id);

-- Add a foreign key
ALTER TABLE todos ADD CONSTRAINT fk_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
```

### Rename a table

```sql
ALTER TABLE todos RENAME TO tasks;
```

---

## 5. DROP TABLE

```sql
-- Drop if it exists (no error if it doesn't)
DROP TABLE IF EXISTS todos;

-- Drop with dependent objects (foreign keys pointing to it)
DROP TABLE IF EXISTS categories CASCADE;
```

> **`CASCADE` on DROP** removes all objects that depend on the table (foreign keys, views). Use with care.

---

## 6. Temporary Tables

Tables that exist only for your current session. Useful for intermediate calculations.

```sql
CREATE TEMPORARY TABLE temp_results (
    id UUID,
    score INTEGER
);

-- Automatically dropped when the session ends
-- Or drop manually
DROP TABLE temp_results;
```

---

## 7. Table Information

```sql
-- Describe a table (psql)
\d todos
\d+ todos              -- with extra details (size, description)

-- List all constraints on a table
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'todos'::regclass;

-- contype: p = primary key, f = foreign key, u = unique, c = check

-- Table size on disk
SELECT pg_size_pretty(pg_total_relation_size('todos'));
```

---

## 8. Naming Conventions

| Object | Convention | Example |
|--------|-----------|---------|
| Tables | Plural, snake_case | `todos`, `todo_tags` |
| Columns | Singular, snake_case | `user_id`, `created_at` |
| Primary key | `id` | `id UUID PRIMARY KEY` |
| Foreign key column | `referenced_table_singular_id` | `category_id`, `user_id` |
| Constraints | Descriptive name | `valid_priority`, `unique_tag_per_user` |
| Indexes | `idx_table_column` | `idx_todos_user_id` |
| Enums | Singular, snake_case | `priority_level`, `order_status` |

> **Supabase convention:** Tables are plural (`todos`, `categories`). Foreign key columns use `singular_id` pattern (`user_id`, `category_id`).

---

## Practice

```sql
-- 1. Create a schema
CREATE SCHEMA practice;

-- 2. Create a categories table
CREATE TABLE practice.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create a todos table with all constraint types
CREATE TABLE practice.todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    category_id UUID REFERENCES practice.categories(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT title_not_empty CHECK (length(title) > 0)
);

-- 4. Inspect your tables
\dt practice.*
\d practice.todos

-- 5. Try ALTER TABLE
ALTER TABLE practice.todos ADD COLUMN due_date TIMESTAMPTZ;
ALTER TABLE practice.todos ADD CONSTRAINT unique_title UNIQUE (title);

-- 6. Insert data and test constraints
INSERT INTO practice.categories (name, color) VALUES ('Work', '#EF4444');
INSERT INTO practice.todos (title, priority) VALUES ('Learn schemas', 2);
INSERT INTO practice.todos (title, priority) VALUES ('Bad priority', 5);   -- CHECK violation
INSERT INTO practice.todos (title) VALUES ('');                             -- title_not_empty violation

-- 7. Check table size
SELECT pg_size_pretty(pg_total_relation_size('practice.todos'));

-- Cleanup
DROP SCHEMA practice CASCADE;
```
