# 05 — Link & Push

## The two environments

So far, everything runs locally. To go to production, you need a **remote Supabase project** — a hosted instance on `supabase.com`.

```
┌─────────────────┐         ┌─────────────────────┐
│   LOCAL          │         │   REMOTE (hosted)    │
│                  │         │                      │
│  supabase start  │  ────►  │  app.supabase.com    │
│  localhost:54323 │  push   │  your-project.supabase.co │
│                  │         │                      │
│  migrations/     │         │  Same schema         │
│  seed.sql        │         │  No seed data        │
└─────────────────┘         └─────────────────────┘
```

The workflow: develop locally, test with `db reset`, then **push** migrations to the remote project.

---

## Step 1 — Create a remote project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project:

1. Click **New Project**
2. Choose an organization (or create one)
3. Set a name (e.g., `todos`)
4. Set a **database password** — save this, you'll need it
5. Choose a region close to your users
6. Click **Create new project**

Wait for it to finish provisioning. You'll get:
- A **project reference** (e.g., `abcdefghijklmnop`) — visible in the URL
- An **API URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
- **API keys** (anon, service_role)

---

## Step 2 — Login to the CLI

Authenticate the CLI with your Supabase account:

```bash
supabase login
```

This opens a browser window. Log in and authorize the CLI. It stores your access token locally.

> You can also use an access token directly. Generate one at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens):
> ```bash
> supabase login --token sbp_your_token_here
> ```

---

## Step 3 — Link your local project

Link connects your local `supabase/` folder to a specific remote project:

```bash
supabase link --project-ref <your-project-ref>
```

It will ask for your **database password** (the one you set when creating the project).

Example:

```bash
supabase link --project-ref abcdefghijklmnop
# Enter your database password: ********
# Finished supabase link.
```

### What `link` does

- Stores the project ref in `supabase/.temp/` (not committed to Git)
- Enables commands like `db push`, `db pull`, `migration list` to work against the remote
- Does **not** modify your remote database — it just sets up the connection

---

## Step 4 — Push migrations

Deploy your local migrations to the remote database:

```bash
supabase db push
```

This applies any migrations that exist locally but haven't been applied remotely yet.

```
Connecting to remote database...
Applying migration 20260324160000_create_extensions.sql...
Applying migration 20260324160001_create_tables.sql...
Applying migration 20260324160002_create_updated_at_trigger.sql...
Applying migration 20260324160003_create_indexes.sql...
Finished supabase db push.
```

> `db push` does **not** run `seed.sql`. Seed data is for local dev only. Your production database starts empty — real data comes from users through the app.

---

## Checking remote status

### Compare local vs remote

```bash
supabase migration list
```

Shows which migrations are applied locally, remotely, or both:

```
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────
    20260324160000 │ 20260324160000 │ 2026-03-24 16:00:00
    20260324160001 │ 20260324160001 │ 2026-03-24 16:00:01
    20260324160002 │ 20260324160002 │ 2026-03-24 16:00:02
    20260324160003 │ 20260324160003 │ 2026-03-24 16:00:03
```

### Diff local vs remote

```bash
supabase db diff
```

Shows SQL differences between your local schema and the remote schema. Useful to verify everything is in sync.

---

## Pulling remote changes (reverse direction)

If someone modified the remote database (via dashboard or another machine), you can pull those changes into a local migration:

```bash
supabase db pull
```

This generates a migration file from the difference. Useful when transitioning from dashboard-based development to migration-based development.

> In our workflow, we avoid this. All changes go through local migrations → `db push`. But it's good to know it exists.

---

## The full workflow

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  1. supabase migration new <name>                │
│     └── Write SQL                                │
│                                                  │
│  2. supabase db reset                            │
│     └── Test locally (Studio + app)              │
│                                                  │
│  3. git add supabase/migrations/ && git commit   │
│     └── Version control                          │
│                                                  │
│  4. supabase db push                             │
│     └── Deploy to remote                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

In Chapter 06, you'll automate step 4 with GitHub Actions — `db push` runs automatically when you merge to `main`.

---

## Common commands reference

| Command | What it does |
|---------|-------------|
| `supabase login` | Authenticate CLI with your Supabase account |
| `supabase link --project-ref <ref>` | Connect local project to a remote project |
| `supabase db push` | Apply local migrations to remote database |
| `supabase db pull` | Generate migration from remote changes |
| `supabase db diff` | Show schema differences between local and remote |
| `supabase migration list` | Compare local vs remote migration status |

---

## Security notes

- **Never commit your database password** or access token to Git
- The `supabase/.temp/` folder (created by `link`) is gitignored by default
- In CI/CD (Chapter 06), you'll use GitHub Secrets for credentials
- `db push` only runs migrations — it cannot read or export your production data

---

## Summary

This chapter gave you the complete local development workflow:

| Section | What you learned |
|---------|-----------------|
| 01 — Installation | Install CLI, `supabase init` |
| 02 — Local Stack | `supabase start`, Studio, services |
| 03 — Migrations | Schema changes as versioned SQL files |
| 04 — Seeding | Test data for local development |
| 05 — Link & Push | Deploy migrations to production |

You now have everything to develop locally and ship to production. The database side is solid.

---

## What's next

**Chapter 03 — Database Client** — Learn how to interact with your database from Next.js using the Supabase JavaScript client. You'll set up the client, do CRUD operations, and generate TypeScript types.
