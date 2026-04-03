# Guide: Supabase + Next.js Backend Integration

> A step-by-step guide for integrating Supabase (auth, database, storage, realtime) into a Next.js App Router project. Written to be reusable across SaaS projects.

---

## Step 01: Project Setup & Configuration

### 1.1 Initialize Supabase

```bash
supabase init        # creates supabase/ directory with config.toml
supabase start       # spins up local Supabase stack (Postgres, GoTrue, Kong, Mailpit, Studio)
supabase status      # shows URLs, keys, ports
```

### 1.2 Environment Variables

Create two env files:

- **`.env.local`** (Next.js runtime — git-ignored):
  ```env
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-status>
  ```

- **`supabase/.env`** (Supabase CLI secrets — git-ignored):
  ```env
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```

> **Rule**: Never commit `.env*` files. Add them to `.gitignore`. Use `env(VAR_NAME)` in `config.toml` for Supabase secrets.

### 1.3 Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 1.4 Create Supabase Clients

Set up two client factories in `lib/supabase/clients/`:

| File | Client | Used In | Key Detail |
|------|--------|---------|------------|
| `server.ts` | `createServerClient()` | Server Components, Server Actions, Route Handlers | Uses `cookies()` from `next/headers` to read/write auth tokens |
| `client.ts` | `createBrowserClient()` | Client Components (`"use client"`) | Reads cookies automatically from the browser |

Both clients should be typed with the generated `Database` type (see Step 03).

### 1.5 Set Up Middleware

Middleware runs on every request to refresh the auth session and protect routes.

- **`lib/supabase/clients/middleware.ts`**: Creates a Supabase client, calls `getUser()` (not `getSession()` — `getSession` doesn't validate the JWT), redirects unauthenticated users away from protected routes.

- **`middleware.ts`** (or `proxy.ts` at project root): Re-exports the middleware function with a `config.matcher` that excludes static assets (`_next/static`, `_next/image`, `favicon.ico`).

> **Security**: Always use `getUser()` in middleware. `getSession()` reads the JWT without server-side validation — it can be spoofed.

---

## Step 02: Authentication

### 2.1 OAuth (Google)

**Google Cloud Console**:
1. Create a new project (or use existing)
2. Configure OAuth consent screen
3. Create OAuth 2.0 credentials with redirect URIs:
   - Local: `http://127.0.0.1:54321/auth/v1/callback`
   - Prod: `https://<your-ref>.supabase.co/auth/v1/callback`

**Supabase `config.toml`**:
```diff
- additional_redirect_urls = ["https://127.0.0.1:3000"]
+ additional_redirect_urls = ["http://127.0.0.1:3000/auth/callback", "http://localhost:3000/auth/callback"]
```

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = ""
url = ""
skip_nonce_check = true   # Required locally (no HTTPS breaks OIDC nonce)
```

> In production, set `skip_nonce_check = false` and configure HTTPS.

**Next.js routes**:
- `app/auth/callback/route.ts` — Exchanges the auth code for a session (PKCE flow)
- `app/auth/auth-code-error/page.tsx` — Error fallback when auth fails

**Auth functions** in `lib/supabase/auth/client.ts` (browser client):
- `signInWithGoogle()` — Redirects to Google OAuth
- `signInWithMagicLink(email)` — Sends a magic link email
- `signOut()` — Clears the session

### 2.2 Magic Link (Email)

- Write an HTML email template in `supabase/templates/magic_link.html`
- Register it in `config.toml`:
  ```toml
  [auth.email.template.magic_link]
  subject = "Your login link"
  content_path = "./supabase/templates/magic_link.html"
  ```
- Test locally with **Inbucket** (Supabase's built-in email server at `http://127.0.0.1:54324`)
- Build the login UI: email input, validation, loading state, "check your email" confirmation, error handling with toast notifications

### 2.3 User Management (Profile)

After auth is working, add a profile system:

- Follow Step 03 to create a `profiles` table (or use `auth.users` metadata)
- `lib/supabase/profile/queries.ts` — Read profile data
- `lib/supabase/profile/actions.ts` — Update display name, avatar, delete account
- For avatar images, use **Supabase Storage** (see Step 06)
- Add a profile page with edit form, avatar upload, and account deletion

> **Account deletion**: Create a `delete_user()` SQL function that runs as `SECURITY DEFINER` and deletes from `auth.users` where `id = auth.uid()`. Use `ON DELETE CASCADE` on all foreign keys so user data is cleaned up automatically.

---

## Step 03: Database Schema

### 3.1 Design

Before writing SQL:
1. **Model your entities**: tables, columns, types, constraints
2. **Map relationships**: 1-N (foreign keys), N-N (junction tables)
3. **Plan indexes**: on foreign keys, frequently filtered/sorted columns
4. **Plan functions & triggers**: `updated_at` auto-refresh, computed fields, etc.
5. **Plan RLS policies**: who can SELECT/INSERT/UPDATE/DELETE each table

### 3.2 Migrations

Write separate migrations for each concern (one migration per logical change):

```bash
supabase migration new create_tables
supabase migration new create_indexes
supabase migration new create_triggers
supabase migration new add_rls_policies
```

**Migration best practices**:
- Each migration is a single `.sql` file in `supabase/migrations/`
- Migrations run in filename order (timestamped)
- Always use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Enable RLS on every table: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Add `ON DELETE CASCADE` on foreign keys to `auth.users` so user deletion is clean
- Test with `supabase db reset` (runs all migrations + seed)

### 3.3 RLS (Row-Level Security)

> **This is the most critical security layer.** Without RLS, any user with the anon key can read/write any row.

For every table:
```sql
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rows
CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert for themselves
CREATE POLICY "Users can insert own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Same for UPDATE and DELETE
```

For junction tables (N-N), the policy must verify ownership of **both** related entities.

> **Rule**: RLS is your security boundary, not application code. Every table must have RLS enabled and policies defined. Test them with pgTAP (see Step 05).

### 3.4 Seed Data

Write `supabase/seed.sql` for local development:
- Create test users in `auth.users` (with fixed UUIDs for predictable testing)
- Insert sample data across all tables
- Use at least 2 users to test RLS isolation (e.g., Alice and Bob should never see each other's data)

```bash
supabase db reset   # runs migrations + seed from scratch
```

### 3.5 Type Generation

```bash
mkdir -p types
supabase gen types typescript --local > types/database.types.ts
```

- Create `types/helpers.ts` with extracted domain types (e.g., `Todo`, `Category`, `TodoWithRelations`)
- Wire the `Database` generic into both Supabase client files
- Add a script to `package.json`: `"gen:types": "supabase gen types typescript --local > types/database.types.ts"`
- Regenerate types after every migration: `npm run gen:types`

### 3.6 Data Access Layer

Organize per resource in `lib/supabase/[resource]/`:

| File | Purpose | Used In |
|------|---------|---------|
| `queries.ts` | Read-only functions (can be called directly in Server Components) | Server Components, Route Handlers |
| `actions.ts` | Mutations with `"use server"` directive (called from Client Components via forms/buttons) | Client Components, form actions |

**Pattern for `actions.ts`**:
- Every function is a Server Action (`"use server"`)
- Returns `ActionResult<T>` (see Step 04) — never throws
- Calls `revalidatePath()` or `revalidateTag()` after mutations

**Pattern for `queries.ts`**:
- Pure async functions (no `"use server"` needed — they run on the server by default in RSC)
- Throw on error (error boundaries catch them), or return `null` and call `notFound()`

### 3.7 Database Tests (pgTAP)

Write tests in `supabase/tests/` using the pgTAP framework:

```
supabase/tests/
  database/schema.test.sql    # table existence, columns, constraints, FKs
  functions/functions.test.sql # triggers, custom functions, cascades
  rls/rls.test.sql            # policy isolation between users
```

Run with: `supabase test db`

> **What to test with pgTAP**: schema structure, RLS isolation (user A can't see user B's data), anonymous access is blocked, cascade deletes work, triggers fire correctly.

---

## Step 04: Error Handling

### 4.1 Result Type Pattern

In `types/actions.ts`, define a discriminated union for Server Action returns:

```ts
export type ActionResult<T = void> =
  | { data: T; error: null }
  | { data: null; error: string }

export function ok(): ActionResult<void>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | void> {
  return { data: data as T, error: null }
}

export function fail(error: string): ActionResult<never> {
  return { data: null, error }
}
```

Use `ok()` / `fail()` in every Server Action instead of throwing — the caller gets a typed result it can check.

### 4.2 Error Translation

In `lib/errors.ts`, map raw Supabase/Postgres errors to user-friendly messages:

```ts
export function toUserMessage(error: unknown): string {
  // Postgres error codes
  // 23505 -> "This name already exists"
  // 42501 -> "You don't have permission"
  // 23503 -> "This item is linked to other data"
  // PGRST116 -> "Item not found"
  // JWT expired -> "Session expired, please log in again"
  // Network errors -> "Connection error, please try again"
  // Default -> "Something went wrong"
}
```

### 4.3 Error Handling Wrapper

Instead of try/catch in every action, wrap them:

```ts
export function withErrorHandling<T>(
  name: string,
  fn: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  // try { return await fn() }
  // catch (e) { logError(name, e); return fail(toUserMessage(e)) }
}
```

### 4.4 Error Boundaries & Not Found

- `app/error.tsx` — Global error boundary (catches unhandled errors in any route)
- `app/not-found.tsx` — Global 404 page
- `app/dashboard/error.tsx` — Scoped error boundary for the protected area
- `app/dashboard/[resource]/[id]/not-found.tsx` — Per-resource 404 (call `notFound()` from the page when the item doesn't exist)

### 4.5 Client-Side Error Feedback

- Use toast notifications (e.g., `sonner`) to show action results to the user
- Pattern: call the Server Action, check `result.error`, show toast accordingly

---

## Step 05: Testing & CI/CD

### 5.1 Test Structure

```
tests/
  unit/           # Fast, isolated tests (mocked Supabase) — Vitest
  integration/    # Tests hitting real local Supabase — Vitest
  e2e/            # Full browser tests — Playwright

supabase/tests/   # Database-level tests — pgTAP
```

### 5.2 Unit Tests (Vitest)

- Mock the Supabase client to test business logic in isolation
- Test `queries.ts` and `actions.ts` functions
- Test error handling paths (what happens when Supabase returns an error?)

Config: `vitest.config.mts` with path aliases matching `tsconfig.json`

### 5.3 E2E Tests (Playwright)

**Prerequisites**: Local Supabase running + Next.js dev server

- Test real user flows: sign up, create/update/delete resources, sign out
- Use the magic link flow for auth (parse the link from Inbucket/Mailpit API)
- Clean up test data in `afterEach` via direct SQL (`psql`) — no admin API, no sensitive env vars in tests

**Key patterns**:
- `tests/e2e/utils/auth.ts` — Helper to complete the magic link login flow
- `tests/e2e/utils/admin.ts` — Test cleanup via `psql` (direct DB connection, local only)
- Use unique identifiers per test (e.g., `Date.now()` in titles) to avoid collisions
- After mutations, wait for UI confirmation (toasts, page navigation) before asserting — Next.js `revalidatePath()` is async

**Config** (`playwright.config.ts`):
- `webServer` block to auto-start `next dev`
- `workers: 1` (sequential) — avoids auth session conflicts
- `retries: 2` in CI for flaky network issues
- Screenshots & traces on failure for debugging

### 5.4 Database Tests (pgTAP)

See Step 03.7. Run with: `npm run test:db`

### 5.5 Package.json Scripts

```json
{
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:unit": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "npx playwright test",
  "test:db": "supabase test db",
  "test:all": "npm run lint && npm run typecheck && npm run test:unit && npm run test:db"
}
```

### 5.6 CI/CD (GitHub Actions)

Create `.github/workflows/ci.yml` at the **repository root** (not inside the project folder):

```yaml
name: CI

on:
  push:
    branches: [main]
    paths: [Projects/todos/**]   # scope to your project
  pull_request:
    branches: [main]
    paths: [Projects/todos/**]

defaults:
  run:
    working-directory: Projects/todos

jobs:
  ci:
    runs-on: ubuntu-latest
    env:
      GOOGLE_CLIENT_ID: ci-placeholder       # dummy — not exercised in tests
      GOOGLE_CLIENT_SECRET: ci-placeholder

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: Projects/todos/package-lock.json
      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: npm ci

      # ── Static checks (no infra needed) ──────────────
      - run: npm run lint
      - run: npm run typecheck

      # ── Start Supabase (runs migrations + seed) ──────
      - run: supabase start

      - name: Generate .env.local from Supabase
        run: |
          supabase status -o env 2>/dev/null \
            | sed -n 's/^API_URL=/NEXT_PUBLIC_SUPABASE_URL=/p; s/^ANON_KEY=/NEXT_PUBLIC_SUPABASE_ANON_KEY=/p' \
            | tr -d '"' > .env.local

      # ── Tests ────────────────────────────────────────
      - run: npm run test:unit
      - run: npm run test:db

      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: Projects/todos/test-results/
          retention-days: 7
```

**Key points**:
- `supabase start` in CI spins up the full local stack (Postgres, GoTrue, Kong) via Docker
- `.env.local` is auto-generated from `supabase status` — no secrets needed
- Dummy OAuth credentials are fine because OAuth is never tested in CI (only magic link)
- Playwright report is uploaded as an artifact on failure for debugging

---

## Step 06: Storage (File Uploads)

### 6.1 Create a Storage Bucket

In a migration:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

Or via Supabase Studio (local: `http://127.0.0.1:54323`).

### 6.2 Storage RLS Policies

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can update/delete their own files
CREATE POLICY "Users can manage own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 6.3 Upload from the Client

```ts
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(`${userId}/avatar.png`, file, { upsert: true })
```

- Organize files by `user_id/filename` so RLS policies work with `storage.foldername()`
- Use `upsert: true` to overwrite existing files
- Get the public URL: `supabase.storage.from("avatars").getPublicUrl(path)`

---

## Step 07: Realtime (Optional)

If your app needs live updates (e.g., collaborative features, notifications):

### 7.1 Enable Realtime on a Table

In a migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
```

### 7.2 Subscribe from a Client Component

```ts
"use client"

useEffect(() => {
  const channel = supabase
    .channel("todos")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "todos",
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      // Handle INSERT, UPDATE, DELETE
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

> **Note**: Realtime respects RLS — users only receive changes for rows they can SELECT.

---

## Step 08: Edge Functions (Optional)

For server-side logic that doesn't fit in Next.js (webhooks, cron jobs, third-party integrations):

```bash
supabase functions new my-function
# creates supabase/functions/my-function/index.ts
```

- Written in Deno/TypeScript
- Deployed to Supabase's edge network
- Access the Supabase client with the service role key for admin operations
- Test locally: `supabase functions serve`

---

## Step 09: Production Deployment

### 9.1 Supabase Project (Remote)

1. Create a new project on [supabase.com](https://supabase.com)
2. Link your local project: `supabase link --project-ref <ref>`
3. Push migrations: `supabase db push`
4. Push edge functions: `supabase functions deploy`
5. Set secrets: `supabase secrets set KEY=value`

### 9.2 Environment Variables (Production)

Set these in your hosting provider (Vercel, Railway, etc.):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
```

> **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the client. Only use it in server-side code or edge functions.

### 9.3 OAuth (Production)

- Update Google Cloud Console redirect URI to: `https://<ref>.supabase.co/auth/v1/callback`
- In Supabase Dashboard > Auth > Providers, enable Google and paste the prod client ID/secret
- Add your production domain to `additional_redirect_urls` in Supabase Dashboard > Auth > URL Configuration

### 9.4 Hosting (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

- Set the environment variables in Vercel's dashboard
- Connect your GitHub repo for automatic deployments on push
- Vercel auto-detects Next.js and configures the build

### 9.5 Custom Domain

- Add your domain in Supabase Dashboard > Settings > Custom Domains (for API)
- Add your domain in Vercel > Domains (for the frontend)
- Update `NEXT_PUBLIC_SUPABASE_URL` to use the custom domain

### 9.6 Production Checklist

Before going live:

- [ ] **RLS enabled on every table** — run `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` and verify each has RLS
- [ ] **No leaked secrets** — `.env*` files are in `.gitignore`, `service_role_key` is never in client code
- [ ] **Auth configuration** — `skip_nonce_check = false` in production, email confirmations enabled if needed
- [ ] **Database backups** — Supabase Pro plan includes automatic backups, or set up `pg_dump` cron
- [ ] **Rate limiting** — Supabase has built-in rate limits; configure additional limits in Kong or your hosting provider if needed
- [ ] **Error monitoring** — Connect Sentry, LogRocket, or similar for production error tracking
- [ ] **DNS & SSL** — Custom domain configured with HTTPS
- [ ] **CI passing** — All tests green before deploying
- [ ] **Migration safety** — Run `supabase db push --dry-run` first to preview changes
- [ ] **Performance** — Check indexes cover your main queries, enable connection pooling (Supavisor) in Supabase Dashboard

---

## Quick Reference: Project Structure

```
your-project/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, theme, Toaster)
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # Global 404
│   ├── login/page.tsx            # Auth page
│   ├── auth/
│   │   ├── callback/route.ts     # OAuth code exchange (PKCE)
│   │   └── auth-code-error/page.tsx
│   └── dashboard/                # Protected routes
│       ├── layout.tsx            # Sidebar + nav
│       ├── error.tsx             # Scoped error boundary
│       ├── page.tsx              # Main view
│       └── [resource]/[id]/
│           ├── page.tsx
│           └── not-found.tsx
├── components/                   # UI components
│   ├── ui/                       # shadcn/ui primitives
│   └── [feature]/                # Feature-specific components
├── lib/
│   ├── supabase/
│   │   ├── clients/
│   │   │   ├── server.ts         # Server client factory
│   │   │   ├── client.ts         # Browser client factory
│   │   │   └── middleware.ts     # Auth middleware
│   │   ├── auth/
│   │   │   ├── client.ts         # signIn*, signOut
│   │   │   └── queries.ts        # getUser()
│   │   └── [resource]/
│   │       ├── queries.ts        # Read functions
│   │       └── actions.ts        # Mutations (Server Actions)
│   ├── errors.ts                 # toUserMessage(), withErrorHandling()
│   └── utils.ts                  # Shared utilities
├── types/
│   ├── database.types.ts         # Auto-generated (supabase gen types)
│   ├── helpers.ts                # Domain types (Todo, Category, etc.)
│   └── actions.ts                # ActionResult<T>, ok(), fail()
├── supabase/
│   ├── config.toml               # Supabase local config
│   ├── seed.sql                  # Dev seed data
│   ├── migrations/               # SQL migrations (timestamped)
│   ├── templates/                # Email templates
│   └── tests/                    # pgTAP database tests
├── tests/
│   ├── unit/                     # Vitest
│   ├── integration/              # Vitest (real Supabase)
│   └── e2e/                      # Playwright
├── middleware.ts                  # Next.js middleware entry
├── playwright.config.ts
├── vitest.config.mts
└── .github/workflows/ci.yml      # CI pipeline
```

---

## Summary: The Flow

```
 1. Setup         supabase init/start, env vars, clients, middleware
 2. Auth          OAuth + Magic Link, callback route, login UI
 3. Database      Design -> Migrations -> RLS -> Seed -> Types -> Data Access Layer -> pgTAP tests
 4. Error         ActionResult pattern, toUserMessage(), error boundaries
 5. Testing       Unit (Vitest) + E2E (Playwright) + DB (pgTAP) + CI (GitHub Actions)
 6. Storage       Buckets, upload RLS, client upload
 7. Realtime      Pub/sub on tables (optional)
 8. Edge Fn       Deno functions for webhooks/cron (optional)
 9. Production    Supabase cloud, hosting, custom domain, security checklist
```
