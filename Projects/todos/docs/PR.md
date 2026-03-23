# Product Requirements — Todos App

## Overview

A full-featured todos application built to learn Supabase professionally. The app is intentionally simple in scope but covers production-grade patterns: authentication, database design with multiple relation types, row-level security, CI/CD, and advanced PostgreSQL features.

---

## Goals

| Goal | What it teaches |
|------|-----------------|
| Auth with Google + Magic Link | Supabase Auth, OAuth 2.0, PKCE, passwordless login |
| Multi-table schema with joins | PostgreSQL relations, foreign keys, junction tables |
| Diverse data types | `uuid`, `text`, `integer`, `boolean`, `timestamptz`, `jsonb`, `enum`, `vector` |
| RLS on every table | Row Level Security, `auth.uid()`, policy patterns |
| Local-first development | Supabase CLI, migrations, seeding, Studio |
| CI/CD pipeline | GitHub Actions, auto-deploy migrations, type generation |
| Type-safe client | `supabase gen types`, TypeScript integration |

---

## Auth

### Providers

| Provider | Flow | Description |
|----------|------|-------------|
| **Google OAuth** | PKCE | Social login via Google — already implemented |
| **Magic Link** | OTP via email | Passwordless login — user enters email, clicks link to sign in |

### Auth Behavior

- Unauthenticated users are redirected to `/login`
- After login, redirect to `/dashboard`
- Session refresh via middleware/proxy (`proxy.ts`)
- Logout clears session and redirects to `/login`
- User profile accessible via `getUser()` on server

---

## Database Schema

### Tables

#### 1. `categories`

Organizes todos into groups. One-to-many relationship with `todos`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | e.g., "Work", "Personal" |
| `color` | `text` | NOT NULL, default `'#6B7280'` | Hex color for UI |
| `icon` | `text` | nullable | Optional emoji or icon name |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL | Owner |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

#### 2. `todos`

The main table. Demonstrates the most data types.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `title` | `text` | NOT NULL | Todo title |
| `description` | `text` | nullable | Longer description |
| `completed` | `boolean` | NOT NULL, default `false` | Done or not |
| `priority` | `integer` | NOT NULL, default `0`, CHECK (0–3) | 0=none, 1=low, 2=medium, 3=high |
| `due_date` | `timestamptz` | nullable | Optional deadline |
| `metadata` | `jsonb` | NOT NULL, default `'{}'` | Flexible key-value data (notes, links, etc.) |
| `position` | `integer` | NOT NULL, default `0` | For manual ordering/drag-drop |
| `category_id` | `uuid` | FK → `categories(id)` ON DELETE SET NULL, nullable | Assigned category |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL | Owner |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Updated via trigger |
| `deleted_at` | `timestamptz` | nullable | Soft delete |
| `embedding` | `vector(384)` | nullable | Semantic search via pgvector |

#### 3. `tags`

Demonstrates many-to-many via junction table.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | e.g., "urgent", "bug" |
| `color` | `text` | NOT NULL, default `'#3B82F6'` | Hex color |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL | Owner |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| UNIQUE | | `(name, user_id)` | No duplicate tag names per user |

#### 4. `todo_tags` (junction table)

Many-to-many between `todos` and `tags`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `todo_id` | `uuid` | FK → `todos(id)` ON DELETE CASCADE, NOT NULL | |
| `tag_id` | `uuid` | FK → `tags(id)` ON DELETE CASCADE, NOT NULL | |
| PRIMARY KEY | | `(todo_id, tag_id)` | Composite PK |

### Relationships

```
auth.users
    │
    ├── 1:N ──► categories
    ├── 1:N ──► todos
    └── 1:N ──► tags

categories ◄── N:1 ── todos        (one category has many todos)
tags       ◄── N:M ── todos        (via todo_tags junction table)
```

### PostgreSQL Features Used

| Feature | Where |
|---------|-------|
| `gen_random_uuid()` | All primary keys |
| `timestamptz` | All timestamps |
| `jsonb` | `todos.metadata` |
| `vector(384)` | `todos.embedding` (pgvector extension) |
| `CHECK` constraint | `todos.priority` (0–3) |
| Composite PK | `todo_tags(todo_id, tag_id)` |
| `ON DELETE CASCADE` | User deletion cascades to all data |
| `ON DELETE SET NULL` | Category deletion nullifies `todos.category_id` |
| Trigger | Auto-update `todos.updated_at` on row change |
| Soft delete | `todos.deleted_at` — filter with `WHERE deleted_at IS NULL` |
| Indexes | On `user_id`, `category_id`, `due_date`, GIN on `embedding` |

---

## Row Level Security (RLS)

Every table has RLS enabled. Policies scope all operations to `auth.uid()`.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `categories` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `todos` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `tags` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `todo_tags` | via join on `todos.user_id = auth.uid()` | via join on `todos.user_id = auth.uid()` | — (delete + re-insert) | via join on `todos.user_id = auth.uid()` |

---

## Pages & UI

> **Note:** All UI is generated by Claude. User focuses on DB/Supabase implementation.

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Google OAuth button + Magic Link email input |
| `/dashboard` | Dashboard | Main todo list with filters, search, and stats |
| `/dashboard/todo/[id]` | Todo Detail | View/edit a single todo with tags and metadata |
| `/dashboard/categories` | Categories | Manage categories (CRUD) |
| `/dashboard/tags` | Tags | Manage tags (CRUD) |
| `/dashboard/search` | Semantic Search | Search todos by meaning (pgvector) |

### UI Components (shadcn/ui)

- `Button`, `Input`, `Textarea` — forms
- `Card` — todo cards
- `Badge` — tags and priority
- `Select` — category picker, priority picker
- `Dialog` — create/edit modals
- `Checkbox` — toggle completed
- `Calendar`/`DatePicker` — due date
- `DropdownMenu` — todo actions (edit, delete, assign tags)
- `Sidebar` — navigation with categories
- `Toast` — success/error notifications

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. `migrate.yml` — Deploy Migrations

Triggered on push to `main` when `supabase/migrations/` changes.

Steps:
1. Checkout code
2. Install Supabase CLI
3. Link to hosted project (`supabase link`)
4. Run `supabase db push`
5. Run `supabase gen types typescript` and commit if changed

#### 2. `typecheck.yml` — Type Check

Triggered on every PR.

Steps:
1. Checkout code
2. Install dependencies
3. Generate Supabase types (from local or hosted)
4. Run `tsc --noEmit`

#### 3. `deploy.yml` — Deploy App

Triggered on push to `main`.

Steps:
1. Run type check
2. Build Next.js app
3. Deploy to Vercel (or other platform)

### Secrets Required

| Secret | Purpose |
|--------|---------|
| `SUPABASE_ACCESS_TOKEN` | CLI authentication |
| `SUPABASE_PROJECT_ID` | Target project for `supabase link` |
| `SUPABASE_DB_PASSWORD` | Database connection for migrations |

---

## Seed Data

`supabase/seed.sql` should create test data for local development:

- 3 default categories: "Work", "Personal", "Learning"
- 10 sample todos across categories with varied priorities, due dates, and metadata
- 5 tags: "urgent", "quick-win", "blocked", "review", "idea"
- Tag assignments on several todos

> Seed data uses a fixed test user UUID for local development.

---

## Stretch Goals (Optional — Phase 2)

These are **not required** for the initial build but can be added later:

| Feature | What it teaches |
|---------|-----------------|
| **File attachments** | Supabase Storage, storage policies, signed URLs |
| **Realtime updates** | Supabase Realtime subscriptions, live todo list |
| **Shared todos** | Multi-user RLS policies, shared access patterns |
| **Activity log** | PostgreSQL triggers writing to an audit table |
| **Dark mode** | Next.js theme switching with shadcn |

---

## Implementation Order

This is the recommended order to build the app, aligned with the course chapters:

| Step | What | Course Chapter |
|------|------|----------------|
| 1 | Initialize Supabase locally (`supabase init`, `start`) | 01 — CLI & Local Dev |
| 2 | Write migrations for all tables, triggers, indexes | 02 — PostgreSQL Refresh |
| 3 | Write `seed.sql` with test data | 02 — PostgreSQL Refresh |
| 4 | Set up Supabase JS client (browser + server) | 03 — Database Client |
| 5 | Build CRUD for todos and categories via client | 03 — Database Client |
| 6 | Add Google OAuth + Magic Link | 04 — Auth |
| 7 | Write RLS policies for all tables | 05 — RLS |
| 8 | Set up CI/CD pipeline (GitHub Actions) | 06 — Production |
| 9 | Add pgvector semantic search | 09 — Advanced PostgreSQL |
