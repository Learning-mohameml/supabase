# 01 — PostgREST Overview

## The problem PostgREST solves

In a traditional stack, you need to write backend code to expose your database:

```
Browser  →  Express/FastAPI route  →  SQL query  →  PostgreSQL
```

You write a route for every operation: `GET /todos`, `POST /todos`, `PATCH /todos/:id`, etc. Each route has its own SQL query, validation, and error handling. For 4 tables, that's easily 20+ endpoints.

Supabase eliminates this layer entirely with **PostgREST**.

---

## What is PostgREST?

PostgREST is an open-source tool that reads your PostgreSQL schema and **auto-generates a REST API** from it. Every table in the `public` schema becomes an endpoint — no backend code needed.

```
Browser  →  PostgREST (auto-generated)  →  PostgreSQL
```

When you ran `supabase start`, PostgREST started automatically on port `54321`.

### Your tables are already an API

With your current schema, you already have these endpoints:

| HTTP Method | Endpoint | SQL Equivalent |
|-------------|----------|----------------|
| `GET /rest/v1/categories` | `SELECT * FROM categories` |
| `POST /rest/v1/categories` | `INSERT INTO categories ...` |
| `PATCH /rest/v1/categories?id=eq.xxx` | `UPDATE categories SET ... WHERE id = 'xxx'` |
| `DELETE /rest/v1/categories?id=eq.xxx` | `DELETE FROM categories WHERE id = 'xxx'` |
| `GET /rest/v1/todos` | `SELECT * FROM todos` |
| `GET /rest/v1/tags` | `SELECT * FROM tags` |
| ... | ... |

You didn't write a single line of backend code. PostgREST created all of this from your `CREATE TABLE` statements.

---

## How it works

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Browser    │────►│   PostgREST  │────►│ PostgreSQL │
│  (JS Client)│◄────│  (port 54321)│◄────│ (port 54322)│
└─────────────┘     └──────────────┘     └────────────┘
                           │
                     Reads schema:
                     - Table names → endpoints
                     - Columns → fields
                     - FKs → nested queries
                     - RLS → access control
```

PostgREST connects to PostgreSQL and:

1. **Discovers tables** in the `public` schema → creates endpoints
2. **Reads column types** → validates input, formats output (JSON)
3. **Follows foreign keys** → enables nested/joined queries
4. **Respects RLS policies** → enforces access control (Chapter 05)

When you add a new table or column via a migration, PostgREST detects it automatically — no restart needed.

---

## Testing the API directly

You can test the API right now with `curl`. Your local API is at `http://127.0.0.1:54321`.

You need the **anon key** from `supabase status`. It goes in the `apikey` header.

### Get all categories

```bash
curl 'http://127.0.0.1:54321/rest/v1/categories' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Response:

```json
[
  {
    "id": "bbbbbbbb-0000-0000-0000-000000000001",
    "name": "Work",
    "color": "#EF4444",
    "icon": null,
    "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
    "created_at": "2026-03-24T16:00:00+00:00"
  },
  ...
]
```

### Get todos with filters

```bash
# Todos with priority >= 2
curl 'http://127.0.0.1:54321/rest/v1/todos?priority=gte.2' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Todos in a specific category
curl 'http://127.0.0.1:54321/rest/v1/todos?category_id=eq.bbbbbbbb-0000-0000-0000-000000000001' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Insert a category

```bash
curl 'http://127.0.0.1:54321/rest/v1/categories' \
  -X POST \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name": "Health", "user_id": "aaaaaaaa-0000-0000-0000-000000000001"}'
```

> `Prefer: return=representation` tells PostgREST to return the inserted row (like `RETURNING *` in SQL).

---

## The two headers explained

Every request needs two headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `apikey` | Your anon key | Identifies your project to Kong (API gateway) |
| `Authorization` | `Bearer <key>` | Tells PostgREST which **role** to use |

### Roles and keys

| Key | PostgreSQL Role | Access |
|-----|----------------|--------|
| `anon key` | `anon` | Public access — limited by RLS policies |
| `service_role key` | `service_role` | **Bypasses RLS** — full admin access |
| User JWT | `authenticated` | Logged-in user — RLS uses `auth.uid()` from the JWT |

Right now, without RLS enabled, the `anon` key can read and write everything. After Chapter 05, the `anon` role will be locked down and only authenticated users will see their own data.

> **Never expose the `service_role` key** in client-side code. It bypasses all security. It's for server-side admin operations only.

---

## Why you don't write the API yourself

| Traditional Backend | PostgREST (Supabase) |
|---|---|
| Write route handlers for every table | Auto-generated from schema |
| Write SQL queries or ORM models | Translates HTTP params to SQL |
| Write input validation | Uses PostgreSQL types and constraints |
| Write auth middleware | Uses PostgreSQL roles + RLS |
| Maintain API docs | Auto-generated (Studio → API Docs) |
| Deploy and scale the API server | Managed by Supabase |

You focus on the **schema** (migrations) and **security** (RLS). PostgREST handles the rest.

---

## Auto-generated API docs

Open Studio (`localhost:54323`) → **API Docs** (left sidebar). You'll see:

- Every table listed with its columns and types
- Example code for JavaScript, cURL, and other languages
- Filter syntax reference

This is generated from your schema — it updates automatically when you add tables or columns.

---

## Summary

| Concept | Description |
|---------|-------------|
| **PostgREST** | Reads your PostgreSQL schema, auto-generates a REST API |
| **No backend code** | Every `public` table becomes CRUD endpoints |
| **Foreign keys** | Enable nested/joined queries via the API |
| **RLS** | PostgreSQL policies control who can access what (Chapter 05) |
| **API keys** | `anon` for public, `service_role` for admin, user JWT for authenticated |

---

## Next

Now you understand what PostgREST does under the hood. In the next section, you'll set up the **Supabase JavaScript client** in your Next.js app — a thin wrapper around these REST calls that gives you a clean, type-safe API.
