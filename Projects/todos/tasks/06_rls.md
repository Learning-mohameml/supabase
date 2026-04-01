# Task 06 — Row Level Security (RLS)

## Objective

Enable RLS on all tables and write per-table policies that scope every operation to the authenticated user. After this task, the database enforces data isolation — even if the app code has a bug, users cannot access each other's data.

## Reference

- RLS spec: [../docs/PR.md](../docs/PR.md) → "Row Level Security" section
- Course material: [../../Cours/05_rls/](../../Cours/05_rls/)
- Summary checklist: [../../Cours/05_rls/06_summary-checklist.md](../../Cours/05_rls/06_summary-checklist.md)

---

## Current State

- 4 tables: `todos`, `categories`, `tags`, `todo_tags`
- All have `user_id` columns (except `todo_tags`, which is a junction table)
- FK constraints to `auth.users(id)` with `ON DELETE CASCADE` are in place
- Indexes on `user_id` already exist for `todos`, `categories`, `tags`
- RLS is **not enabled** on any table
- App code filters with `.eq("user_id", user.id)` — works but bypassable

---

## Steps

### Step 1 — Create the Migration File

```bash
supabase migration new add_rls_policies
```

---

### Step 2 — Enable RLS on All Tables

In the migration file, enable RLS on every table:

```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;
```

> After this line, with no policies, all data access is denied for `anon` and `authenticated`.

---

### Step 3 — Write Policies for `categories`

Owner-only pattern. All 4 commands scoped to `user_id = auth.uid()`.

```sql
CREATE POLICY "categories: select own" ON categories
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "categories: insert own" ON categories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories: update own" ON categories
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories: delete own" ON categories
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

- [ ] 4 policies created
- [ ] UPDATE has both `USING` and `WITH CHECK`
- [ ] All scoped to `authenticated` role

---

### Step 4 — Write Policies for `todos`

Same owner-only pattern. Includes soft-delete consideration.

```sql
CREATE POLICY "todos: select own" ON todos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "todos: insert own" ON todos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "todos: update own" ON todos
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "todos: delete own" ON todos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

> Note: Soft-delete filtering (`deleted_at IS NULL`) stays in the app layer, not in a RESTRICTIVE policy. Reason: the app may need to query deleted rows later (e.g., trash/restore feature). RLS ensures ownership — the app decides visibility.

- [ ] 4 policies created
- [ ] UPDATE has both `USING` and `WITH CHECK`

---

### Step 5 — Write Policies for `tags`

Same owner-only pattern.

```sql
CREATE POLICY "tags: select own" ON tags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "tags: insert own" ON tags
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags: update own" ON tags
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags: delete own" ON tags
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

- [ ] 4 policies created

---

### Step 6 — Write Policies for `todo_tags` (Junction Table)

`todo_tags` has no `user_id` column — it links `todo_id` and `tag_id`. Ownership is verified by joining to the parent tables.

```sql
CREATE POLICY "todo_tags: select via todo owner" ON todo_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM todos WHERE todos.id = todo_tags.todo_id AND todos.user_id = auth.uid())
  );

CREATE POLICY "todo_tags: insert via todo owner" ON todo_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM todos WHERE todos.id = todo_tags.todo_id AND todos.user_id = auth.uid())
    AND
    EXISTS (SELECT 1 FROM tags WHERE tags.id = todo_tags.tag_id AND tags.user_id = auth.uid())
  );

CREATE POLICY "todo_tags: delete via todo owner" ON todo_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM todos WHERE todos.id = todo_tags.todo_id AND todos.user_id = auth.uid())
  );
```

> No UPDATE policy — `todo_tags` uses delete + re-insert (the junction table has a composite PK, no mutable columns).

> INSERT checks **both** `todos` and `tags` ownership — prevents linking someone else's tag to your todo.

- [ ] 3 policies (SELECT, INSERT, DELETE — no UPDATE)
- [ ] INSERT validates ownership of both `todo_id` and `tag_id`

---

### Step 7 — Apply and Test Locally

```bash
supabase db reset
```

Then test in the SQL editor (`http://localhost:54323`):

```sql
-- 1. Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 2. Verify all policies exist
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 3. Test as authenticated user (replace UUID with a real user from auth.users)
BEGIN;
SET LOCAL role = 'authenticated';
SELECT set_config('request.jwt.claims',
  '{"sub": "<your-user-uuid>", "role": "authenticated"}', true);

SELECT * FROM todos;       -- should see only your todos
SELECT * FROM categories;  -- should see only your categories
SELECT * FROM tags;        -- should see only your tags

ROLLBACK;

-- 4. Test as anon (should get 0 rows everywhere)
BEGIN;
SET LOCAL role = 'anon';
SELECT set_config('request.jwt.claims', '{}', true);

SELECT * FROM todos;       -- 0 rows
SELECT * FROM categories;  -- 0 rows

ROLLBACK;
```

- [ ] All 4 tables show `rowsecurity = true`
- [ ] 15 policies total (4 + 4 + 4 + 3)
- [ ] Authenticated user sees only their data
- [ ] Anon sees nothing

---

### Step 8 — Smoke Test the App

1. Start the local dev server
2. Sign in and verify all CRUD still works:
   - [ ] Todos: create, read, update, delete, soft-delete
   - [ ] Categories: create, read, update, delete
   - [ ] Tags: create, read, assign to todo, remove from todo
3. No regressions — the app `.eq("user_id", user.id)` filters are now redundant (but harmless to keep)

---

### Step 9 — Push to Remote (when ready)

```bash
supabase db push
```

---

## Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE | Total |
|-------|--------|--------|--------|--------|-------|
| `categories` | `user_id = auth.uid()` | `user_id = auth.uid()` | both clauses | `user_id = auth.uid()` | 4 |
| `todos` | `user_id = auth.uid()` | `user_id = auth.uid()` | both clauses | `user_id = auth.uid()` | 4 |
| `tags` | `user_id = auth.uid()` | `user_id = auth.uid()` | both clauses | `user_id = auth.uid()` | 4 |
| `todo_tags` | EXISTS on todos | EXISTS on todos + tags | — | EXISTS on todos | 3 |
| **Total** | | | | | **15** |
