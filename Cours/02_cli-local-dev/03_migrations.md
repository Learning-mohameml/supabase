# 03 — Migrations

## What is a migration?

A migration is a **timestamped SQL file** that describes a schema change. Instead of running `CREATE TABLE` by hand, you write it in a migration file and let the CLI apply it.

```
supabase/migrations/
├── 20260324160000_create_extensions.sql
├── 20260324160001_create_tables.sql
├── 20260324160002_create_trigger.sql
└── 20260324160003_create_indexes.sql
```

### Why migrations instead of raw SQL?

| Raw SQL (Chapter 01) | Migrations (Chapter 02+) |
|---|---|
| One big file, run manually | Small files, applied in order automatically |
| No history — you overwrite the file | Each file is a point-in-time change in Git |
| "What's the current schema?" — read the file | "What changed?" — read the migration |
| Hard to collaborate | Team members get each other's changes via Git |
| No rollback story | Can reset and replay from scratch |

**Rule:** every schema change is a migration file. Never modify the database by hand in production.

---

## Creating a migration

```bash
supabase migration new <name>
```

This creates an empty `.sql` file in `supabase/migrations/` with a timestamp prefix:

```bash
supabase migration new create_extensions
# Created: supabase/migrations/20260324160000_create_extensions.sql
```

The file is empty — you write the SQL yourself.

---

## Converting your schema.sql into migrations

You already have a working `schema.sql` from Chapter 01. Now split it into logical migrations. The rule: **one concern per migration**.

### Migration 1 — Extensions

```bash
supabase migration new create_extensions
```

Write in the generated file:

```sql
-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable trigram for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Migration 2 — Tables

```bash
supabase migration new create_tables
```

```sql
CREATE TABLE categories (
    id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    color text NOT NULL DEFAULT '#6B7280',
    icon text,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE todos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    completed boolean NOT NULL DEFAULT false,
    priority integer NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    due_date timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    position integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    embedding vector(384)
);

CREATE TABLE tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    color text NOT NULL DEFAULT '#3B82F6',
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (name, user_id)
);

CREATE TABLE todo_tags (
    todo_id uuid REFERENCES todos(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
);
```

### Migration 3 — Trigger

```bash
supabase migration new create_updated_at_trigger
```

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Migration 4 — Indexes

```bash
supabase migration new create_indexes
```

```sql
CREATE INDEX idx_todos_user_id ON todos (user_id);
CREATE INDEX idx_todos_category_id ON todos (category_id);
CREATE INDEX idx_todos_due_date ON todos (due_date);
CREATE INDEX idx_categories_user_id ON categories (user_id);
CREATE INDEX idx_tags_user_id ON tags (user_id);
```

---

## Applying migrations

### `supabase db reset`

This is the main command for local development. It:

1. **Drops** the entire database
2. **Recreates** it from scratch
3. **Applies** all migrations in order (by timestamp)
4. **Runs** `seed.sql` (if it exists — covered in next section)

```bash
supabase db reset
```

```
Resetting local database...
Applying migration 20260324160000_create_extensions.sql...
Applying migration 20260324160001_create_tables.sql...
Applying migration 20260324160002_create_updated_at_trigger.sql...
Applying migration 20260324160003_create_indexes.sql...
Seeding data from supabase/seed.sql...
Finished supabase db reset.
```

> `db reset` is destructive — it wipes everything and rebuilds. That's the point: your migrations + seed should reproduce your entire database from zero.

### When to use `db reset`

- After writing new migrations
- When your local DB is in a bad state
- To verify migrations work from scratch
- After pulling a teammate's migration from Git

---

## Checking migration status

### List migrations

```bash
supabase migration list
```

Shows which migrations have been applied and which are pending.

### View in Studio

Open Studio → **Database** → **Migrations**. You'll see all applied migrations with their timestamps.

---

## How migrations are tracked

Supabase stores applied migrations in a table called `supabase_migrations.schema_migrations`. Each applied migration is recorded by its version (timestamp). This is how the CLI knows which migrations are new.

```sql
-- You can inspect this yourself:
SELECT * FROM supabase_migrations.schema_migrations;
```

---

## Common mistakes

### Don't edit applied migrations

Once a migration has been applied (locally or remotely), **don't modify it**. If you need to change something, create a new migration:

```bash
-- Wrong: editing 20260324160001_create_tables.sql after it ran

-- Right: create a new migration
supabase migration new add_column_to_todos
```

```sql
-- In the new migration file:
ALTER TABLE todos ADD COLUMN notes text;
```

### Don't reorder migrations

Migrations run in timestamp order. Don't rename files to change the order.

### One concern per migration

Don't put tables + triggers + indexes + seed data in one file. Separate them so each migration is a single logical change. This makes it easier to understand Git history and debug issues.

---

## Summary

| Command | What it does |
|---------|-------------|
| `supabase migration new <name>` | Create an empty timestamped migration file |
| `supabase db reset` | Drop DB, replay all migrations, run seed |
| `supabase migration list` | Show applied vs pending migrations |

### Migration workflow

```
1. supabase migration new <name>     # Create the file
2. Write SQL in the file             # Your schema change
3. supabase db reset                 # Apply from scratch
4. Verify in Studio                  # Check tables, data
5. git add + commit                  # Version control
```

---

## Next

Your tables are created by migrations, but they're empty. The next section covers **seeding** — how to populate your local database with test data automatically.
