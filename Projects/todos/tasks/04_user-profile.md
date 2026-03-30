# Task 04 — User Profile Management

## Objective

Add a profile page where users can view their Google account info, edit their display name, and delete their account. This teaches `updateUser()`, the admin API with service role key, and cascading data cleanup.

## Current State

- Google OAuth working (Task 03)
- Sidebar shows user email
- No profile page, no user metadata usage, no account deletion

## Not in Scope

- Password change (Google OAuth only), email change, MFA, linked providers

---

## Steps

### Phase A — Add service role key *(user)*

> **Learning goal:** Understand the difference between anon key (public, RLS-scoped) and service role key (private, bypasses RLS). The admin API needs the service role key.

- [x] **A1.** Get the service role key:
  ```bash
  supabase status
  ```
  Look for `service_role key`.

- [x] **A2.** Add to `.env.local` (server-only, no `NEXT_PUBLIC_` prefix):
  ```env
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
  ```

---

### Phase B — Auth actions *(user implements, Claude reviews)*

> **Learning goal:** Use `supabase.auth.updateUser()` to modify user metadata, and `supabase.auth.admin.deleteUser()` with the service role key for account deletion.

- [x] **B1.** Create `lib/supabase/auth/actions.ts` with two server actions:

  **`updateProfile(data)`** — updates the user's display name:
  - Call `supabase.auth.updateUser({ data: { display_name: data.display_name } })`
  - `revalidatePath("/dashboard")`

  **`deleteAccount()`** — deletes all user data then the auth user:
  - Get current user via `getUser()`
  - Delete from `todo_tags` (join table, delete first to avoid FK issues)
  - Delete from `todos`, `categories`, `tags` where `user_id = user.id`
  - Create an admin client: `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` from `@supabase/supabase-js`
  - Call `adminClient.auth.admin.deleteUser(user.id)`

- [x] **B2.** Add `UpdateProfileInput` type to `types/helpers.ts`:
  ```typescript
  export type UpdateProfileInput = {
    display_name: string
  }
  ```

**Hints:**
- Use `"use server"` directive
- Use `ok()` / `fail()` from `types/actions.ts`
- For the admin client, import `createClient` from `@supabase/supabase-js` (not `@supabase/ssr`)
- `todo_tags` doesn't have `user_id` — delete via: todos owned by user → their todo_tags

---

### Phase C — Profile page UI *(Claude generates)*

- [ ] **C1.** `app/dashboard/profile/page.tsx` — Server Component shell
- [ ] **C2.** `components/profile/profile-view.tsx` — avatar, email, display name, provider, member since
- [ ] **C3.** `components/profile/edit-profile-dialog.tsx` — edit display name
- [ ] **C4.** `components/profile/delete-account-dialog.tsx` — confirmation + delete

---

### Phase D — Sidebar update *(Claude generates)*

- [ ] **D1.** Add "Profile" nav item to sidebar
- [ ] **D2.** Show display name + email in sidebar footer

---

### Phase E — Test *(user)*

- [x] **E1.** Profile page shows Google avatar, email, provider
- [x] **E2.** Edit display name → persists after refresh
- [x] **E3.** Sidebar shows updated display name
- [ ] **E4.** Delete account → all data removed, redirected to `/login`

---

## Division of Work

| Who | What |
|-----|------|
| **User** | Phases A, B, E |
| **Claude** | Phases C, D |

---

## Key Supabase APIs

| API | What it does | Key needed |
|-----|-------------|------------|
| `supabase.auth.updateUser({ data })` | Update user metadata | anon key (current user) |
| `supabase.auth.admin.deleteUser(id)` | Delete a user | service role key |
| `user.user_metadata.avatar_url` | Google profile picture URL | — |
| `user.user_metadata.full_name` | Google display name | — |
| `user.app_metadata.provider` | Auth provider ("google") | — |

---

## Done Criteria

- [x] Service role key in `.env.local` (not `NEXT_PUBLIC_`)
- [x] `updateProfile()` and `deleteAccount()` server actions working
- [x] Profile page shows Google info (avatar, email, name, provider, member since)
- [x] Edit display name persists
- [ ] Delete account removes all user data + auth user
- [x] Profile link in sidebar navigation
