# Supabase Learning Roadmap

A structured path to learn PostgreSQL and Supabase deeply, from raw SQL to production features.

---

## Phase 1 — Quick Goal

> **Objective:** Master PostgreSQL fundamentals, local Supabase development, Auth (Google + Magic Link), RLS, and production-grade CI/CD. Build a todos app incrementally and ship it with a fully scripted, dashboard-free deployment pipeline.

---

### Chapter 01 — PostgreSQL Foundation [`01_postgresql-foundation/`](./01_postgresql-foundation/)

Refresh SQL fundamentals with raw PostgreSQL. Interact directly via `psql` — no Supabase yet. Covers MySQL → PG differences and goes into advanced features.

| # | Section | Topics |
|---|---------|--------|
| 01 | Setup & psql | Install PostgreSQL, Docker setup, `psql` basics, connecting, `\d`, `\dt`, `\l` |
| 02 | MySQL vs PostgreSQL | Key differences: `SERIAL`/`IDENTITY` vs `AUTO_INCREMENT`, `TEXT` vs `VARCHAR`, `BOOLEAN`, naming conventions |
| 03 | Types & Domains | Built-in types, `JSONB`, `UUID`, `TIMESTAMPTZ`, arrays, enums, custom domains |
| 04 | Schemas & Tables | `CREATE SCHEMA`, `CREATE TABLE`, constraints (PK, FK, UNIQUE, CHECK, NOT NULL) |
| 05 | CRUD Operations | `INSERT`, `SELECT`, `UPDATE`, `DELETE`, `RETURNING`, `UPSERT` (`ON CONFLICT`) |
| 06 | Relations & Joins | One-to-many, many-to-many, junction tables, `JOIN` types, foreign keys with `ON DELETE` |
| 07 | Indexes & Performance | B-tree, GIN, GiST indexes, `EXPLAIN ANALYZE`, when to index |
| 08 | Views & CTEs | `CREATE VIEW`, Common Table Expressions (`WITH`), recursive CTEs |
| 09 | Functions & Triggers | PL/pgSQL basics, `CREATE FUNCTION`, `CREATE TRIGGER`, `BEFORE`/`AFTER` triggers |
| 10 | Transactions & Concurrency | `BEGIN`/`COMMIT`/`ROLLBACK`, isolation levels, advisory locks |
| 11 | Extensions | `uuid-ossp`, `pgcrypto`, `pg_trgm`, enabling extensions in Supabase |

---

### Chapter 02 — CLI & Local Development [`02_cli-local-dev/`](./02_cli-local-dev/)

Set up a full Supabase stack locally. Every future chapter uses this as the foundation.

| # | Section | Topics |
|---|---------|--------|
| 01 | Installation & Setup | Install Supabase CLI, Docker prerequisites, `supabase init` |
| 02 | Local Stack | `supabase start`, `supabase stop`, local Studio dashboard |
| 03 | Migrations | `supabase migration new`, writing SQL migrations, `supabase db reset` |
| 04 | Seeding | `seed.sql`, inserting test data, resetting with seeds |
| 05 | Link & Push | `supabase link`, `supabase db push`, diffing local vs remote |

---

### Chapter 03 — Database Client [`03_database-client/`](./03_database-client/)

Use Supabase's auto-generated REST API (PostgREST) and the JavaScript client to interact with your database from Next.js.

| # | Section | Topics |
|---|---------|--------|
| 01 | PostgREST Overview | How Supabase exposes PostgreSQL via REST, auto-generated endpoints |
| 02 | Supabase JS Client Setup | `@supabase/supabase-js`, browser vs server clients, TypeScript types |
| 03 | CRUD from the Client | `.insert()`, `.select()`, `.update()`, `.delete()`, `.upsert()` |
| 04 | Filtering & Querying | `.eq()`, `.gt()`, `.like()`, `.in()`, `.or()`, `.order()`, `.limit()`, `.range()` |
| 05 | Relations & Nested Queries | Fetching related data, embedded resources, foreign key joins |
| 06 | TypeScript Generation | `supabase gen types`, using generated types for type-safe queries |

---

### Chapter 04 — Auth [`04_auth/`](./04_auth/)

Understand how Supabase handles authentication. Covers OAuth with Google and passwordless login with Magic Links.

| # | Sub-chapter | Topics |
|---|-------------|--------|
| 01 | [Google OAuth](./04_auth/01_auth-google/) | OAuth 2.0, PKCE flow, Google Cloud setup, callback route, middleware, session management, security best practices |
| 02 | Magic Link | Email-based passwordless login, `signInWithOtp()`, email templates, deep linking, session handling |

---

### Chapter 05 — Row Level Security [`05_rls/`](./05_rls/)

Secure your data at the database level. RLS ensures users can only access data they're authorized to see.

| # | Section | Topics |
|---|---------|--------|
| 01 | RLS Fundamentals | What is RLS, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, default-deny behavior |
| 02 | Writing Policies | `CREATE POLICY`, `USING` vs `WITH CHECK`, SELECT/INSERT/UPDATE/DELETE policies |
| 03 | Auth Context in Policies | `auth.uid()`, `auth.jwt()`, `auth.role()`, referencing the current user |
| 04 | Common Patterns | Owner-only access, public read / private write, role-based access, shared resources |
| 05 | Testing Policies | Testing with `SET ROLE`, using different user contexts, debugging policies |

### Chapter 06 — Production, CI/CD & DevOps [`06_production/`](./06_production/)

Ship your Supabase project to production with confidence. **Everything is script-based** — zero dashboard clicks in production. Learn from scratch: Git workflows, GitHub Actions, environment management, automated deployments, and security hardening.

| # | Section | Topics |
|---|---------|--------|
| 01 | Git Workflow | Branching strategy (main/dev/feature), pull requests, protected branches, code review |
| 02 | GitHub Actions Fundamentals | What are workflows, triggers (`on push`, `on pull_request`), jobs, steps, runners, YAML syntax |
| 03 | Environment Management | Local → staging → production, `.env` files, GitHub secrets, Supabase project per environment |
| 04 | CI Pipeline — Lint & Type Check | Automated linting, `tsc --noEmit`, run on every PR, block merge on failure |
| 05 | CI Pipeline — Test Migrations | Spin up local Supabase in CI, apply migrations, validate schema, catch errors before production |
| 06 | CD Pipeline — Deploy Migrations | Auto-deploy migrations to production on merge to `main`, `supabase db push`, rollback strategy |
| 07 | CD Pipeline — Deploy App | Auto-deploy Next.js to Vercel/other, environment variables, build previews on PR |
| 08 | Type Generation in CI | Auto-run `supabase gen types`, commit if changed, keep types in sync with schema |
| 09 | Supabase CLI Scripted Setup | Script project creation, auth config, storage buckets — everything reproducible, no dashboard |
| 10 | Secrets Management | GitHub secrets, Supabase vault, rotating API keys, never hardcode credentials |
| 11 | Monitoring & Observability | `pg_stat_statements`, Supabase logs, health checks, alerting on errors |
| 12 | Backups & Recovery | Point-in-time recovery, `pg_dump` scripts, disaster recovery plan |
| 13 | Security Hardening | Network restrictions, MFA enforcement, API key scoping, audit logging, pre-deploy security checklist |
| 14 | Production Checklist | Final script-based checklist: RLS enabled, no open policies, secrets rotated, monitoring active |

---

## Phase 2 — Deep Dive

> **Objective:** Master Storage, Realtime, Edge Functions, and advanced PostgreSQL.

---

### Chapter 07 — Storage [`07_storage/`](./07_storage/)

Upload, download, and manage files with Supabase Storage.

| # | Section | Topics |
|---|---------|--------|
| 01 | Buckets & Setup | Public vs private buckets, creating buckets, storage configuration |
| 02 | Upload & Download | Uploading files from the client, downloading, listing files |
| 03 | Signed URLs & Transformations | Generating signed URLs, image resize, CDN caching |
| 04 | Storage Policies | RLS-like policies for storage, who can upload/read/delete |
| 05 | Integration with Auth | User avatars, profile images, per-user file access |

---

### Chapter 08 — Realtime [`08_realtime/`](./08_realtime/)

Build live, reactive features with WebSocket subscriptions.

| # | Section | Topics |
|---|---------|--------|
| 01 | Channels & Subscriptions | Realtime channels, subscribing to table changes |
| 02 | Database Changes | Listening to INSERT/UPDATE/DELETE, filtering changes |
| 03 | Broadcast | Sending custom events between clients |
| 04 | Presence | Tracking who is online, user status |
| 05 | Securing Realtime | RLS with Realtime, authorization for channels |

---

### Chapter 09 — Edge Functions [`09_edge-functions/`](./09_edge-functions/)

Run server-side logic on Supabase's edge network using Deno.

| # | Section | Topics |
|---|---------|--------|
| 01 | Getting Started | Creating functions, local development, `supabase functions serve` |
| 02 | Requests & Responses | Handling HTTP requests, returning JSON, status codes |
| 03 | Secrets & Environment | `supabase secrets set`, accessing env vars, security |
| 04 | Invoking from Client | `supabase.functions.invoke()`, passing data, error handling |
| 05 | Patterns | Webhooks, scheduled tasks (pg_cron + edge functions), API proxies |

---

### Chapter 10 — Advanced PostgreSQL [`10_advanced-postgresql/`](./10_advanced-postgresql/)

Deep PostgreSQL features that power advanced Supabase use cases.

| # | Section | Topics |
|---|---------|--------|
| 01 | Full-Text Search | `tsvector`, `tsquery`, `to_tsvector()`, search indexes, ranking |
| 02 | pg_cron | Scheduled jobs, recurring tasks, cron syntax in PostgreSQL |
| 03 | Database Webhooks | Triggering external services on database events |
| 04 | Postgres Roles & Grants | `anon`, `authenticated`, `service_role`, custom roles, `GRANT`/`REVOKE` |
| 05 | Partitioning & Optimization | Table partitioning, query optimization, connection pooling (PgBouncer) |

---

## Future Projects

| Project | What it teaches |
|---------|-----------------|
| **FastAPI + Supabase API** | Backend service using `service_role`, server-side Supabase admin client, bypassing RLS for admin operations |
