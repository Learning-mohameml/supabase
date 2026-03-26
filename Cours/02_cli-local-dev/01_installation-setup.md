# 01 — Installation & Setup

## Why the Supabase CLI?

In Chapter 01, you wrote raw SQL against a plain PostgreSQL container. That works for learning SQL, but Supabase adds a full ecosystem on top of PostgreSQL: Auth, Storage, Realtime, Edge Functions, auto-generated REST APIs, and a local Studio dashboard.

The **Supabase CLI** lets you run all of this locally. Why that matters:

| Without CLI (dashboard-only) | With CLI (local-first) |
|------------------------------|------------------------|
| Schema changes via web dashboard | Schema changes via SQL migration files |
| No version control for DB changes | Every change is a `.sql` file in Git |
| Manual sync between environments | `supabase db push` deploys migrations |
| Can't work offline | Full stack runs on your machine |
| Hard to reproduce state | `supabase db reset` rebuilds from scratch |

**The rule:** never modify your database through the dashboard in production. Migrations are your source of truth.

---

## Prerequisites

### Docker

The Supabase CLI runs the entire stack as Docker containers. You need Docker installed and running.

Verify Docker is available:

```bash
docker --version
# Docker version 27.x.x or later

docker info
# Should show server info (not "Cannot connect to the Docker daemon")
```

> You already have Docker from Chapter 01 (you ran `pgvector/pgvector:pg17`). If it's running, you're good.

### Node.js (optional)

If you want to install the CLI via `npx`, you need Node.js 18+. Otherwise, you can use Homebrew or install the binary directly.

```bash
node --version
# v18.x.x or later
```

---

## Installing the Supabase CLI

There are several ways to install. Pick whichever fits your setup.

### Option 1: npm (recommended for Node.js projects)

```bash
npm install -g supabase
```

This installs the `supabase` command globally. Since our todos app is a Next.js project, this is the natural choice.

### Option 2: Homebrew (macOS/Linux)

```bash
brew install supabase/tap/supabase
```

### Option 3: Direct binary (Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

### Verify installation

```bash
supabase --version
# Supabase CLI x.x.x
```

---

## Initializing a Supabase Project

Navigate to your todos app directory and run `supabase init`:

```bash
cd Projects/todos
supabase init
```

This creates a `supabase/` folder inside your project:

```
Projects/todos/
├── supabase/
│   ├── config.toml        # Local Supabase configuration
│   ├── migrations/        # SQL migration files (empty for now)
│   └── seed.sql           # Seed data for local dev (empty for now)
├── app/
├── package.json
└── ...
```

### What each file does

| File/Folder | Purpose |
|-------------|---------|
| `config.toml` | Configures the local Supabase stack — ports, auth providers, email settings, etc. |
| `migrations/` | Holds timestamped `.sql` files that define your schema. Applied in order. |
| `seed.sql` | SQL that runs after migrations to populate test data in local dev. |

### `config.toml` — Key sections

The generated `config.toml` has many sections. Here are the ones you'll care about first:

```toml
[project]
id = "your-project-ref"      # Set when you link to a remote project

[api]
port = 54321                  # PostgREST API
schemas = ["public"]          # Which schemas to expose via REST

[db]
port = 54322                  # PostgreSQL direct access
major_version = 17            # PostgreSQL version

[studio]
port = 54323                  # Studio dashboard URL

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/**"]

[auth.external.google]
enabled = false               # We'll enable this in Chapter 04
client_id = ""
secret = ""
```

> You don't need to edit `config.toml` now. The defaults are fine for getting started. We'll configure auth providers in Chapter 04.

---

## What `supabase init` does NOT do

- It does **not** start any containers (that's `supabase start` — next section)
- It does **not** create a remote Supabase project (that's `supabase link` — section 05)
- It does **not** write any migrations — you'll do that yourself in section 03

Think of `supabase init` as the equivalent of `git init` — it just sets up the folder structure.

---

## Project structure after init

After initializing, your todos project should look like this:

```
Projects/todos/
├── app/                    # Next.js pages
├── components/             # UI components
├── supabase/
│   ├── config.toml         # Local config
│   ├── migrations/         # Your schema changes (SQL files)
│   └── seed.sql            # Test data
├── sql/
│   └── schema.sql          # Your raw SQL from Chapter 01 (reference)
├── docs/
│   └── PR.md               # Product requirements
├── package.json
└── ...
```

Your `sql/schema.sql` from Chapter 01 is your **reference**. In section 03, you'll convert it into proper Supabase migrations.

---

## Summary

| What | Command | Result |
|------|---------|--------|
| Install CLI | `npm install -g supabase` | `supabase` command available |
| Verify | `supabase --version` | Shows version |
| Initialize | `supabase init` | Creates `supabase/` folder with `config.toml`, `migrations/`, `seed.sql` |

---

## Next

In the next section, you'll run `supabase start` to boot the full local stack and explore Studio — your local database dashboard.
