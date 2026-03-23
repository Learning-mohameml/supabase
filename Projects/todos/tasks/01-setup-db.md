# Task 01 — Setup Database Schema

## Objective

Design and create the full todos app database schema in raw PostgreSQL (Docker + psql). Validate everything works, then later migrate to Supabase CLI in Chapter 02.

## Reference

- Schema spec: [../docs/PR.md](../docs/PR.md)

---

## Steps

### Phase A — Setup

- [ ] **A1.** Start a fresh PostgreSQL container for the todos app:
  ```bash
  docker run --name todos-db \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD=secret \
    -e POSTGRES_DB=todos \
    -p 5433:5432 \
    -d postgres:17
  ```
  > Using port `5433` so it doesn't conflict with your `pg-learn` container.

- [ ] **A2.** Connect with psql:
  ```bash
  docker exec -it todos-db psql -U admin -d todos
  ```

- [ ] **A3.** Enable required extensions:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```

---

### Phase B — Create Tables

Create tables in the correct order (parent tables first, children after).

- [ ] **B1.** Create the `categories` table
  - Columns: `id` (UUID PK), `name` (TEXT), `color` (TEXT with default), `icon` (TEXT nullable), `user_id` (UUID NOT NULL), `created_at` (TIMESTAMPTZ)
  - `user_id` is just a UUID for now — no FK to `auth.users` yet (that's Supabase-specific). We'll simulate it with a test UUID.

- [ ] **B2.** Create the `todos` table
  - Columns: `id`, `title`, `description`, `completed`, `priority` (with CHECK 0–3), `due_date`, `metadata` (JSONB), `position`, `category_id` (FK → categories ON DELETE SET NULL), `user_id`, `created_at`, `updated_at`, `deleted_at`, `embedding` (vector(384))
  - This is the biggest table — make sure every column has the right type, constraint, and default.

- [ ] **B3.** Create the `tags` table
  - Columns: `id`, `name`, `color` (with default), `user_id`, `created_at`
  - Add a `UNIQUE (name, user_id)` constraint

- [ ] **B4.** Create the `todo_tags` junction table
  - Columns: `todo_id` (FK → todos ON DELETE CASCADE), `tag_id` (FK → tags ON DELETE CASCADE)
  - Composite primary key: `PRIMARY KEY (todo_id, tag_id)`

- [ ] **B5.** Verify all tables with `\dt` and inspect each with `\d tablename`

---

### Phase C — Trigger

- [ ] **C1.** Create the reusable `update_updated_at()` trigger function
  - Returns TRIGGER, sets `NEW.updated_at = now()`, returns NEW

- [ ] **C2.** Attach trigger to `todos` table
  - BEFORE UPDATE, FOR EACH ROW

- [ ] **C3.** Test the trigger:
  ```sql
  -- Insert a todo, wait, update it, check that updated_at changed
  INSERT INTO todos (title, user_id) VALUES ('Test trigger', 'aaaaaaaa-0000-0000-0000-000000000001') RETURNING created_at, updated_at;
  SELECT pg_sleep(1);
  UPDATE todos SET title = 'Trigger works!' WHERE title = 'Test trigger' RETURNING created_at, updated_at;
  -- created_at should stay the same, updated_at should be ~1s later
  ```

---

### Phase D — Indexes

- [ ] **D1.** Create indexes for frequently queried columns:
  ```
  idx_todos_user_id       → todos(user_id)
  idx_todos_category_id   → todos(category_id)
  idx_todos_due_date      → todos(due_date)
  idx_categories_user_id  → categories(user_id)
  idx_tags_user_id        → tags(user_id)
  ```

- [ ] **D2.** Verify indexes with `\di`

---

### Phase E — Seed Data

- [ ] **E1.** Insert a test user (simulate `auth.users`):
  ```sql
  -- We use a fixed UUID that we'll reference everywhere
  -- In Supabase, this will come from auth.users
  DO $$
  DECLARE
    test_user_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  BEGIN
    RAISE NOTICE 'Test user ID: %', test_user_id;
  END $$;
  ```

- [ ] **E2.** Insert 3 categories: "Work" (#EF4444), "Personal" (#3B82F6), "Learning" (#10B981)

- [ ] **E3.** Insert 10 todos across categories with:
  - Different priorities (0, 1, 2, 3)
  - Some with `due_date`, some without
  - Some `completed = true`
  - At least one with `metadata` (e.g., `'{"notes": "check docs", "url": "https://supabase.com"}'`)
  - At least one with `description`
  - At least one soft-deleted (`deleted_at = now()`)

- [ ] **E4.** Insert 5 tags: "urgent", "quick-win", "blocked", "review", "idea"

- [ ] **E5.** Insert tag assignments in `todo_tags`:
  - At least 2 todos with multiple tags
  - At least 1 tag on multiple todos

---

### Phase F — Validate with Queries

Test that your schema supports all the queries the app will need.

- [ ] **F1.** List all todos with their category name (LEFT JOIN):
  ```sql
  SELECT t.title, t.priority, c.name AS category
  FROM todos t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.deleted_at IS NULL AND t.user_id = 'aaaaaaaa-...'
  ORDER BY t.priority DESC;
  ```

- [ ] **F2.** List all todos with their tags (many-to-many JOIN):
  ```sql
  SELECT t.title, string_agg(tg.name, ', ') AS tags
  FROM todos t
  LEFT JOIN todo_tags tt ON t.id = tt.todo_id
  LEFT JOIN tags tg ON tt.tag_id = tg.id
  WHERE t.deleted_at IS NULL
  GROUP BY t.id, t.title;
  ```

- [ ] **F3.** Full query — todos with category + tags + user:
  ```sql
  SELECT
      t.title, t.priority, t.completed,
      c.name AS category,
      string_agg(tg.name, ', ') AS tags
  FROM todos t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN todo_tags tt ON t.id = tt.todo_id
  LEFT JOIN tags tg ON tt.tag_id = tg.id
  WHERE t.deleted_at IS NULL AND t.user_id = 'aaaaaaaa-...'
  GROUP BY t.id, t.title, t.priority, t.completed, c.name
  ORDER BY t.priority DESC;
  ```

- [ ] **F4.** Count todos per category:
  ```sql
  SELECT c.name, COUNT(t.id) AS todo_count
  FROM categories c
  LEFT JOIN todos t ON c.id = t.category_id AND t.deleted_at IS NULL
  WHERE c.user_id = 'aaaaaaaa-...'
  GROUP BY c.id, c.name;
  ```

- [ ] **F5.** UPSERT a tag (insert or update color):
  ```sql
  INSERT INTO tags (name, color, user_id)
  VALUES ('urgent', '#DC2626', 'aaaaaaaa-...')
  ON CONFLICT (name, user_id) DO UPDATE SET color = EXCLUDED.color
  RETURNING *;
  ```

- [ ] **F6.** Soft delete a todo + verify it's excluded from normal queries:
  ```sql
  UPDATE todos SET deleted_at = now() WHERE title = 'some todo' RETURNING *;
  -- This should NOT appear in queries with WHERE deleted_at IS NULL
  SELECT * FROM todos WHERE deleted_at IS NULL;
  ```

- [ ] **F7.** Vector similarity search (with dummy vectors):
  ```sql
  -- Insert a todo with a tiny test vector
  UPDATE todos SET embedding = '[1, 0, 0]'::vector(384)...
  -- For testing, use vector(3) temporarily or skip if pgvector isn't installed
  ```

---

### Phase G — Save Your Work

- [ ] **G1.** Save your final SQL as `Practice/01_postgresql-foundation/todos-schema.sql`
  - Include: extensions, all CREATE TABLE statements, trigger function + trigger, indexes, seed data
  - This file is your reference when writing Supabase migrations in Chapter 02

- [ ] **G2.** Stop the container (data persists):
  ```bash
  docker stop todos-db
  ```

---

## Done Criteria

- [ ] All 4 tables created with correct types, constraints, and defaults
- [ ] `update_updated_at` trigger works on `todos`
- [ ] Indexes on `user_id`, `category_id`, `due_date`
- [ ] Seed data inserted (3 categories, 10 todos, 5 tags, tag assignments)
- [ ] All 7 validation queries return expected results
- [ ] Full SQL saved in `Practice/01_postgresql-foundation/todos-schema.sql`

---

## What's Next

After completing this task, ask Claude to **review your SQL**. Then move to **Chapter 02 — CLI & Local Dev** where you'll convert this raw SQL into proper Supabase migrations.
