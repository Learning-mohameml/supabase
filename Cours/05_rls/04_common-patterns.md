# 04 — Common Patterns

Real-world RLS policies follow a small set of recurring patterns. Master these and you can secure almost any schema.

---

## Pattern 1 — Owner-Only Access

The most common pattern. A user can only read and write their own rows.

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select own"  ON todos FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert own"  ON todos FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own"  ON todos FOR UPDATE  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own"  ON todos FOR DELETE  TO authenticated USING (user_id = auth.uid());
```

> Always include both `USING` and `WITH CHECK` on `UPDATE` to prevent `user_id` hijacking.

---

## Pattern 2 — Public Read / Owner Write

Anyone can read (e.g., blog posts, public profiles). Only the owner can write.

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read
CREATE POLICY "public read"
  ON posts FOR SELECT
  USING ( true );

-- Only the author can insert/update/delete
CREATE POLICY "author insert" ON posts FOR INSERT  TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "author update" ON posts FOR UPDATE  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "author delete" ON posts FOR DELETE  TO authenticated USING (author_id = auth.uid());
```

---

## Pattern 3 — Authenticated Read / Owner Write

Logged-in users can read all rows. Only the owner can write.

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all rows
CREATE POLICY "authenticated read"
  ON todos FOR SELECT
  TO authenticated
  USING ( true );

-- Only the owner can modify
CREATE POLICY "owner insert" ON todos FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner update" ON todos FOR UPDATE  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner delete" ON todos FOR DELETE  TO authenticated USING (user_id = auth.uid());
```

---

## Pattern 4 — Role-Based Access (Admin)

Admins can access everything. Regular users only see their own rows. Admin role is stored in `app_metadata` (server-set, trusted).

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Helper expression (readable shorthand)
-- (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'

CREATE POLICY "admin full access"
  ON todos FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "user own rows"
  ON todos FOR ALL
  TO authenticated
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );
```

Both policies are PERMISSIVE — admins match the first, regular users match the second.

---

## Pattern 5 — Shared Resources (Teams / Organizations)

Users belong to a team. They can see all rows belonging to their team.

```sql
-- Schema
CREATE TABLE teams (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE team_members (team_id uuid REFERENCES teams(id), user_id uuid REFERENCES auth.users(id), PRIMARY KEY (team_id, user_id));
CREATE TABLE projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid REFERENCES teams(id));

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- User can see projects if they are a member of the project's team
CREATE POLICY "team members read projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );
```

> For performance, index `team_members(user_id)` so the subquery is fast.

---

## Pattern 6 — Soft Delete (Restrictive Policy)

Rows have a `deleted_at` column. Deleted rows should be invisible to everyone, regardless of other policies.

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Restrictive: applies on top of all permissive policies
CREATE POLICY "hide deleted rows"
  ON todos
  AS RESTRICTIVE
  FOR SELECT
  USING ( deleted_at IS NULL );

-- Regular permissive policies still apply
CREATE POLICY "owner read" ON todos FOR SELECT TO authenticated USING (user_id = auth.uid());
```

A row must pass **both**: the restrictive `deleted_at IS NULL` AND the permissive owner check.

---

## Pattern 7 — Profiles Table (Linked to `auth.users`)

The `profiles` table mirrors `auth.users` with extra fields. Each user has exactly one profile.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (public)
CREATE POLICY "public read profiles"
  ON profiles FOR SELECT
  USING ( true );

-- Users can only update their own profile
CREATE POLICY "update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ( id = auth.uid() )
  WITH CHECK ( id = auth.uid() );
```

Insert is typically handled by a trigger on `auth.users`, not by the user directly.

---

## Combining Patterns

Real apps combine patterns. Example: todos with soft delete and owner-only access.

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Hard constraint: never show deleted rows
CREATE POLICY "hide deleted"
  ON todos AS RESTRICTIVE FOR SELECT
  USING ( deleted_at IS NULL );

-- Owner access
CREATE POLICY "owner select" ON todos FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner insert" ON todos FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner update" ON todos FOR UPDATE  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner delete" ON todos FOR DELETE  TO authenticated USING (user_id = auth.uid());
```

---

## Quick Reference

| Pattern | USING | WITH CHECK | Notes |
|---------|-------|------------|-------|
| Owner-only | `user_id = auth.uid()` | `user_id = auth.uid()` | Both on UPDATE |
| Public read | `true` | — | No role restriction needed |
| Admin access | JWT `app_metadata.role = 'admin'` | same | Use PERMISSIVE alongside user policy |
| Team access | subquery on membership table | same | Index the FK |
| Soft delete | `deleted_at IS NULL` | — | Use RESTRICTIVE |

**Next:** [05 — Testing Policies](./05_testing-policies.md) — how to verify your policies work correctly before shipping.
