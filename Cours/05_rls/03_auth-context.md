# 03 — Auth Context in Policies

## How Auth Context Gets Into PostgreSQL

When a request hits Supabase via PostgREST, it sets session-level configuration before running your query:

```sql
SET LOCAL role = 'authenticated';                          -- or 'anon'
SET LOCAL request.jwt.claims = '{ "sub": "user-uuid", "role": "authenticated", "email": "user@example.com", ... }';
```

Supabase exposes three helper functions in the `auth` schema to read this context cleanly inside your policies.

---

## `auth.uid()`

Returns the UUID of the currently authenticated user — the `sub` claim from the JWT.

```sql
auth.uid() → uuid
```

```sql
-- Most common usage: owner check
CREATE POLICY "users see own todos"
  ON todos FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() );
```

Returns `NULL` for unauthenticated requests (`anon` role). A policy using `auth.uid()` without a `TO authenticated` scope will silently exclude all anonymous rows (since `NULL = anything` is `NULL`, which is falsy).

---

## `auth.role()`

Returns the current PostgreSQL role as text.

```sql
auth.role() → text   -- 'authenticated' | 'anon' | 'service_role'
```

```sql
-- Allow only authenticated users to insert
CREATE POLICY "only authenticated can insert"
  ON todos FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );
```

In practice you get the same result by using `TO authenticated` in the policy — that's cleaner. Use `auth.role()` when you need role-branching logic inside a single expression.

```sql
-- One policy, different behavior per role
CREATE POLICY "read access"
  ON todos FOR SELECT
  USING (
    auth.role() = 'authenticated' AND user_id = auth.uid()
    OR
    auth.role() = 'anon' AND is_public = true
  );
```

---

## `auth.jwt()`

Returns the full decoded JWT payload as `JSONB`.

```sql
auth.jwt() → jsonb
```

```sql
-- Example JWT payload:
{
  "sub": "user-uuid",
  "role": "authenticated",
  "email": "user@example.com",
  "app_metadata": { "role": "admin" },
  "user_metadata": { "plan": "pro" }
}
```

Use this to read custom claims that `auth.uid()` and `auth.role()` don't expose.

```sql
-- Check a custom app_metadata claim
CREATE POLICY "admins can read all todos"
  ON todos FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR
    user_id = auth.uid()
  );
```

### `app_metadata` vs `user_metadata`

| Field | Set by | Trusted? | Use case |
|-------|--------|----------|----------|
| `app_metadata` | Server / Supabase admin | Yes | Roles, plan, permissions |
| `user_metadata` | User themselves | No | Display name, preferences |

> Never use `user_metadata` for authorization decisions — users can write to it themselves.

---

## Reading Custom Claims

Custom claims are added to the JWT via a Postgres function hook (`custom_access_token_hook`) or via Supabase's auth hooks. Once added, they live in `app_metadata` or at the top level of the JWT.

```sql
-- Top-level custom claim
auth.jwt() ->> 'org_id'

-- Nested in app_metadata
auth.jwt() -> 'app_metadata' ->> 'plan'
```

Example policy using a custom `org_id` claim:

```sql
CREATE POLICY "org members see org todos"
  ON todos FOR SELECT
  TO authenticated
  USING (
    org_id = (auth.jwt() ->> 'org_id')::uuid
  );
```

---

## `request.jwt.claims` Directly

If you ever need to read the raw session config (e.g., outside of a policy expression):

```sql
SELECT current_setting('request.jwt.claims', true)::jsonb;
```

The `true` argument means "return NULL if missing" instead of raising an error. The auth helper functions call this internally.

---

## Performance Note

`auth.uid()` and `auth.jwt()` are called once per query, not once per row. PostgreSQL caches the result for the duration of the statement. No performance concern using them in policies.

---

## Summary

| Function | Returns | Common use |
|----------|---------|------------|
| `auth.uid()` | `uuid` | Owner checks (`user_id = auth.uid()`) |
| `auth.role()` | `text` | Role-branching inside a single policy |
| `auth.jwt()` | `jsonb` | Custom claims (`app_metadata`, `org_id`, etc.) |

**Next:** [04 — Common Patterns](./04_common-patterns.md) — real-world policy patterns you'll use in almost every Supabase project.
