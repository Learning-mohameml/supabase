# Functions & Triggers

## Goal

Write reusable SQL logic with PL/pgSQL functions and automate actions with triggers. You'll need these for `updated_at` timestamps, RLS helpers, and custom business logic in Supabase.

---

## 1. Functions — Basics

A function is a reusable block of SQL or PL/pgSQL code stored in the database.

### SQL function (simple)

```sql
-- A function that returns a greeting
CREATE FUNCTION hello(name TEXT) RETURNS TEXT AS $$
    SELECT 'Hello, ' || name || '!';
$$ LANGUAGE sql;

-- Call it
SELECT hello('Alice');  -- 'Hello, Alice!'
```

### PL/pgSQL function (procedural)

PL/pgSQL adds variables, conditionals, loops — a full programming language inside PostgreSQL.

```sql
CREATE FUNCTION add_numbers(a INTEGER, b INTEGER) RETURNS INTEGER AS $$
BEGIN
    RETURN a + b;
END;
$$ LANGUAGE plpgsql;

SELECT add_numbers(3, 5);  -- 8
```

### `$$` — Dollar quoting

`$$` is just a string delimiter (instead of single quotes). It avoids escaping issues when your function body contains single quotes:

```sql
-- Without dollar quoting (painful)
CREATE FUNCTION greet(name TEXT) RETURNS TEXT AS '
    SELECT ''Hello, '' || name;
' LANGUAGE sql;

-- With dollar quoting (clean)
CREATE FUNCTION greet(name TEXT) RETURNS TEXT AS $$
    SELECT 'Hello, ' || name;
$$ LANGUAGE sql;
```

You can also use named delimiters for nested functions: `$fn$...$fn$`, `$body$...$body$`.

---

## 2. Functions — Variables & Control Flow

### Variables

```sql
CREATE FUNCTION calculate_discount(price NUMERIC, discount_pct INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    discount_amount NUMERIC;
    final_price NUMERIC;
BEGIN
    discount_amount := price * discount_pct / 100;
    final_price := price - discount_amount;
    RETURN final_price;
END;
$$ LANGUAGE plpgsql;

SELECT calculate_discount(100.00, 20);  -- 80.00
```

### IF / ELSIF / ELSE

```sql
CREATE FUNCTION priority_label(p INTEGER) RETURNS TEXT AS $$
BEGIN
    IF p = 0 THEN
        RETURN 'none';
    ELSIF p = 1 THEN
        RETURN 'low';
    ELSIF p = 2 THEN
        RETURN 'medium';
    ELSIF p = 3 THEN
        RETURN 'high';
    ELSE
        RETURN 'unknown';
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT priority_label(2);  -- 'medium'
```

### CASE (inside a function or standalone)

```sql
-- Standalone CASE (works anywhere in SQL)
SELECT title,
    CASE priority
        WHEN 0 THEN 'none'
        WHEN 1 THEN 'low'
        WHEN 2 THEN 'medium'
        WHEN 3 THEN 'high'
    END AS priority_label
FROM todos;
```

### Loops

```sql
-- FOR loop
CREATE FUNCTION sum_up_to(n INTEGER) RETURNS INTEGER AS $$
DECLARE
    total INTEGER := 0;
BEGIN
    FOR i IN 1..n LOOP
        total := total + i;
    END LOOP;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

SELECT sum_up_to(10);  -- 55
```

---

## 3. Functions — Return Types

### Return a single value

```sql
CREATE FUNCTION todo_count() RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER FROM todos;
$$ LANGUAGE sql;
```

### Return a row (record)

```sql
CREATE FUNCTION get_todo(todo_id UUID) RETURNS todos AS $$
    SELECT * FROM todos WHERE id = todo_id;
$$ LANGUAGE sql;

-- Call it — returns a full row
SELECT * FROM get_todo('some-uuid');
```

### Return a set of rows (SETOF)

```sql
CREATE FUNCTION high_priority_todos() RETURNS SETOF todos AS $$
    SELECT * FROM todos WHERE priority >= 2;
$$ LANGUAGE sql;

-- Call it — returns multiple rows (use like a table)
SELECT * FROM high_priority_todos();
SELECT title FROM high_priority_todos() WHERE completed = false;
```

### Return a table (custom columns)

```sql
CREATE FUNCTION todo_summary()
RETURNS TABLE (title TEXT, priority INTEGER, category TEXT) AS $$
    SELECT t.title, t.priority, c.name
    FROM todos t
    LEFT JOIN categories c ON t.category_id = c.id;
$$ LANGUAGE sql;

SELECT * FROM todo_summary();
```

### Return void (no return value)

```sql
CREATE FUNCTION log_message(msg TEXT) RETURNS VOID AS $$
BEGIN
    RAISE NOTICE '%', msg;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Function Management

```sql
-- List functions
\df

-- See a function's definition
\df+ function_name

-- Drop a function
DROP FUNCTION IF EXISTS hello(TEXT);

-- Replace an existing function (no need to drop first)
CREATE OR REPLACE FUNCTION hello(name TEXT) RETURNS TEXT AS $$
    SELECT 'Hey, ' || name || '!';
$$ LANGUAGE sql;
```

> **`CREATE OR REPLACE`** is your friend. Use it to update functions without dropping them (avoids breaking dependencies).

---

## 5. Triggers — Basics

A trigger automatically runs a function **when a table event happens** (INSERT, UPDATE, DELETE).

```
Event (INSERT/UPDATE/DELETE) → Trigger → Trigger Function → Side effect
```

### The trigger function

A trigger function is a special function that:
- Returns `TRIGGER`
- Has access to special variables: `NEW` (the new row), `OLD` (the old row)
- Must return `NEW`, `OLD`, or `NULL`

```sql
-- Trigger function: auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### The trigger

```sql
-- Attach the trigger to a table
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

Now, every time a row in `todos` is updated, `updated_at` is automatically set to `now()`.

```sql
-- Test it
UPDATE todos SET title = 'Updated title' WHERE id = 'some-uuid';
-- updated_at is now automatically refreshed
```

> **This is exactly what your todos app needs.** You'll create this trigger in your migration.

---

## 6. Trigger Timing

| Timing | When it runs | Use case |
|--------|-------------|----------|
| `BEFORE` | Before the row is written | Modify the row (e.g., set `updated_at`) |
| `AFTER` | After the row is written | Side effects (e.g., audit log, notification) |
| `INSTEAD OF` | Replaces the operation | Used on views only |

### BEFORE vs AFTER

```sql
-- BEFORE: can modify NEW before it's saved
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- AFTER: row is already saved, useful for logging
CREATE TRIGGER log_todo_insert
    AFTER INSERT ON todos
    FOR EACH ROW
    EXECUTE FUNCTION log_new_todo();
```

### FOR EACH ROW vs FOR EACH STATEMENT

```sql
-- FOR EACH ROW: fires once per affected row
CREATE TRIGGER per_row_trigger
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- FOR EACH STATEMENT: fires once per SQL statement (regardless of rows affected)
CREATE TRIGGER per_statement_trigger
    AFTER DELETE ON todos
    FOR EACH STATEMENT
    EXECUTE FUNCTION notify_cleanup();
```

> **Almost always use `FOR EACH ROW`** unless you need a single notification after a bulk operation.

---

## 7. Trigger Variables

Inside a trigger function, these special variables are available:

| Variable | Available in | Description |
|----------|-------------|-------------|
| `NEW` | INSERT, UPDATE | The new row being written |
| `OLD` | UPDATE, DELETE | The old row before the change |
| `TG_OP` | All | The operation: `'INSERT'`, `'UPDATE'`, `'DELETE'` |
| `TG_TABLE_NAME` | All | Name of the table |
| `TG_WHEN` | All | `'BEFORE'` or `'AFTER'` |

### A multi-purpose trigger function

```sql
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'Inserted into %: %', TG_TABLE_NAME, NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at = now();
        RAISE NOTICE 'Updated in %: %', TG_TABLE_NAME, NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE NOTICE 'Deleted from %: %', TG_TABLE_NAME, OLD.id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. Conditional Triggers

### WHEN clause — only fire when a condition is met

```sql
-- Only update updated_at when something actually changed (not just completed toggled)
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_updated_at();
```

### Fire on specific columns

```sql
-- Only fire when title or description changes
CREATE TRIGGER title_changed
    BEFORE UPDATE OF title, description ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## 9. Managing Triggers

```sql
-- List triggers on a table
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'todos';

-- Disable a trigger (useful for bulk imports)
ALTER TABLE todos DISABLE TRIGGER set_updated_at;

-- Re-enable
ALTER TABLE todos ENABLE TRIGGER set_updated_at;

-- Disable ALL triggers on a table
ALTER TABLE todos DISABLE TRIGGER ALL;

-- Drop a trigger
DROP TRIGGER IF EXISTS set_updated_at ON todos;
```

---

## 10. Common Patterns for Supabase

### Pattern 1: Auto-update `updated_at` (reusable)

```sql
-- One function for all tables
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to every table that has updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Pattern 2: Auto-set `user_id` from auth context (Supabase)

```sql
-- In Supabase, auth.uid() returns the current user's UUID
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_user_id BEFORE INSERT ON todos
    FOR EACH ROW EXECUTE FUNCTION set_user_id();
```

### Pattern 3: Prevent update of `created_at`

```sql
CREATE OR REPLACE FUNCTION protect_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = OLD.created_at;  -- always keep the original value
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_created_at BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION protect_created_at();
```

---

## Practice

```sql
-- Setup
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Create the reusable update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to todos
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 3. Test it
INSERT INTO todos (title, priority) VALUES ('Test trigger', 2);
SELECT title, created_at, updated_at FROM todos;     -- both should be the same

-- Wait a second then update
SELECT pg_sleep(1);
UPDATE todos SET priority = 3 WHERE title = 'Test trigger';
SELECT title, created_at, updated_at FROM todos;     -- updated_at should be later

-- 4. Create a function that returns high priority todos
CREATE FUNCTION high_priority() RETURNS SETOF todos AS $$
    SELECT * FROM todos WHERE priority >= 2;
$$ LANGUAGE sql;

SELECT * FROM high_priority();

-- 5. Create a function with IF/ELSIF
CREATE FUNCTION priority_label(p INTEGER) RETURNS TEXT AS $$
BEGIN
    IF p = 0 THEN RETURN 'none';
    ELSIF p = 1 THEN RETURN 'low';
    ELSIF p = 2 THEN RETURN 'medium';
    ELSIF p = 3 THEN RETURN 'high';
    ELSE RETURN 'unknown';
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT title, priority, priority_label(priority) FROM todos;

-- Cleanup
DROP TABLE todos;
DROP TABLE categories;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS high_priority;
DROP FUNCTION IF EXISTS priority_label;
```
