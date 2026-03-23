# Types & Domains

## Goal

Master PostgreSQL's type system. Know which type to pick for every column and learn how to create your own reusable types with domains.

---

## 1. Type Categories

PostgreSQL has far more built-in types than MySQL. Here are the ones you'll actually use:

### Numeric

| Type | Size | Range | Use when |
|------|------|-------|----------|
| `SMALLINT` | 2 bytes | -32,768 to 32,767 | Counters, small numbers |
| `INTEGER` (`INT`) | 4 bytes | -2.1B to 2.1B | Default choice for integers |
| `BIGINT` | 8 bytes | -9.2×10¹⁸ to 9.2×10¹⁸ | IDs in high-volume tables |
| `NUMERIC(p, s)` | variable | Up to 131,072 digits | Money, exact math (no rounding) |
| `REAL` | 4 bytes | 6 decimal digits precision | Scientific data (approximate) |
| `DOUBLE PRECISION` | 8 bytes | 15 decimal digits precision | Scientific data (approximate) |

```sql
-- Examples
CREATE TABLE products (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quantity SMALLINT NOT NULL DEFAULT 0,
    price NUMERIC(10, 2) NOT NULL,         -- 99999999.99 max
    weight DOUBLE PRECISION                 -- approximate is fine for weight
);
```

> **Never use `REAL` or `DOUBLE PRECISION` for money.** Floating-point math causes rounding errors. Use `NUMERIC(p, s)`.

---

### Text

| Type | Description | Use when |
|------|-------------|----------|
| `TEXT` | Unlimited variable-length string | **Default choice** — always use this |
| `VARCHAR(n)` | Variable-length with max `n` chars | Only if you need a hard length limit |
| `CHAR(n)` | Fixed-length, space-padded | Almost never — legacy compatibility only |

```sql
-- Just use TEXT
name TEXT NOT NULL,
email TEXT NOT NULL,
description TEXT
```

---

### Boolean

| Type | Values | Storage |
|------|--------|---------|
| `BOOLEAN` | `true`, `false`, `null` | 1 byte |

Accepted input values: `true`, `false`, `'t'`, `'f'`, `'yes'`, `'no'`, `'1'`, `'0'`, `'on'`, `'off'`

```sql
completed BOOLEAN NOT NULL DEFAULT false
```

---

### Date & Time

| Type | Stores | Example | Use when |
|------|--------|---------|----------|
| `TIMESTAMPTZ` | Date + time + timezone | `2026-03-23 14:30:00+01` | **Default choice for timestamps** |
| `TIMESTAMP` | Date + time, no timezone | `2026-03-23 14:30:00` | Avoid — ambiguous across timezones |
| `DATE` | Date only | `2026-03-23` | Birthdays, date-only data |
| `TIME` | Time only | `14:30:00` | Rare — usually pair with date |
| `INTERVAL` | Duration | `2 hours 30 minutes` | Time calculations |

```sql
-- Always use TIMESTAMPTZ
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

-- Interval math
SELECT now() + INTERVAL '30 days';          -- 30 days from now
SELECT now() - INTERVAL '2 hours';          -- 2 hours ago
SELECT age('2026-03-23', '2000-01-15');     -- 26 years 2 mons 8 days
```

> **Rule:** Always use `TIMESTAMPTZ`, never `TIMESTAMP`. PostgreSQL stores `TIMESTAMPTZ` in UTC internally and converts to the client's timezone on output. `TIMESTAMP` has no timezone info, so it becomes ambiguous when users are in different timezones.

---

### UUID

| Type | Size | Example |
|------|------|---------|
| `UUID` | 16 bytes | `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` |

```sql
-- Generate UUIDs (no extension needed in PG 13+)
SELECT gen_random_uuid();

-- Use as primary key
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);
```

Why UUID over auto-increment?
- **No sequential guessing** — users can't guess other IDs
- **Distributed safe** — multiple servers can generate IDs without collision
- **Supabase default** — `auth.users` uses UUID, your tables should match

---

### JSONB

Covered in section 02. Quick reminder:

```sql
metadata JSONB NOT NULL DEFAULT '{}'
```

Use `JSONB` (not `JSON`). It's binary, indexable, and supports all the operators (`->`, `->>`, `@>`, `?`).

---

### Arrays

Covered in section 02. Quick reminder:

```sql
tags TEXT[] NOT NULL DEFAULT '{}'
```

Any type can become an array by adding `[]`.

---

## 2. Enums

Create a named set of allowed values:

```sql
-- Create the type
CREATE TYPE priority_level AS ENUM ('none', 'low', 'medium', 'high');

-- Use it
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    priority priority_level NOT NULL DEFAULT 'none'
);

-- Only valid values accepted
INSERT INTO tasks (title, priority) VALUES ('Learn PG', 'high');    -- OK
INSERT INTO tasks (title, priority) VALUES ('Learn PG', 'urgent');  -- ERROR
```

### Managing enums

```sql
-- Add a value
ALTER TYPE priority_level ADD VALUE 'critical' AFTER 'high';

-- List all values of an enum
SELECT enum_range(NULL::priority_level);

-- See all custom types
\dT
```

### Enum vs CHECK constraint

| Approach | Pros | Cons |
|----------|------|------|
| `ENUM` | Type-safe, reusable across tables | Hard to remove/rename values |
| `CHECK` constraint | Easy to modify | Not reusable, just a column constraint |

```sql
-- Alternative: CHECK constraint (easier to change)
priority INT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3)
```

> **In your todos app**, `priority` uses a `CHECK` constraint (integer 0–3) because it's simpler. Use enums for values that are stable and meaningful as strings (like `order_status`).

---

## 3. Domains

A domain is a **reusable type alias with constraints**. Think of it as a custom type built on top of an existing type.

```sql
-- Create a domain for email
CREATE DOMAIN email_address AS TEXT
    CHECK (VALUE ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$');

-- Create a domain for positive integers
CREATE DOMAIN positive_int AS INTEGER
    CHECK (VALUE > 0);

-- Create a domain for hex colors
CREATE DOMAIN hex_color AS TEXT
    DEFAULT '#6B7280'
    CHECK (VALUE ~* '^#[0-9a-f]{6}$');

-- Use them like normal types
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email email_address NOT NULL,
    age positive_int,
    theme_color hex_color NOT NULL
);
```

### Why domains?

- **Reuse** — define the constraint once, use in many tables
- **Consistency** — every `email_address` column has the same validation
- **Self-documenting** — `email_address` is clearer than `TEXT` with a random CHECK

### Managing domains

```sql
-- Modify a domain
ALTER DOMAIN email_address ADD CONSTRAINT max_length CHECK (length(VALUE) <= 320);

-- Drop a domain
DROP DOMAIN email_address;

-- List domains
\dD
```

---

## 4. Type Casting

PostgreSQL is stricter about types than MySQL. You often need explicit casts:

```sql
-- Cast syntax (two ways)
SELECT '42'::INTEGER;              -- PostgreSQL-style cast
SELECT CAST('42' AS INTEGER);     -- SQL-standard cast

-- Common casts
SELECT '2026-03-23'::DATE;
SELECT '{"a":1}'::JSONB;
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID;

-- Cast in queries
SELECT * FROM tasks WHERE id = 'some-uuid-string'::UUID;
```

### `::` vs `CAST()`

Both do the same thing. `::` is PostgreSQL-specific but shorter and more common in practice. You'll see it everywhere in Supabase.

---

## 5. Useful Type Functions

```sql
-- Check the type of a value
SELECT pg_typeof(42);              -- integer
SELECT pg_typeof('hello');         -- unknown (untyped literal)
SELECT pg_typeof('hello'::TEXT);   -- text
SELECT pg_typeof(now());           -- timestamp with time zone

-- Null handling
SELECT COALESCE(null, null, 'fallback');   -- 'fallback' (first non-null)
SELECT NULLIF(0, 0);                       -- null (returns null if equal)

-- Type info for a table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks';
```

---

## 6. Choosing Types — Cheat Sheet

| Data | Type to use | Why |
|------|-------------|-----|
| Primary key | `UUID` | Supabase standard, no guessing |
| Name, title, description | `TEXT` | No reason to limit length |
| Email | `TEXT` or custom domain | Domain adds validation |
| Money | `NUMERIC(10, 2)` | No floating-point rounding |
| Count, quantity, priority | `INTEGER` | Simple whole numbers |
| Yes/No flag | `BOOLEAN` | Real boolean, not int hack |
| Any timestamp | `TIMESTAMPTZ` | Always timezone-aware |
| Flexible key-value data | `JSONB` | Indexed, queryable |
| Fixed set of values | `ENUM` or `CHECK` | Depends on how stable the values are |
| List of simple values | `TEXT[]` | Only for non-relational lists |
| Color codes | `TEXT` or domain | Domain can enforce `#hex` format |

---

## Practice

```sql
-- 1. Create an enum type for task status
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

-- 2. Create a domain for positive price
CREATE DOMAIN positive_price AS NUMERIC(10, 2) CHECK (VALUE >= 0);

-- 3. Create a table using UUID, TEXT, BOOLEAN, TIMESTAMPTZ, your enum, and your domain
CREATE TABLE practice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    status task_status NOT NULL DEFAULT 'todo',
    price positive_price,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Insert some rows and experiment
INSERT INTO practice_items (title, status, price, tags)
VALUES ('Item 1', 'in_progress', 29.99, ARRAY['sale', 'new']);

-- 5. Try inserting invalid data and see the errors
INSERT INTO practice_items (title, price) VALUES ('Bad price', -5);       -- domain violation
INSERT INTO practice_items (title, status) VALUES ('Bad status', 'xxx');  -- enum violation

-- 6. Check types
SELECT pg_typeof(id), pg_typeof(created_at), pg_typeof(metadata) FROM practice_items;

-- 7. Query with casting
SELECT * FROM practice_items WHERE created_at > '2026-01-01'::TIMESTAMPTZ;

-- Cleanup
DROP TABLE practice_items;
DROP TYPE task_status;
DROP DOMAIN positive_price;
```
