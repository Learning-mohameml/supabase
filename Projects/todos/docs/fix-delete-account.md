# Fix: Delete Account — SECURITY DEFINER + CASCADE FKs

## Problem

`deleteAccount()` fails with:
> invalid JWT: signing method HS256 is invalid

**Root cause**: Supabase CLI v2.75.0 switched GoTrue to asymmetric key signing. The HS256 JWT service role key is rejected by GoTrue's admin endpoint. `auth.admin.deleteUser()` is broken in this CLI/library version combination.

**Secondary issue**: The old code deleted user data (todos, tags, categories) **before** deleting the auth user. If auth deletion failed, data was lost but the account remained.

## Solution

Replace the admin client approach with a PostgreSQL `SECURITY DEFINER` function + `ON DELETE CASCADE` foreign keys.

### Before (broken)

```
deleteAccount()
  → adminClient.auth.admin.deleteUser()     ← HS256 rejected
  → adminClient.from("todo_tags").delete()
  → adminClient.from("todos").delete()
  → adminClient.from("categories").delete()
  → adminClient.from("tags").delete()
```

5+ sequential API calls, fragile, partial failure risk.

### After (fixed)

```
deleteAccount()
  → supabase.rpc("delete_user")
      → SECURITY DEFINER function (runs as postgres)
      → DELETE FROM auth.users WHERE id = auth.uid()
      → ON DELETE CASCADE cleans up todos, categories, tags automatically
```

Single atomic database operation.

## Migrations (user implements)

### Migration 1: `add_user_id_fk_cascade`

Adds `ON DELETE CASCADE` FK constraints from `user_id` columns to `auth.users(id)`.

```sql
ALTER TABLE categories
  ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE todos
  ADD CONSTRAINT todos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tags
  ADD CONSTRAINT tags_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Note**: `todo_tags` already cascades from `todos(id)` and `tags(id)`, so deleting todos/tags automatically removes their tag assignments.

### Migration 2: `create_delete_user_function`

```sql
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM auth.users WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
```

**Security properties**:
- `SECURITY DEFINER` — runs as `postgres` (function owner), which can access `auth.users`
- `auth.uid()` — extracts user ID from the request JWT; users can only delete themselves
- `SET search_path = ''` — prevents search-path hijacking (Supabase best practice)
- `REVOKE/GRANT` — only `authenticated` role can call; `anon` cannot

## Code Changes (Claude implements)

### `lib/supabase/auth/actions.ts`

- Remove `createAdminClient` import
- Replace 60-line `deleteAccount` body with single `.rpc("delete_user")` call
- Remove `revalidatePath("/dashboard")` — user no longer exists after deletion

### `lib/supabase/clients/admin.ts`

- Delete entirely — zero consumers remain

### `.env.local`

- Remove `SUPABASE_SERVICE_ROLE_KEY` — no code references it

## Seed Data Impact

Current `seed.sql` uses fake UUID `aaaaaaaa-0000-0000-0000-000000000001` not in `auth.users`. After the CASCADE FK migration, `supabase db reset` will fail at seeding. Options:
- Comment out seed data temporarily
- Update seed to work without fake user_ids

## Verification

1. `supabase db reset` — migrations apply without error
2. Login with Google, create todos/categories/tags
3. Profile → Delete Account → type "delete my account" → confirm
4. Verify: redirected to `/login`, cannot log back into deleted account
5. Check Studio: no orphaned rows in todos/categories/tags tables
