# 2026-04-02 — Task 06 Error Handling + Task 08 Testing

## What was done

### Task 06 — Error handling (implemented and reviewed)

**Review findings fixed:**
- Auth client was translating errors twice, which downgraded specific friendly messages back to the generic fallback
- Error boundaries were rendering raw `error.message`, which could leak technical/internal text
- Invalid todo route params like malformed UUIDs were hitting the dashboard error boundary instead of the not-found page

**Code changes:**
- `Projects/todos/lib/supabase/auth/client.ts`
  - auth helpers now throw the original Supabase error instead of `new Error(toUserMessage(...))`
- `Projects/todos/app/dashboard/error.tsx`
  - now renders `toUserMessage(error)`
- `Projects/todos/app/error.tsx`
  - now renders `toUserMessage(error)`
- `Projects/todos/app/dashboard/todo/[id]/page.tsx`
  - added UUID validation before querying Supabase
  - malformed IDs now call `notFound()`

**Behavior after fixes:**
- auth/login/logout/delete-account errors preserve specific friendly messages
- runtime/internal errors are not shown raw in boundaries
- both missing todo IDs and malformed todo IDs now show 404 instead of the dashboard error boundary

### Task 08 — Testing strategy spec (written)

Created and refined:
- `Projects/todos/tasks/08-testing.md`

Final testing decisions:
- `tests/unit/` for Vitest
- `tests/e2e/` for Playwright
- `supabase/tests/` for pgTAP
- `lint` and `typecheck` stay separate from `test:*` scripts
- `test:db` only runs `supabase test db`
- `supabase start` remains a separate setup step
- `test:all` aggregates the local suite

Playwright strategy decision:
- Playwright is the main test layer for `app/` and `components/`
- use UI assertions first
- use direct DB assertions only for selected high-value flows
- keep RLS verification in pgTAP, not Playwright

### Phase A — Testing foundations (implemented)

**Scripts standardized in `Projects/todos/package.json`:**
- `lint`
- `typecheck`
- `test`
- `test:unit`
- `test:e2e`
- `test:db`
- `test:all`

**Structure and docs:**
- moved unit tests under `Projects/todos/tests/unit/`
- added `Projects/todos/tests/README.md`
- updated `Projects/todos/vitest.config.mts` to use `tests/unit`

**Repo cleanup to make gates usable:**
- removed server usage of `buttonVariants()` from client-only contexts in not-found/auth pages
- fixed lint issues like unused imports and unescaped apostrophes

**Verification:**
- `npm run test:unit` passed
- `npm run typecheck` passed
- `npm run lint` passed

### Phase B — Unit tests with Vitest (implemented)

Kept scope focused on real `lib/` behavior:
- `Projects/todos/tests/unit/lib/errors.test.ts`
- `Projects/todos/tests/unit/lib/supabase/todos/actions.test.ts`
- `Projects/todos/tests/unit/lib/supabase/todos/queries.test.ts`

Covered:
- error translation
- auth guard behavior
- translated action/query failures
- success revalidation
- null handling in queries

**Verification:**
- `npm run test:unit` passed
- `npm run typecheck` passed
- `npm run lint` passed

### Phase C — pgTAP database tests (implemented)

DB tests organized under:
- `Projects/todos/supabase/tests/database/`
- `Projects/todos/supabase/tests/rls/`
- `Projects/todos/supabase/tests/functions/`

**Schema coverage:**
- table existence
- important columns
- defaults
- primary keys
- foreign keys
- unique constraints

**RLS coverage:**
- Alice/Bob ownership isolation for:
  - `categories`
  - `todos`
  - `tags`
  - `todo_tags`
- anonymous read denial
- insert/update/delete restrictions across users

**Function/trigger coverage:**
- `public.delete_user()`
- `public.update_updated_at()`
- `set_updated_at` trigger
- `updated_at` changes on update
- `delete_user()` cascade behavior across user-owned data

**Verification:**
- `supabase test db` passed
- DB suite reached 59 passing tests

### Phase D — Playwright setup and early workflows (partially implemented)

**D1 — Setup complete**
- installed `@playwright/test`
- installed Chromium
- created `Projects/todos/playwright.config.ts`
- ignored `playwright-report/` and `test-results/`
- configured Playwright against local Next dev server

**D2 — Auth flows complete**
- added `Projects/todos/tests/e2e/auth.spec.ts`
- flow covers:
  - unauthenticated redirect from `/dashboard` to `/login`
  - magic-link login
  - logout

**Important local debugging discoveries:**
- local Supabase mail UI is **Mailpit**, not Inbucket
- mailbox helper had to use Mailpit endpoints:
  - `/api/v1/search`
  - `/api/v1/message/:id`
- Playwright needed to use `http://localhost:3000` consistently to match the callback host/cookie flow
- seeded-user email login had a GoTrue/local bug, so auth tests switched to fresh disposable emails

**D3 — Todos workflow started**
- added shared E2E helpers:
  - `Projects/todos/tests/e2e/utils/auth.ts`
  - `Projects/todos/tests/e2e/utils/account.ts`
- added `Projects/todos/tests/e2e/todos.spec.ts`
- current D3 coverage target:
  - create todo
  - update todo
  - delete todo
  - invalid todo route -> not-found page

**Current D3 status:**
- invalid todo route test passes
- todo lifecycle test is close but still flaky because non-auth specs currently reuse magic-link login
- repeated failures were caused by navigation timing and auth/session instability rather than actual todo CRUD logic
- creation itself was observed succeeding in the browser and in snapshots

### Accessibility / UI warnings fixed

**Base UI semantic warning fixed:**
- `Projects/todos/components/todos/todo-detail.tsx`
  - replaced `Button render={<Link ... />}` for the Back control
  - now uses a real `Link` styled via `buttonVariants`

This removed the Base UI warning about `nativeButton` expecting a native `<button>`.

## Key discussions and decisions

- **Hydration warning on `<body>` was not an app bug**
  - caused by browser extension attributes (`data-new-gr-c-s-check-loaded`, `data-gr-ext-installed`)
  - likely Grammarly injecting attributes before hydration

- **Supabase client tests are useful, but not a replacement for pgTAP**
  - pgTAP remains the correct layer for schema, constraints, functions, triggers, and RLS
  - Vitest remains the right layer for app-side logic
  - Playwright remains the right layer for user workflows

- **Playwright auth strategy needs separation**
  - keep `auth.spec.ts` as the real magic-link test
  - move non-auth specs toward a more stable authenticated setup instead of repeating email login everywhere
  - this is the likely next improvement before expanding D4-D7

## Current state

- Task 06 error handling is implemented and reviewed
- Task 08:
  - Phase A complete
  - Phase B complete
  - Phase C complete
  - Phase D1 and D2 complete
  - Phase D3 partially complete

## Next likely steps

1. Stabilize Playwright auth setup for non-auth specs
2. Finish D3 todo lifecycle test
3. Continue D4-D7:
   - categories workflows
   - tags workflows
   - profile workflows
   - error UX smoke tests
