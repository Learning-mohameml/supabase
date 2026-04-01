# 05 — Testing Policies

Testing RLS policies means verifying that:

1. Allowed access works (users can read/write what they should)
2. Denied access fails (users cannot read/write what they shouldn't)

---

## Method 1 — `SET LOCAL role` in a Transaction

Simulate a specific PostgreSQL role without a real JWT. Useful for quick manual checks in `psql` or Supabase SQL editor.

```sql
BEGIN;

-- Impersonate the 'authenticated' role
SET LOCAL role = 'authenticated';

-- Inject a fake JWT claims payload
SELECT set_config('request.jwt.claims', '{"sub": "user-uuid-here", "role": "authenticated"}', true);

-- Now run your query — RLS policies will evaluate as this user
SELECT * FROM todos;

ROLLBACK; -- always rollback so you don't leave the role set
```

> `set_config(key, value, is_local)` — `true` means the setting is scoped to the current transaction.

---

## Method 2 — Testing Multiple Users

Check that user A cannot see user B's rows.

```sql
-- Setup: assume todos has rows for two users
-- user_a_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- user_b_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

BEGIN;
SET LOCAL role = 'authenticated';
SELECT set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}', true);

-- Should only return user A's todos
SELECT id, title, user_id FROM todos;

ROLLBACK;
```

Run again with user B's UUID — you should see only their rows.

---

## Method 3 — Testing Anon Access

```sql
BEGIN;
SET LOCAL role = 'anon';
SELECT set_config('request.jwt.claims', '{}', true);

-- Should return nothing if no public policy exists
-- Should return public rows if a public policy exists
SELECT * FROM todos;

ROLLBACK;
```

---

## Method 4 — Testing INSERT / UPDATE Restrictions

```sql
-- Test that a user cannot insert a row for another user
BEGIN;
SET LOCAL role = 'authenticated';
SELECT set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}', true);

-- This should FAIL if WITH CHECK (user_id = auth.uid()) is in place
INSERT INTO todos (title, user_id)
VALUES ('hacked todo', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

ROLLBACK;
```

Expected: `ERROR: new row violates row-level security policy for table "todos"`

---

## Method 5 — `EXPLAIN` to Verify Policy Application

`EXPLAIN` shows you whether PostgreSQL is applying your RLS filter. Look for the policy predicate in the output.

```sql
BEGIN;
SET LOCAL role = 'authenticated';
SELECT set_config('request.jwt.claims', '{"sub": "user-uuid", "role": "authenticated"}', true);

EXPLAIN SELECT * FROM todos;

ROLLBACK;
```

Look for a `Filter` or `Index Cond` line containing your policy expression (e.g., `user_id = 'user-uuid'`). If you don't see it, the policy may not be applied.

---

## Method 6 — `pg_policies` Sanity Check

Before testing behavior, verify your policies are actually defined:

```sql
SELECT
  policyname,
  cmd,
  roles,
  qual        AS using_expr,
  with_check  AS check_expr
FROM pg_policies
WHERE tablename = 'todos'
ORDER BY cmd;
```

---

## Method 7 — Integration Tests with Supabase Client

For automated testing, use the JS client with a real user session. This tests the full stack: JWT → PostgREST → RLS.

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sign in as a test user
await supabase.auth.signInWithPassword({ email: 'test@example.com', password: 'password' })

// Should only return this user's todos
const { data, error } = await supabase.from('todos').select('*')
console.assert(data?.every(t => t.user_id === TEST_USER_ID))

// Should fail — trying to insert a row for another user
const { error: insertError } = await supabase
  .from('todos')
  .insert({ title: 'hack', user_id: OTHER_USER_ID })
console.assert(insertError !== null)
```

---

## Common Debugging Tips

| Symptom | Likely cause | Check |
|---------|-------------|-------|
| Getting zero rows when you expect some | No matching policy or wrong role | `pg_policies`, check `TO` clause |
| Getting all rows when you expect filtered | RLS not enabled on the table | `SELECT rowsecurity FROM pg_tables WHERE tablename = 'todos'` |
| INSERT succeeds when it should fail | Missing `WITH CHECK` on INSERT policy | Add `WITH CHECK` |
| UPDATE lets user change `user_id` | Missing `WITH CHECK` on UPDATE policy | Add `WITH CHECK (user_id = auth.uid())` |
| `auth.uid()` returns NULL in test | JWT claims not set | `set_config('request.jwt.claims', ...)` |

---

## Summary

| Method | Best for |
|--------|----------|
| `SET LOCAL role` + `set_config` | Quick manual checks in SQL editor |
| Multiple user transactions | Isolation between users |
| `EXPLAIN` | Verifying policy is being applied by the planner |
| `pg_policies` | Sanity-checking what policies exist |
| JS client integration tests | End-to-end validation of the full auth + RLS stack |
