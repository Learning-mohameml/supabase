# Testing

This project uses 3 testing layers:

- `tests/unit/` — Vitest unit tests for `lib/` logic
- `tests/e2e/` — Playwright browser tests for user workflows
- `supabase/tests/` — pgTAP database tests for schema, functions, and RLS

## Commands

Run these from `Projects/todos/`:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:unit
npm run test:e2e
npm run test:db
npm run test:all
```

## Local prerequisites

### Unit tests

- No special services required

### DB tests

- Supabase local stack must already be running:

```bash
supabase start
npm run test:db
```

DB tests stay under `supabase/tests/` so they remain compatible with the Supabase CLI.

### E2E tests

- Next.js app must be available locally
- Supabase local stack should be running
- Seeded users/data should match the scenarios being tested

Playwright setup and browser workflow coverage are added later in Task 08 Phase D.
