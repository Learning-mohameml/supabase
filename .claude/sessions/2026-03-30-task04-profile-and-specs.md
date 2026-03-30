# 2026-03-30 — Task 04: Profile Management + Task 05 & 06 Specs

## What was done

### Task 04 — User Profile Management (Phases C & D complete, A & B reviewed)

**Phase C — Profile page UI (Claude generated):**
- `app/dashboard/profile/page.tsx` — Server Component, fetches user via `getUser()`, extracts metadata
- `components/profile/profile-view.tsx` — displays avatar, email, display name, provider, member since
- `components/profile/edit-profile-dialog.tsx` — dialog with display name input
- `components/profile/delete-account-dialog.tsx` — confirmation dialog (type "delete my account"), calls signOut + redirect

**Phase D — Sidebar updates (Claude generated):**
- Added `Profile` nav item with `UserCircle` icon to `app-sidebar.tsx`
- Updated `AppSidebar` props to accept `displayName`
- Updated `app/dashboard/layout.tsx` to pass `displayName` from `user_metadata`

**Phases A & B — User implemented, Claude reviewed:**
- A: Added `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- B: Created `lib/supabase/auth/actions.ts` with:
  - `updateProfile()` — calls `supabase.auth.updateUser({ data: { display_name } })`, revalidates paths
  - `deleteAccount()` — cascading deletion (todo_tags via todo IDs → todos → categories → tags → admin deleteUser)
- Created `lib/supabase/clients/admin.ts` — admin client factory with service role key, browser guard, typed with Database
- Added `UpdateProfileInput` to `types/helpers.ts`
- **Review verdict:** Clean implementation, no changes needed

### Task 05 — Avatar Upload spec (written, not implemented)

Created `tasks/05_avatar-upload.md`:
- Phase A: Create `avatars` storage bucket via migration (public, 2MB, image MIME types)
- Phase B: Storage RLS policies on `storage.objects` using `storage.foldername(name)`
- Phase C: `lib/supabase/storage/avatars.ts` with `uploadAvatar()` / `deleteAvatar()` (browser-side)
- Phase D: Avatar upload UI component (Claude generates)
- Phase E: Testing

### Task 06 — Error Handling spec (written, not implemented)

Created `tasks/06_error-handling.md` after auditing all error patterns:
- **Problem:** All server actions pass raw `error.message` to `fail()` → Supabase errors like constraint violations shown in toasts
- Phase A: Create `lib/errors.ts` with `toUserMessage()` (maps Supabase error codes to friendly messages) and `logError()` (server-side logging)
- Phase B: Update all action files to use translation layer + top-level try/catch
- Phase C: Update all query files to log + translate before throwing
- Phase D: Improve dashboard error boundary, add global `app/error.tsx` and `app/not-found.tsx`
- Phase E: OAuth error handling in `signInWithGoogle()`

## Key discussions

- **`display_name` vs `full_name`**: `updateUser({ data: { display_name } })` writes to a different field than Google's `full_name`. Supabase Studio shows `full_name` in the user list, so the update appears missing — but it's saved in `raw_user_meta_data.display_name`
- **Admin-only user deletion**: `supabase.auth.admin.deleteUser()` requires service role key. No client-side self-deletion API exists in Supabase — must go through a server action with admin privileges
- **Avatar upload architecture**: Client-side upload via browser Supabase client (RLS enforces ownership), `upsert: true` to overwrite, cache-buster `?t=timestamp` on public URL

## Files created/modified

| File | Status |
|------|--------|
| `app/dashboard/profile/page.tsx` | Created (previous session) |
| `components/profile/profile-view.tsx` | Created (previous session) |
| `components/profile/edit-profile-dialog.tsx` | Created (previous session) |
| `components/profile/delete-account-dialog.tsx` | Created (previous session) |
| `components/layout/app-sidebar.tsx` | Modified (previous session) |
| `app/dashboard/layout.tsx` | Modified (previous session) |
| `lib/supabase/auth/actions.ts` | Created by user, reviewed |
| `lib/supabase/clients/admin.ts` | Created by user, reviewed |
| `types/helpers.ts` | Modified by user (added `UpdateProfileInput`) |
| `tasks/05_avatar-upload.md` | Created — spec only |
| `tasks/06_error-handling.md` | Created — spec only |

## Pending

- Task 04 Phase E: end-to-end testing of profile features
- Task 05: Avatar upload (implement when ready)
- Task 06: Error handling (implement when ready)
