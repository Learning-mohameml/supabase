# Task 07 — Testing & CI/CD Pipeline

**Status:** Deferred to Chapter 06 (Production, CI/CD & DevOps)

## Objective

Add a professional testing setup and automated CI pipeline. This task is intentionally deferred — we focus on features first, then add quality gates in the production chapter.

## Scope

### Testing

- **TypeScript checker** — `tsc --noEmit` to catch type errors without emitting
- **Linter** — ESLint with strict rules, run on every PR
- **Unit tests** — Pure functions, utilities, type helpers
- **Integration tests** — Server actions, Supabase queries against a real local DB (no mocks)
- **E2E tests** — Full user flows (login, create todo, delete account) with a browser automation tool

### CI/CD (GitHub Actions)

- Lint + type-check on every PR
- Run tests on every PR
- Spin up local Supabase in CI to test migrations
- Auto-deploy migrations on merge to `main`
- Auto-deploy Next.js app
- Auto-regenerate types if schema changes

## Why deferred

Testing and CI/CD are covered in **Chapter 06 — Production, CI/CD & DevOps** (sections 04-08 in the roadmap). We'll implement them properly after learning the concepts there, not before.
