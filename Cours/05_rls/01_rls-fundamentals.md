# 01 — RLS Fundamentals

## What is Row Level Security?

RLS is a PostgreSQL feature that attaches a **filter predicate** to a table. Every query that touches the table has that predicate automatically appended — `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

You define the predicate as a **policy**. The database engine evaluates it for every row before returning or modifying it.

```sql
-- Conceptually, this SELECT:
SELECT * FROM todos;

-- becomes (with an RLS policy):
SELECT * FROM todos WHERE user_id = auth.uid();
```

The rewrite happens inside the engine. The caller never sees it, and cannot bypass it (unless they connect as a superuser or use the `service_role` key).

---

## Enabling RLS

By default, RLS is **disabled** on every table. A table with RLS disabled is fully accessible to any role with table-level privileges.

```sql
-- Enable RLS on a table
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Disable it (back to no filtering)
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;
```

> In Supabase, the `anon` and `authenticated` roles have `SELECT`, `INSERT`, `UPDATE`, `DELETE` grants on your tables (granted by PostgREST). RLS sits on top of those grants.

---

## Default-Deny Behavior

Once RLS is enabled on a table and **no policies exist**, access is completely denied for non-superuser roles:

```
RLS enabled + no policies = nobody can read or write any row
```

This is the safe default. You explicitly grant access by writing policies.

```sql
-- After this, anon and authenticated users get zero rows:
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- You must now write policies to allow any access
```

### `FORCE ROW LEVEL SECURITY`

By default, the **table owner** (the role that created it) bypasses RLS. In Supabase, the owner is `postgres`, which also bypasses RLS.

To make RLS apply even to the table owner:

```sql
ALTER TABLE todos FORCE ROW LEVEL SECURITY;
```

You rarely need this in Supabase because `postgres`/`service_role` are admin roles. But it's good to know it exists.

---

## How Supabase Sets the Auth Context

Supabase uses PostgREST as the HTTP → SQL bridge. When a request arrives with a JWT (from `supabase.auth.getSession()`), PostgREST:

1. Verifies the JWT signature using your Supabase project secret
2. Sets the PostgreSQL role to `authenticated` (or `anon` if no valid JWT)
3. Loads the JWT claims into the session config:

```sql
-- PostgREST does this before every query:
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "uuid-of-user", "role": "authenticated", ...}';
```

Your RLS policies can then read those claims using Supabase helper functions:

```sql
auth.uid()    -- returns the UUID of the current user (from JWT "sub" claim)
auth.role()   -- returns 'authenticated', 'anon', or 'service_role'
auth.jwt()    -- returns the full JWT payload as JSONB
```

These functions are defined in the `auth` schema, which Supabase creates automatically.

---

## The Two Roles You'll Always Deal With

| Role | When used | Bypasses RLS? |
|------|-----------|---------------|
| `anon` | No valid JWT (unauthenticated requests) | No |
| `authenticated` | Valid JWT present | No |
| `service_role` | Using the service role key (server-only) | **Yes** |

> Never use `service_role` on the client. It ignores all RLS policies.

---

## Checking RLS Status

```sql
-- See RLS status for all tables in public schema
SELECT
  tablename,
  rowsecurity,     -- true = RLS enabled
  forcerowsecurity -- true = applies even to table owner
FROM pg_tables
WHERE schemaname = 'public';
```

---

## Supabase-Specific: `supabase_realtime` Publication

When you enable RLS, Supabase Realtime automatically respects your policies for change subscriptions too. Rows that the user cannot `SELECT` will not be delivered over the WebSocket.

---

## Summary

| Concept | Key point |
|---------|-----------|
| Default state | RLS disabled — no filtering |
| After `ENABLE ROW LEVEL SECURITY` with no policies | All access denied for non-owners |
| Auth context | PostgREST injects JWT claims into session config |
| `auth.uid()` | Returns current user's UUID from JWT |
| `service_role` | Bypasses RLS — server-side only, never browser |

**Next:** [02 — Writing Policies](./02_writing-policies.md) — how to write `CREATE POLICY` statements that control exactly who can do what.
