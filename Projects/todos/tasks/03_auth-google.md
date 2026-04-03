# Task 03 — Enable Google OAuth & Replace Hardcoded User

## Objective

Make Google OAuth fully functional with the local Supabase stack. Replace all hardcoded `USER_ID` constants with the real authenticated user from `getUser()`. After this task, the app requires a real Google sign-in, and all data belongs to the logged-in user.

## Current State

- Auth infrastructure built (Chapter 04 course): clients, callback, login page, middleware, logout
- Dashboard CRUD fully working (Task 02): todos, categories, tags
- All server actions use hardcoded `USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"`
- Google provider **not enabled** in `config.toml`
- Middleware auth redirect **commented out**
- Login page exists but is unstyled
- Queries do not filter by `user_id`

## Not in Scope

- RLS policies (Chapter 05)
- Magic Link auth
- Production deployment

---

## Steps

### Phase A — Google Cloud Console *(user)*

> **Learning goal:** Understand OAuth credential creation and redirect URI configuration.

- [x] **A1.** Open [Google Cloud Console](https://console.cloud.google.com), create or open your OAuth 2.0 Client ID

- [x] **A2.** In **Authorized redirect URIs**, ensure both URIs are present:
  ```
  http://127.0.0.1:54321/auth/v1/callback       ← local Supabase
  https://<your-ref>.supabase.co/auth/v1/callback  ← production Supabase
  ```
  > Why `127.0.0.1` not `localhost`? Google treats them as different origins. Supabase CLI binds to `127.0.0.1`.

- [x] **A3.** Copy the **Client ID** and **Client Secret**

---

### Phase B — Supabase Local Config *(user)*

> **Learning goal:** How `config.toml` + `env()` + `supabase/.env` configure auth providers locally without committing secrets.

- [x] **B1.** Create `supabase/.env` with your Google credentials:
  ```env
  GOOGLE_CLIENT_ID=123456-xxxxx.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
  ```

- [x] **B2.** Verify `.gitignore` covers `supabase/.env` (`.env*` on line 34 already matches)

- [x] **B3.** Fix `config.toml` line 152 — `additional_redirect_urls`:
  ```diff
  - additional_redirect_urls = ["https://127.0.0.1:3000"]
  + additional_redirect_urls = ["http://localhost:3000/auth/callback"]
  ```

- [x] **B4.** Add `[auth.external.google]` to `config.toml` (after the `[auth.external.apple]` block):
  ```toml
  [auth.external.google]
  enabled = true
  client_id = "env(GOOGLE_CLIENT_ID)"
  secret = "env(GOOGLE_CLIENT_SECRET)"
  redirect_uri = ""
  url = ""
  skip_nonce_check = true
  ```
  > `skip_nonce_check = true` is required locally — the auth server doesn't use HTTPS, which breaks OpenID Connect nonce verification.

- [x] **B5.** Restart the local stack:
  ```bash
  supabase stop && supabase start
  ```

- [x] **B6.** Verify in Studio (`http://127.0.0.1:54323`) → Authentication → Providers → Google enabled

---

### Phase C — Enable Middleware Redirect *(user)*

> **Learning goal:** How middleware protects routes by checking the session and redirecting unauthenticated users.

- [x] **C1.** Uncomment lines 38–46 in `lib/supabase/clients/middleware.ts`:
  ```typescript
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  ```

- [x] **C2.** Test: incognito → `localhost:3000/dashboard` → should redirect to `/login`

---

### Phase D — Replace Hardcoded USER_ID *(user)*

> **Learning goal:** Use `getUser()` in server actions and queries to scope data to the authenticated user. This is app-level security; database-level enforcement (RLS) comes in Chapter 05.

#### D1. Update action files

Same pattern for each of the 3 files:

1. Remove `const USER_ID = "aaaaaaaa-..."` line
2. Add `import { getUser } from "@/lib/supabase/auth/queries"`
3. In the `add*()` function, add auth guard:
   ```typescript
   const user = await getUser()
   if (!user) return fail("Not authenticated")
   ```
4. Replace `user_id: USER_ID` with `user_id: user.id`

**Files:**

- [x] `lib/supabase/todos/actions.ts` — `addTodo()` (line 55)
- [x] `lib/supabase/categories/actions.ts` — `addCategory()` (line 19)
- [x] `lib/supabase/tags/actions.ts` — `addTag()` (line 18)

#### D2. Update query files

Same pattern for each: import `getUser`, call it, add `.eq("user_id", user.id)` filter.

- [x] `lib/supabase/todos/queries.ts` — `getTodosWithRelations()` and `getTodoById()`
- [x] `lib/supabase/categories/queries.ts` — `getCategories()` and `getCategoriesWithTodoCount()`
- [x] `lib/supabase/tags/queries.ts` — `getTags()` and `getTagsWithTodoCount()`

---

### Phase E — Restyle Login Page *(Claude generates)*

> **Learning goal:** Building a polished auth page with shadcn/ui that matches the dashboard aesthetic.

- [x] **E1.** Redesign `app/login/page.tsx` — centered card, app branding, Google sign-in button with shadcn/ui

---

### Phase F — Fix .env.prod Key Name *(user)*

> **Learning goal:** Environment variable names must match exactly what the code reads.

- [x] **F1.** In `.env.prod`: rename `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Phase G — End-to-End Test *(user)*

- [x] **G1.** Incognito → `localhost:3000` → redirected to `/login`
- [x] **G2.** Click "Sign in with Google" → Google login → redirected to `/dashboard`
- [x] **G3.** Sidebar shows your Google email
- [x] **G4.** Create a todo, category, and tag — all succeed
- [x] **G5.** Studio: new records have your Google UUID, not `aaaaaaaa-...`
- [x] **G6.** Logout → redirected to `/login`
- [x] **G7.** Navigate to `/dashboard` → redirected to `/login`

---

## Division of Work

| Who | What |
|-----|------|
| **User** | Phases A, B, C, D, F, G |
| **Claude** | Phase E (login page redesign) |

---

## Seed Data Note

After auth, seeded data (`user_id = aaaaaaaa-...`) won't appear for the Google user — each user only sees their own data. The dashboard will be empty on first login; create new data to test.

---

## Done Criteria

- [x] Google provider enabled in `config.toml` with `env()` secrets
- [x] `supabase/.env` created (not committed to git)
- [x] Middleware redirects unauthenticated users to `/login`
- [x] All 3 action files use `getUser()` instead of hardcoded `USER_ID`
- [x] All query files filter by authenticated user's `user_id`
- [x] Login page restyled with shadcn/ui
- [x] `.env.prod` key name fixed
- [x] Full OAuth flow works: login → dashboard → create data → logout → redirect

---

## What's Next

**Chapter 05 — Row Level Security (RLS):** Database-level policies so PostgreSQL itself enforces that users can only access their own data.
