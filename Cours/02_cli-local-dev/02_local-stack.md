# 02 — Local Stack

## What `supabase start` gives you

A single command boots an entire Supabase stack on your machine — around 15 Docker containers working together:

```bash
cd Projects/todos
supabase start
```

The first run downloads all the Docker images (~2–3 GB). Subsequent starts are fast.

When it finishes, it prints a table of URLs and keys:

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOi...
service_role key: eyJhbGciOi...
   S3 Access Key: ...
   S3 Secret Key: ...
```

> Save these values — you'll need the `API URL`, `anon key`, and `DB URL` when building the app.

---

## The services

| Service | Port | What it does |
|---------|------|-------------|
| **PostgreSQL** | 54322 | Your database — same as Chapter 01, but with Supabase schemas (`auth`, `storage`, etc.) pre-configured |
| **PostgREST** (API) | 54321 | Auto-generates a REST API from your tables — no backend code needed |
| **Studio** | 54323 | Web dashboard — table editor, SQL editor, auth management, logs |
| **GoTrue** (Auth) | 54321/auth | Handles signup, login, OAuth, magic links, sessions |
| **Storage** | 54321/storage | File uploads, signed URLs, image transformations |
| **Realtime** | 54321/realtime | WebSocket subscriptions for live data |
| **Inbucket** | 54324 | Fake email server — catches magic link and confirmation emails locally |
| **Edge Functions** | 54321/functions | Deno-based serverless functions |
| **pg_meta** | — | Powers Studio's schema introspection |
| **Kong** | 54321 | API gateway that routes requests to the right service |

> You don't need to memorize all of these. The key ones for now are **Studio** (54323), **API** (54321), and **DB** (54322).

---

## Studio — your local dashboard

Open **http://localhost:54323** in your browser. This is the same dashboard you'd see on `app.supabase.com`, but running locally.

### Key pages in Studio

| Page | What you'll use it for |
|------|----------------------|
| **Table Editor** | Browse and edit rows visually — like pgAdmin but built into Supabase |
| **SQL Editor** | Run queries directly — replaces `psql` for quick tests |
| **Auth → Users** | See registered users, manage sessions |
| **Database → Migrations** | View applied migrations |
| **API Docs** | Auto-generated docs for your tables — shows exact JS client calls |

> Studio is **read/write** — you can insert rows, edit data, run SQL. But for schema changes, always use migration files (section 03). Studio is for exploring, not for DDL in production.

---

## Connecting via psql (optional)

The local PostgreSQL is exposed on port `54322`. You can still connect directly:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```

Or:

```bash
psql -h localhost -p 54322 -U postgres -d postgres
```

The default user is `postgres` with password `postgres`.

---

## Stopping and restarting

### Stop (keep data)

```bash
supabase stop
```

Stops all containers but **preserves your data**. Next `supabase start` picks up where you left off.

### Stop and reset (destroy data)

```bash
supabase stop --no-backup
```

Destroys all data. Next `supabase start` starts fresh (migrations + seed will re-apply).

### Restart

```bash
supabase stop && supabase start
```

### Check status

```bash
supabase status
```

Shows all running services and their URLs/keys. Useful if you lost the output from `supabase start`.

---

## How local Supabase differs from raw PostgreSQL

In Chapter 01, you had a plain PostgreSQL database. Supabase's local stack adds several schemas and objects on top:

| Schema | Purpose |
|--------|---------|
| `public` | Your tables live here (categories, todos, tags, etc.) |
| `auth` | User accounts, sessions, providers — managed by GoTrue |
| `storage` | File metadata, buckets — managed by Storage service |
| `extensions` | Where extensions like `pgvector`, `pg_trgm` are installed |

You'll also find pre-created roles:

| Role | Purpose |
|------|---------|
| `postgres` | Superuser — full access |
| `anon` | Used by unauthenticated API requests |
| `authenticated` | Used by logged-in users via the API |
| `service_role` | Bypasses RLS — for server-side admin operations |

> This is why RLS matters (Chapter 05). When your app calls the API, it connects as `anon` or `authenticated`, and RLS policies decide what data they can see.

---

## Summary

| Command | What it does |
|---------|-------------|
| `supabase start` | Boot the full local stack (first run downloads images) |
| `supabase stop` | Stop containers, keep data |
| `supabase stop --no-backup` | Stop and destroy all data |
| `supabase status` | Show running services, URLs, and keys |

| URL | Service |
|-----|---------|
| `localhost:54321` | API (PostgREST, Auth, Storage) |
| `localhost:54322` | PostgreSQL direct access |
| `localhost:54323` | Studio dashboard |
| `localhost:54324` | Inbucket (fake email) |

---

## Next

Now that the stack is running and you can browse Studio, the next section covers **migrations** — how to convert your raw `schema.sql` into proper versioned migration files.


