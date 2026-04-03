# Task 08 — Add Testing to the Todos App

## Objective

Add a pragmatic testing strategy to the todos app so the project is protected at the right layers without wasting time on low-value tests.

This task is **not** about testing everything. It is about testing the parts that actually matter:

- app correctness gates (`lint`, `typecheck`)
- business logic in `lib/`
- database schema, SQL behavior, and RLS policies
- critical user workflows in the browser

After this task, the project should have:

- a baseline CI-quality safety net
- repeatable database/RLS tests
- focused unit tests for logic-heavy helpers
- E2E coverage for the main user journeys

---

## Testing Philosophy

### Test behavior at the layer that owns the behavior

- **TypeScript / ESLint** catch static correctness issues
- **Vitest** tests isolated TypeScript logic
- **pgTAP** tests PostgreSQL schema, functions, constraints, and RLS
- **Playwright** tests real user workflows through the app

### Do not test frameworks

Avoid spending time testing things that Next.js, React, shadcn/ui, or TypeScript already guarantee.

Examples of low-value tests:

- checking that a presentational component renders static text
- testing Tailwind classes
- testing props that are passed straight through
- testing TypeScript interfaces that `tsc` already validates
- testing simple wrappers with no meaningful branching or behavior

### Prefer fewer, higher-value tests

This repo is a learning project, but it aims to use professional patterns. That means:

- broad coverage of important risks
- low duplication between test layers
- minimal brittle tests

---

## Current Architecture

### `app/`

Owns routing and Next.js concerns:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`

Pages typically fetch data from `lib/` and pass it to UI components.

### `components/`

Owns the UI:

- resource-based folders like `todos/`, `categories/`, `tags/`, `profile/`
- dialogs, forms, lists, cards, and layout components

Most of this layer should be tested through real browser workflows, not isolated component tests.

### `lib/`

Owns logic and backend-facing behavior:

- `lib/supabase/.../queries.ts`
- `lib/supabase/.../actions.ts`
- `lib/errors.ts`
- client factories and helpers

This is the main place for unit tests when there is real logic to test.

### `supabase/`

Owns the database:

- migrations
- seed data
- schema
- SQL functions
- RLS policies

This layer must be tested directly at the PostgreSQL level.

---

## What We Will Test

### 1. Static checks

Always run:

- `eslint`
- `tsc --noEmit`

These are the minimum quality gate for every change.

### 2. Unit tests with Vitest

Only test logic-heavy TypeScript modules.

Good candidates:

- `lib/errors.ts`
- future pure helpers or transformation functions
- small wrappers with real branching and user-facing behavior

Do **not** add unit tests for:

- static presentational components
- trivial prop rendering
- basic TypeScript shapes
- framework behavior

### 3. Database tests with pgTAP

This is the most important new testing layer for the Supabase side.

Use pgTAP to test:

- schema objects exist
- columns/defaults/constraints are correct
- foreign keys behave as expected
- SQL functions / RPCs behave correctly
- RLS policies allow and deny the correct operations

Core targets for this app:

- `todos`
- `categories`
- `tags`
- `todo_tags`
- auth-linked behavior like `delete_user()` if present

### 4. E2E tests with Playwright

Use Playwright for real user workflows only.

This is the main way to test `app/` and `components/`.

Critical workflows:

- redirect to `/login` when unauthenticated
- login
- logout
- create / update / delete todo
- create / update / delete category
- create / update / delete tag
- update profile
- delete account
- invalid todo route shows 404
- one or two smoke tests for friendly error handling

---

## What We Will Not Test

- every component in isolation
- shadcn/ui internals
- static markup snapshots
- styling details
- simple render-only UI pieces
- every CRUD path at every layer
- Next.js framework behavior itself
- TypeScript types as if they were runtime behavior

If a test mainly proves that React can render JSX or that TypeScript knows a field exists, it is probably not worth writing.

---

## Steps

### Phase A — Testing Foundations *(Claude generates, user reviews)*

> **Learning goal:** Understand the testing stack and set the minimum project quality gates before writing detailed tests.

- [ ] **A1.** Confirm and standardize scripts in `package.json`:
  - `lint`
  - `typecheck`
  - `test`
  - `test:unit`
  - `test:e2e`
  - `test:db`
  - `test:all`

  **Recommended shape:**
  - `lint` -> run ESLint
  - `typecheck` -> run `tsc --noEmit`
  - `test` -> alias to unit tests for fast default feedback
  - `test:unit` -> run Vitest
  - `test:e2e` -> run Playwright
  - `test:db` -> run `supabase test db`
  - `test:all` -> run the full local suite in sequence

  **Important:** `test:db` should **not** start the local Supabase stack automatically. Keep environment startup separate:
  - `supabase start` -> start the local stack
  - `npm run test:db` -> run pgTAP tests against the running stack

  This keeps test commands focused, faster, and easier to debug.

- [ ] **A2.** Decide the test folder conventions:
  - unit tests under `tests/unit/`
  - Playwright tests under `tests/e2e/`
  - pgTAP tests under `supabase/tests/`

- [ ] **A3.** Add a short testing README or section documenting:
  - how to run each test type locally
  - which local services must be running
  - which seeded users/data are expected

### Phase B — Unit Tests with Vitest *(Claude generates, user reviews)*

> **Learning goal:** Test isolated business logic without involving the browser or database.

- [ ] **B1.** Keep and validate `lib/errors.ts` tests

- [ ] **B2.** Add unit tests only for high-value logic modules

- [ ] **B3.** Do **not** create broad component-unit-test coverage unless a component has unusually complex local logic

Expected target scope:

- error translation
- small helpers with branching
- reusable logic extracted from larger modules

### Phase C — Database Schema & RLS Tests with pgTAP *(user implements, Claude reviews)*

> **Learning goal:** Test the database at the correct layer. RLS is a PostgreSQL concern, so it must be verified in PostgreSQL.

- [ ] **C1.** Add pgTAP support to the local Supabase/Postgres test workflow

- [ ] **C2.** Add schema tests for:
  - table existence
  - important columns
  - defaults
  - primary keys
  - foreign keys
  - unique constraints

- [ ] **C3.** Add RLS tests for:
  - Alice can read her own rows
  - Alice cannot read Bob's rows
  - Alice can insert her own rows when allowed
  - Alice cannot insert rows using Bob's `user_id`
  - Alice cannot update or delete Bob's rows
  - anonymous access is denied where expected

- [ ] **C4.** Add tests for any important SQL function / RPC:
  - `delete_user()` if still used
  - any trigger-driven or policy-sensitive DB behavior

### Phase D — E2E Tests with Playwright *(Claude generates, user reviews)*

> **Learning goal:** Test the app the way a user uses it, from the browser, through the UI, with real navigation and interactions.

**Important testing approach for Playwright:**

- Start by testing the **user-visible workflow**
- Prefer **UI assertions first**:
  - the new todo appears
  - the updated category name is visible
  - the deleted tag disappears
  - the profile name changes in the sidebar
- Use **direct database assertions only for selected high-value flows**, not every test

Examples of good DB-verified E2E flows:

- first happy-path create test for a resource (`todo`, `category`, `tag`)
- delete account
- rare cases where UI alone cannot prove the important invariant

Avoid turning every Playwright test into a browser + DB double assertion if the UI result already proves the workflow clearly. Keep Playwright focused on user behavior, and keep RLS verification in pgTAP.

- [ ] **D1.** Set up Playwright for the Next.js app

- [ ] **D2.** Add auth flow tests:
  - unauthenticated redirect to `/login`
  - login
  - logout

- [ ] **D3.** Add todos workflow tests:
  - create todo
  - update todo
  - delete todo
  - invalid `/dashboard/todo/[id]` route shows 404

- [ ] **D4.** Add categories workflow tests:
  - create category
  - update category
  - delete category

- [ ] **D5.** Add tags workflow tests:
  - create tag
  - update tag
  - delete tag

- [ ] **D6.** Add profile workflow tests:
  - update display name
  - delete account

- [ ] **D7.** Add one or two smoke tests for error UX:
  - duplicate name shows friendly message
  - invalid todo id does not show technical error output

### Phase E — CI Workflow *(Claude generates, user reviews)*

> **Learning goal:** Make tests part of the normal development flow, not something run manually once and forgotten.

- [ ] **E1.** Add CI workflow for:
  - `eslint`
  - `tsc --noEmit`
  - Vitest

- [ ] **E2.** Add CI support for database tests if the environment can start the local stack reliably

- [ ] **E3.** Add Playwright to CI only when the local workflow is stable and the setup is not flaky

---

## Suggested Folder Layout

```txt
Projects/todos/
├── tests/
│   ├── unit/                  # Vitest unit tests
│   │   └── lib/
│   │       └── errors.test.ts
│   └── e2e/                   # Playwright tests
│       ├── auth.spec.ts
│       ├── todos.spec.ts
│       ├── categories.spec.ts
│       ├── tags.spec.ts
│       └── profile.spec.ts
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/                 # pgTAP tests (Supabase CLI convention)
│       ├── schema.sql
│       ├── rls-todos.sql
│       ├── rls-categories.sql
│       ├── rls-tags.sql
│       └── functions.sql
└── package.json
```

DB tests stay under `supabase/tests/` so they remain compatible with the Supabase CLI workflow (`supabase test db`). Unit and browser tests live under `tests/`.

---

## Division of Work

| Who | What |
|-----|------|
| **User** | pgTAP setup and DB-side tests (schema, functions, RLS) |
| **Claude** | Playwright setup and E2E workflow coverage |
| **Shared** | Vitest scope, test organization, CI decisions |

---

## Recommended Order

1. **Static checks first** — `eslint` + `typecheck`
2. **pgTAP second** — highest value for a Supabase app
3. **Vitest third** — only high-value logic tests
4. **Playwright fourth** — critical user journeys only
5. **CI last** — once local execution is stable

This order keeps the project practical and avoids overengineering too early.

---

## Done Criteria

- [ ] `eslint` and `typecheck` exist as standard checks
- [ ] `package.json` includes clear scripts for `test:unit`, `test:e2e`, `test:db`, and `test:all`
- [ ] Vitest covers the high-value logic modules only
- [ ] pgTAP tests cover schema, constraints, and RLS for the core tables
- [ ] Playwright covers the main user workflows
- [ ] No broad low-value component test suite was added
- [ ] Tests are organized by layer with clear responsibility
- [ ] Local test commands are documented
- [ ] CI can run at least static checks and unit tests reliably

---

## Notes

- **Playwright is the primary testing strategy for `app/` and `components/`** in this project. We are deliberately avoiding shallow component tests unless a component becomes especially complex.
- **pgTAP is the primary testing strategy for RLS**. Vitest cannot prove that PostgreSQL policies are correct.
- **This task is about useful coverage, not maximal coverage.** A smaller, well-chosen test suite is better than a large suite full of low-signal tests.
