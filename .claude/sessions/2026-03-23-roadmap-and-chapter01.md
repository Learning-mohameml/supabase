# Session — 2026-03-23 — Roadmap & Chapter 01

## What we did

### 1. Repo Structure & Conventions
- Created root `CLAUDE.md` with course conventions (kebab-case, chapter structure, learning workflow)
- Established 3 folders: `Cours/` (theory), `Practice/` (scratch SQL), `Projects/` (real app)
- Defined learning workflow: **Learn → Confirm → Implement → Review → Next**

### 2. Roadmap
- Built detailed roadmap in `Cours/Roadmap.md` with 2 phases
- **Phase 1 (Quick Goal):** PostgreSQL Foundation → CLI & Local Dev → Database Client → Auth → RLS → Production/CI/CD
- **Phase 2 (Deep Dive):** Storage → Realtime → Edge Functions → Advanced PostgreSQL
- Reordered: PostgreSQL first (raw psql), then Supabase
- Moved Production/CI/CD into Phase 1 (expanded to 14 sections, script-based, no dashboard)

### 3. Todos App
- Moved project to `Projects/todos/`, removed `auth-supabase` starter
- Wrote `Projects/todos/docs/PR.md` — full product requirements:
  - 4 tables: categories, todos, tags, todo_tags (1:N + M:N)
  - Data types: UUID, TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, JSONB, vector(384)
  - Auth: Google OAuth + Magic Link
  - RLS, CI/CD (3 GitHub Actions workflows), seed data
- Wrote `Projects/todos/CLAUDE.md` — project rules (Claude generates UI, user implements DB)

### 4. Chapter 01 — PostgreSQL Foundation (completed)
Wrote and reviewed 7 sections (skipped 07, 08, 10 for later):

| # | Section | Status |
|---|---------|--------|
| 01 | Setup & psql | Done + quiz passed |
| 02 | MySQL vs PostgreSQL | Done + quiz passed |
| 03 | Types & Domains | Done + quiz passed |
| 04 | Schemas & Tables | Done + quiz passed |
| 05 | CRUD Operations | Done + quiz passed |
| 06 | Relations & Joins | Done + quiz passed |
| 09 | Functions & Triggers | Written, not yet quizzed |
| 11 | Extensions | Written, not yet quizzed |

### 5. Task Created
- `Projects/todos/tasks/01-setup-db.md` — step-by-step checklist to build the full schema in raw PostgreSQL (Docker), 7 phases (A–G)

## Where to resume

1. **Read sections 09 and 11** if not done yet
2. **Do task 01-setup-db** — write SQL in `Practice/01_postgresql-foundation/todos-schema.sql`, test in Docker
3. **Send SQL for review** when done
4. **Move to Chapter 02** (CLI & Local Dev) — convert SQL into Supabase migrations
