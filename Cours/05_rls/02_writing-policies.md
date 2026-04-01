# 02 — Writing Policies

## The `CREATE POLICY` Statement

```sql
CREATE POLICY policy_name
  ON table_name
  [AS { PERMISSIVE | RESTRICTIVE }]
  [FOR { ALL | SELECT | INSERT | UPDATE | DELETE }]
  [TO { role_name | PUBLIC }]
  [USING ( expression )]
  [WITH CHECK ( expression )];
```

Every clause is optional except `policy_name` and `ON table_name`, but in practice you'll use most of them.

---

## `USING` vs `WITH CHECK`

This is the most important distinction in RLS policy writing.

| Clause | Applies to | Question it answers |
|--------|-----------|---------------------|
| `USING` | `SELECT`, `UPDATE`, `DELETE` | "Which existing rows can this role **see or touch**?" |
| `WITH CHECK` | `INSERT`, `UPDATE` | "Is this **new or modified** row allowed to exist?" |

```sql
-- USING filters rows the user can read/update/delete
CREATE POLICY "users see own todos"
  ON todos
  FOR SELECT
  USING ( user_id = auth.uid() );

-- WITH CHECK validates the data being written
CREATE POLICY "users insert own todos"
  ON todos
  FOR INSERT
  WITH CHECK ( user_id = auth.uid() );
```

### Why the distinction matters

- `USING` runs on rows **already in the table** — it's a filter
- `WITH CHECK` runs on the **row after the operation** — it's a validator

For `UPDATE`, you often need **both**:

```sql
CREATE POLICY "users update own todos"
  ON todos
  FOR UPDATE
  USING ( user_id = auth.uid() )       -- can only update rows they own
  WITH CHECK ( user_id = auth.uid() ); -- cannot change user_id to someone else's
```

Without `WITH CHECK` on UPDATE, a user could change `user_id` to another user's UUID and effectively "transfer" a row.

---

## `FOR` — Per-Command Policies

You write separate policies for each SQL command. Using `FOR ALL` is a shortcut but can be too broad.

```sql
-- Explicit per-command policies (preferred for clarity)
CREATE POLICY "select own todos"  ON todos FOR SELECT  USING (user_id = auth.uid());
CREATE POLICY "insert own todos"  ON todos FOR INSERT  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own todos"  ON todos FOR UPDATE  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own todos"  ON todos FOR DELETE  USING (user_id = auth.uid());
```

### `FOR ALL` shorthand

```sql
-- Equivalent to defining USING + WITH CHECK for all commands
CREATE POLICY "own todos"
  ON todos
  FOR ALL
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );
```

Use `FOR ALL` when all commands have identical logic. Split them when the logic differs.

---

## `TO` — Scoping to a Role

`TO` limits which PostgreSQL role the policy applies to. If omitted, it applies to `PUBLIC` (all roles).

```sql
-- Only applies to authenticated users
CREATE POLICY "authenticated users see own todos"
  ON todos
  FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() );

-- Only applies to anonymous users (e.g., public read)
CREATE POLICY "anon can read public todos"
  ON todos
  FOR SELECT
  TO anon
  USING ( is_public = true );
```

Scoping to `authenticated` is the most common pattern — it prevents unauthenticated requests from ever matching.

---

## `PERMISSIVE` vs `RESTRICTIVE`

### PERMISSIVE (default)

Multiple permissive policies are combined with **OR**. A row is accessible if **any** policy allows it.

```sql
-- Policy A: user owns the row
-- Policy B: row is marked public
-- Result: user can see rows they own OR rows that are public
CREATE POLICY "own" ON todos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "public" ON todos FOR SELECT USING (is_public = true);
```

### RESTRICTIVE

A restrictive policy is combined with **AND** with all other policies. The row must pass **all** restrictive policies AND at least one permissive policy.

```sql
-- Restricts access to only active rows, regardless of other policies
CREATE POLICY "only active"
  ON todos
  AS RESTRICTIVE
  FOR SELECT
  USING ( deleted_at IS NULL );
```

Use restrictive policies for hard constraints (e.g., soft-delete filtering, tenant isolation) that should never be overridden by permissive policies.

---

## Dropping and Replacing Policies

```sql
-- Drop a policy
DROP POLICY "own todos" ON todos;

-- Replace (drop + recreate) — there's no ALTER POLICY for expressions
DROP POLICY IF EXISTS "own todos" ON todos;
CREATE POLICY "own todos" ON todos FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Listing Existing Policies

```sql
-- See all policies on a table
SELECT policyname, cmd, qual, with_check, roles
FROM pg_policies
WHERE tablename = 'todos';
```

---

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| `FOR INSERT` with only `USING` | `USING` is ignored on INSERT | Use `WITH CHECK` |
| `FOR UPDATE` with only `USING` | User can change `user_id` to anything | Add `WITH CHECK` |
| No `TO` clause on a permissive policy | Policy applies to `anon` too | Add `TO authenticated` |
| Using `FOR ALL` when commands differ | Hard to reason about | Split per command |

---

## Summary

| Concept | Key point |
|---------|-----------|
| `USING` | Filters existing rows (SELECT, UPDATE, DELETE) |
| `WITH CHECK` | Validates written rows (INSERT, UPDATE) |
| `FOR` | Scope to one command or ALL |
| `TO` | Scope to a specific role (`authenticated`, `anon`) |
| PERMISSIVE | Policies OR'd together (default) |
| RESTRICTIVE | Must pass in addition to all permissive policies |

**Next:** [03 — Auth Context in Policies](./03_auth-context.md) — how to use `auth.uid()`, `auth.jwt()`, and `auth.role()` inside your policy expressions.
