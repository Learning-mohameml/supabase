# Supabase Learning Roadmap

A structured path to learn Supabase from authentication to full-stack features.

---

## Module 01 — Auth

**Goal:** Understand how Supabase handles authentication and authorization.

Learn how users sign in, how sessions work, and how to integrate social providers (Google, GitHub, etc.) with Next.js. Covers OAuth flows, PKCE, middleware for token refresh, route protection, and security best practices.

**Topics:**
- OAuth 2.0 and PKCE flow
- Google OAuth integration with Next.js App Router
- Browser vs Server Supabase clients
- Middleware for session refresh and route protection
- Security: open redirects, error handling, redirect URL allowlisting

**Course files:** [`01_Auth/`](./01_Auth/)

---

## Module 02 — Database

**Goal:** Use Supabase as a PostgreSQL backend from your app.

Learn how to create tables, define schemas, insert/query/update/delete data from the client, and work with relations (foreign keys, joins). Understand how Supabase exposes PostgreSQL via the auto-generated REST API (PostgREST).

**Topics:**
- Creating tables and schemas in the Dashboard and via SQL
- CRUD operations from `@supabase/supabase-js`
- Relations: foreign keys, nested queries
- Filters, pagination, ordering
- Database types and TypeScript generation

---

## Module 03 — Row Level Security (RLS)

**Goal:** Secure your data at the database level.

RLS is what makes Supabase safe — it ensures users can only read/write data they're allowed to. Learn how policies work, how `auth.uid()` ties into SQL, and how to test your policies.

**Topics:**
- What is RLS and why it matters
- Writing SELECT / INSERT / UPDATE / DELETE policies
- Using `auth.uid()` and `auth.jwt()` in policies
- Common policy patterns (owner-only, public read, role-based)
- Testing policies with different user contexts

---

## Module 04 — Storage

**Goal:** Upload, download, and manage files with Supabase Storage.

Learn how to create buckets, upload files from the client, generate signed URLs, and protect files with storage policies (which work like RLS).

**Topics:**
- Public vs private buckets
- Uploading and downloading files
- Signed URLs and transformations (image resize)
- Storage policies: who can upload/read/delete
- Integrating storage with auth (user avatars, profile images)

---

## Module 05 — Realtime

**Goal:** Build live, reactive features with Supabase Realtime.

Subscribe to database changes, broadcast messages between clients, and track user presence — all over WebSockets.

**Topics:**
- Realtime channels and subscriptions
- Listening to INSERT / UPDATE / DELETE on tables
- Broadcast: sending custom events between clients
- Presence: tracking who is online
- Securing Realtime with RLS

---

## Module 06 — Edge Functions

**Goal:** Run server-side logic on Supabase's edge network.

Edge Functions are Deno-based serverless functions deployed to Supabase. Use them for webhooks, custom business logic, or calling third-party APIs securely.

**Topics:**
- Creating and deploying Edge Functions
- Handling requests and responses
- Using secrets and environment variables
- Invoking functions from the client
- Common patterns: webhooks, scheduled tasks, API proxies

---

## Module 07 — CLI and Local Development

**Goal:** Develop and test Supabase locally before deploying.

The Supabase CLI lets you run a full Supabase stack on your machine. Learn how to initialize projects, create and run migrations, seed data, and sync with your hosted project.

**Topics:**
- `supabase init` and local stack (`supabase start`)
- Creating and running migrations
- Seeding data
- Diffing local vs remote schemas
- Linking to a hosted project and pushing changes
