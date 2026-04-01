# Chapter 05 — Row Level Security (RLS)

## What You'll Learn

Row Level Security is PostgreSQL's built-in mechanism to control which rows a user can see or modify — enforced at the database level, not the application level. This chapter covers how to design, write, test, and debug RLS policies for a production Supabase app.

By the end of this chapter you will be able to:

- Enable RLS on any table and understand the default-deny behavior
- Write `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies
- Use `auth.uid()`, `auth.jwt()`, and `auth.role()` to reference the current Supabase user inside a policy
- Apply common real-world patterns (owner-only, public read, role-based)
- Test your policies in isolation without touching the app

---

## Prerequisites

- Chapter 01 — PostgreSQL Foundation (SQL, constraints, functions)
- Chapter 02 — CLI & Local Dev (migrations workflow)
- Chapter 04 — Auth (how Supabase sets the JWT context on each request)

---

## Why RLS Matters

Without RLS, any authenticated user can read or modify any row — your app's `WHERE user_id = auth.uid()` filter in JavaScript is the only guard. If someone calls the API directly (bypassing your app), that filter disappears.

RLS moves the filter into the database engine. It runs on **every** query, no matter the origin.

```
Without RLS:         With RLS:
App code  ──►  DB    App code  ──►  PostgreSQL engine
 (filter)              (your WHERE  +  policy WHERE, always)
```

> Supabase's `anon` and `authenticated` roles hit your DB via PostgREST. The `service_role` key **bypasses RLS** — never expose it to the browser.

---

## Sections

| # | File | Topics |
|---|------|--------|
| 01 | [RLS Fundamentals](./01_rls-fundamentals.md) | What is RLS, enabling it, default-deny, how Supabase sets auth context |
| 02 | [Writing Policies](./02_writing-policies.md) | `CREATE POLICY`, `USING` vs `WITH CHECK`, per-command policies |
| 03 | [Auth Context in Policies](./03_auth-context.md) | `auth.uid()`, `auth.jwt()`, `auth.role()`, referencing the current user |
| 04 | [Common Patterns](./04_common-patterns.md) | Owner-only, public read / private write, role-based, shared resources |
| 05 | [Testing Policies](./05_testing-policies.md) | `SET ROLE`, `SET LOCAL`, `set_config`, debugging with `EXPLAIN` |
