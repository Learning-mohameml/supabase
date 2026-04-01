# RLS Implementation Checklist

Step-by-step guide to add Row Level Security to any table in a Supabase project.

---

## Step 1 — Create the Migration File

```bash
supabase migration new add_rls_todos
```

All RLS SQL goes in this file: `supabase/migrations/<timestamp>_add_rls_todos.sql`

---

## Step 2 — Enable RLS on the Table

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
```

> After this line, with no policies yet, **all access is denied** for `anon` and `authenticated` roles.

---

## Step 3 — Decide Your Access Pattern

Pick the pattern that fits your table (see `04_common-patterns.md`):

| Pattern | Use when |
|---------|----------|
| Owner-only | Each row belongs to one user (todos, notes, settings) |
| Public read / owner write | Content visible to all, editable by creator (posts, profiles) |
| Authenticated read / owner write | Internal app, all users see all rows but only edit their own |
| Role-based (admin) | Some users need elevated access |
| Team/org | Rows shared within a group |
| Soft delete | Rows have `deleted_at`, never truly deleted |

---

## Step 4 — Write the Policies

### Owner-only (most common)

```sql
CREATE POLICY "select own todos"
  ON todos FOR SELECT TO authenticated
  USING ( user_id = auth.uid() );

CREATE POLICY "insert own todos"
  ON todos FOR INSERT TO authenticated
  WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "update own todos"
  ON todos FOR UPDATE TO authenticated
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "delete own todos"
  ON todos FOR DELETE TO authenticated
  USING ( user_id = auth.uid() );
```

### Checklist per policy

- [ ] `FOR` is set to the correct command (SELECT / INSERT / UPDATE / DELETE)
- [ ] `TO authenticated` is set (unless you intentionally want anon access)
- [ ] `USING` is present for SELECT, UPDATE, DELETE
- [ ] `WITH CHECK` is present for INSERT and UPDATE
- [ ] UPDATE has **both** `USING` and `WITH CHECK`

---

## Step 5 — Add Indexes for Policy Columns

RLS policies run on every query. Make sure the columns referenced in your policies are indexed.

```sql
-- If your policy filters by user_id
CREATE INDEX ON todos (user_id);

-- If your policy uses a subquery on a membership table
CREATE INDEX ON team_members (user_id);
```

---

## Step 6 — Apply the Migration Locally

```bash
supabase db reset       # reset local DB and apply all migrations + seed
# or
supabase migration up   # apply only new migrations
```

---

## Step 7 — Test the Policies

Open the Supabase local SQL editor (`http://localhost:54323`) or use `psql`:

```sql
-- Test as user A
BEGIN;
SET LOCAL role = 'authenticated';
SELECT set_config('request.jwt.claims', '{"sub": "<user-a-uuid>", "role": "authenticated"}', true);

SELECT * FROM todos;          -- should return only user A rows
INSERT INTO todos (title, user_id) VALUES ('test', '<user-b-uuid>');  -- should fail

ROLLBACK;
```

```sql
-- Test as anon
BEGIN;
SET LOCAL role = 'anon';
SELECT set_config('request.jwt.claims', '{}', true);

SELECT * FROM todos;  -- should return 0 rows (no public policy)

ROLLBACK;
```

---

## Step 8 — Verify Policies Exist

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'todos'
ORDER BY cmd;
```

---

## Step 9 — Push to Remote

```bash
supabase db push
```

---

## Step 10 — Final Security Check

Before shipping, run through this checklist:

- [ ] RLS is enabled on every table that holds user data
- [ ] No table has `USING (true)` on INSERT/UPDATE without intent
- [ ] UPDATE policies have both `USING` and `WITH CHECK`
- [ ] `service_role` key is not used in any client-side code
- [ ] `user_metadata` is not used for authorization decisions (use `app_metadata`)
- [ ] Foreign key columns used in policies are indexed
- [ ] Tested with at least two different user UUIDs to confirm isolation

---

## Full Migration Template

```sql
-- supabase/migrations/<timestamp>_add_rls_todos.sql

-- 1. Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 2. Policies
CREATE POLICY "select own todos"
  ON todos FOR SELECT TO authenticated
  USING ( user_id = auth.uid() );

CREATE POLICY "insert own todos"
  ON todos FOR INSERT TO authenticated
  WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "update own todos"
  ON todos FOR UPDATE TO authenticated
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "delete own todos"
  ON todos FOR DELETE TO authenticated
  USING ( user_id = auth.uid() );

-- 3. Index (if not already present)
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON todos (user_id);
```
