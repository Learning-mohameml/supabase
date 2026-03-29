@AGENTS.md

# Todos App — Project Rules

## Purpose

This is a **learning project** to practice Supabase professionally. The app itself is simple (todos), but the implementation covers production-grade patterns: auth, RLS, migrations, CI/CD, type safety, and advanced PostgreSQL features.

## Development Workflow

### What the user implements themselves

- Database schema (SQL migrations)
- Supabase configuration (auth providers, RLS policies, storage buckets)
- Supabase client setup (browser/server clients, middleware)
- CI/CD pipeline (GitHub Actions, migration deployment)

### What Claude generates

- All UI code (React components, pages, layouts, styling)
- shadcn/ui component setup and usage
- TypeScript types and interfaces (non-DB)
- Client-side state management and hooks

### Rule: Always ask before generating DB/Supabase code

When the user asks for a feature, **generate the UI** but **describe the DB/Supabase steps** for the user to implement. Provide the SQL or config as guidance, not as auto-applied changes. Exception: if the user explicitly asks you to write the migration or Supabase code.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Auth:** Google OAuth + Magic Link
- **Database:** Local-first with Supabase CLI, migrations for all schema changes
- **CI/CD:** GitHub Actions — auto-deploy migrations, type generation

## Conventions

### Database

- All schema changes via migrations (`supabase migration new <name>`)
- Never modify the database via the dashboard in production
- Use `uuid` for all primary keys (via `gen_random_uuid()`)
- Use `timestamptz` for all timestamps
- Enable RLS on every table — no exceptions
- Use `auth.uid()` in policies to scope data per user
- Soft delete with `deleted_at timestamptz` column where appropriate

### Supabase Client

- Browser client: `lib/supabase/clients/client.ts`
- Server client: `lib/supabase/clients/server.ts`
- Middleware/proxy: `proxy.ts` imports from `lib/supabase/clients/middleware.ts`
- Always use `getUser()` on the server, never trust `getSession()` alone
- Use generated types from `supabase gen types typescript`

### Project Structure

```
todos/
├── app/                    # Next.js App Router pages and layouts
├── components/             # Shared UI components
├── lib/
│   ├── supabase/           # All Supabase app code
│   │   ├── clients/        # Client factories (server, browser, middleware)
│   │   ├── auth/           # Auth domain (queries, client-side auth)
│   │   ├── todos/          # Todos domain (queries, actions)
│   │   └── categories/     # Categories domain (queries)
│   └── utils.ts            # Generic utilities (cn(), etc.)
├── types/                  # TypeScript types (generated + helpers)
├── supabase/               # Supabase CLI (migrations, seeds, config)
│   ├── migrations/         # SQL migration files
│   ├── seed.sql            # Test data
│   └── config.toml         # Supabase local config
├── docs/
│   └── PR.md               # Product requirements
├── .github/
│   └── workflows/          # CI/CD pipelines
└── proxy.ts                # Next.js middleware for auth
```

### Code Style

- Functional React components only
- Server Components by default, Client Components only when needed (`"use client"`)
- No `any` types — use generated Supabase types
- Error boundaries for auth and data fetching failures
