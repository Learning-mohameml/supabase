# 04 — Seeding

## What is seeding?

Seeding is inserting **test data** into your local database so you have something to work with during development. Without it, every `supabase db reset` gives you empty tables.

The seed file is `supabase/seed.sql`. It runs automatically **after all migrations** during `supabase db reset`.

```
supabase db reset
  ├── 1. Drop database
  ├── 2. Recreate database
  ├── 3. Apply migrations (schema)    ← tables, triggers, indexes
  └── 4. Run seed.sql (data)          ← test rows
```

---

## Seed data vs production data

| | Seed data | Production data |
|---|---|---|
| **Where** | `supabase/seed.sql` | Created by users through the app |
| **When** | Local development only | Runtime |
| **Purpose** | Test data for development | Real user data |
| **Committed to Git?** | Yes | No |
| **Runs in production?** | Never | — |

> `seed.sql` is for local dev only. It never runs against your production database.

---

## Writing your seed file

You already have seed data from Chapter 01 (`Projects/todos/sql/schema.sql`, Step 5). Move the INSERT statements into `supabase/seed.sql`.

### `supabase/seed.sql`

```sql
-- Test user UUID (simulates auth.users — in Supabase, real users come from Auth)
-- We use a fixed UUID so all seed data references the same user
DO $$
DECLARE
  test_user_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  RAISE NOTICE 'Test user ID: %', test_user_id;
END $$;

-- Categories (fixed UUIDs so todos can reference them)
INSERT INTO categories (id, user_id, name, color)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Work', '#EF4444'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Personal', '#3B82F6'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Learning', '#10B981');

-- Todos (10 rows with varied priorities, due dates, completion, metadata, soft-delete)
INSERT INTO todos (user_id, category_id, title, description, priority, due_date, completed, metadata, deleted_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Finish report', 'Complete Q1 report', 3, NOW() + INTERVAL '1 day', false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Email client', NULL, 2, NOW() + INTERVAL '2 days', false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Gym session', 'Leg day', 1, NULL, false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Buy groceries', NULL, 0, NULL, true, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Read book', 'Read 30 pages', 1, NULL, false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Learn PostgreSQL', 'Triggers & indexes', 2, NOW() + INTERVAL '3 days', false, '{"notes": "check docs", "url": "https://supabase.com"}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Fix bug', 'Critical API issue', 3, NOW() + INTERVAL '5 hours', false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Call friend', NULL, 0, NULL, true, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Start side project', 'Quant tool idea', 2, NULL, false, '{}', NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Review PR', NULL, 2, NOW() + INTERVAL '1 day', false, '{}', NULL);

-- Tags (fixed UUIDs for deterministic tag assignments)
INSERT INTO tags (id, user_id, name)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'urgent'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'quick-win'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'blocked'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'review'),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'idea');

-- Tag assignments
-- "Finish report" → urgent + blocked
-- "Fix bug" → urgent + review
-- "Buy groceries" → quick-win
-- "Start side project" → idea
-- "Review PR" → review
INSERT INTO todo_tags (todo_id, tag_id)
SELECT t.id, 'cccccccc-0000-0000-0000-000000000001'::uuid FROM todos t WHERE t.title = 'Finish report'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000003'::uuid FROM todos t WHERE t.title = 'Finish report'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000001'::uuid FROM todos t WHERE t.title = 'Fix bug'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000004'::uuid FROM todos t WHERE t.title = 'Fix bug'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000002'::uuid FROM todos t WHERE t.title = 'Buy groceries'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000005'::uuid FROM todos t WHERE t.title = 'Start side project'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000004'::uuid FROM todos t WHERE t.title = 'Review PR';
```

---

## Running the seed

You don't run `seed.sql` manually. It's applied automatically by `supabase db reset`:

```bash
supabase db reset
```

Output:

```
Resetting local database...
Applying migration 20260324160000_create_extensions.sql...
Applying migration 20260324160001_create_tables.sql...
Applying migration 20260324160002_create_updated_at_trigger.sql...
Applying migration 20260324160003_create_indexes.sql...
Seeding data from supabase/seed.sql...
Finished supabase db reset.
```

Then verify in Studio (`localhost:54323`) → Table Editor:
- `categories`: 3 rows
- `todos`: 10 rows
- `tags`: 5 rows
- `todo_tags`: 7 rows

---

## Seed best practices

### Use fixed UUIDs for references

If table B references table A, use fixed UUIDs for A so B can reference them reliably:

```sql
-- Good: fixed UUID, so todos can reference it
INSERT INTO categories (id, ...) VALUES ('bbbbbbbb-...', ...);
INSERT INTO todos (category_id, ...) VALUES ('bbbbbbbb-...', ...);

-- Bad: random UUID, now how does todos reference it?
INSERT INTO categories (id, ...) VALUES (gen_random_uuid(), ...);
```

### Keep seed data realistic

- Use different values for each row (varied priorities, some nulls, some with data)
- Include edge cases (soft-deleted rows, empty descriptions, max priority)
- This helps catch UI bugs during development

### Don't seed auth users directly

In Supabase, users live in the `auth.users` table managed by GoTrue. You can't just `INSERT INTO auth.users`. For now, we use a fake UUID (`aaaaaaaa-...`). In Chapter 04 (Auth), you'll create real users through the auth system, and the seed will be updated to use `auth.uid()`.

---

## The full local dev cycle

With migrations + seed, your local workflow is now:

```
1. Write a migration         supabase migration new <name>
2. Write SQL in the file     CREATE TABLE, ALTER TABLE, etc.
3. Reset the database        supabase db reset
4. Check in Studio           localhost:54323
5. Commit to Git             git add supabase/ && git commit
```

Every team member gets the same database by running `supabase db reset`. No manual setup, no shared dev databases, no "works on my machine" problems.

---

## Summary

| File | Purpose | When it runs |
|------|---------|-------------|
| `supabase/migrations/*.sql` | Schema (DDL) | During `db reset`, in timestamp order |
| `supabase/seed.sql` | Test data (DML) | After all migrations, during `db reset` |

| Command | What it does |
|---------|-------------|
| `supabase db reset` | Drop + recreate + apply migrations + run seed |

---

## Next

Your local stack now has schema (migrations) and data (seed). The final section covers **linking** your local project to a remote Supabase project and pushing your migrations to production.
