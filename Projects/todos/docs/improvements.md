# Improvements

Tracked improvements — non-blocking enhancements to implement when ready.

---

## [IMP-001] Cascade-delete user data via FK constraint

**Status:** Done
**Related fix:** `deleteAccount` in `lib/supabase/auth/actions.ts`
**Spec:** [`docs/fix-delete-account.md`](./fix-delete-account.md)

### Context

`deleteAccount` used `auth.admin.deleteUser()` which broke when Supabase CLI v2.75.0 switched GoTrue to asymmetric key signing (HS256 rejected). The old code also manually deleted data one table at a time — fragile and prone to partial failures.

### What changed

1. **Migration: CASCADE FKs** — `user_id` columns in `todos`, `categories`, `tags` now reference `auth.users(id) ON DELETE CASCADE`
2. **Migration: `delete_user()` function** — `SECURITY DEFINER` function that deletes `auth.users` row via `auth.uid()`. No admin client needed.
3. **Simplified `deleteAccount`** — single `supabase.rpc("delete_user")` call replaces ~60 lines of manual deletion
4. **Removed `lib/supabase/clients/admin.ts`** — zero consumers remain
5. **Removed `SUPABASE_SERVICE_ROLE_KEY`** from `.env.local`
