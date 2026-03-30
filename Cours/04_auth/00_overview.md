# Auth — Overview

## What is Supabase Auth?

Supabase Auth is the authentication and user management layer of Supabase. It handles:

- **User sign-up and sign-in** (email/password, social providers, magic links, phone OTP)
- **Session management** (issuing, refreshing, and revoking JWT tokens)
- **User metadata** (storing profile info alongside the auth record)
- **Integration with RLS** (Row Level Security policies can reference `auth.uid()` to restrict data access per user)

Under the hood, Supabase Auth is powered by [GoTrue](https://github.com/supabase/gotrue), an open-source auth server written in Go.

---

## Core Concepts

### 1. Providers

A **provider** is a method users can use to authenticate. Supabase supports:

| Type | Examples |
|------|----------|
| Social / OAuth | Google, GitHub, Apple, Discord, etc. |
| Email | Email + password, magic links |
| Phone | SMS OTP |
| SSO / SAML | Enterprise identity providers |

Each provider has its own setup (API keys, redirect URIs, etc.), but once configured, Supabase handles the flow uniformly.

### 2. Sessions and JWTs

When a user logs in, Supabase issues a **JWT (JSON Web Token)**. This token:

- Proves the user's identity
- Contains claims like `sub` (user ID), `email`, `role`
- Has an **expiration time** (default: 1 hour)
- Is accompanied by a **refresh token** to get a new JWT before it expires

In a Next.js SSR setup, these tokens are stored in **cookies** (not localStorage), which is more secure because:
- Cookies are sent automatically with every request
- They can be `HttpOnly` (not accessible to JavaScript, preventing XSS theft)
- The server can read them to authenticate server-side requests

### 3. PKCE Flow (Proof Key for Code Exchange)

For server-side apps (like Next.js with SSR), Supabase uses the **PKCE flow** instead of the simpler implicit flow:

```
1. Your app generates a random "code verifier" + its hash ("code challenge")
2. User is sent to the provider (Google) with the code challenge
3. Provider redirects back with an authorization "code"
4. Your server exchanges that code + the original verifier for a session
```

Why PKCE? Because the authorization code alone is useless without the verifier, which never leaves your server. This prevents interception attacks.

### 4. The Two Redirects

This confuses almost every beginner:

```
User clicks "Sign in with Google"
        │
        ▼
   Google login page
        │
        ▼
   Google redirects to ──► Supabase  (Google → Supabase callback)
                                │
                                ▼
                          Supabase redirects to ──► Your app  (Supabase → app callback)
                                                        │
                                                        ▼
                                                  exchangeCodeForSession()
                                                        │
                                                        ▼
                                                  User is logged in
```

- **Redirect 1** (configured in Google Cloud Console): Google sends the user to Supabase's callback URL
- **Redirect 2** (configured in your code via `redirectTo`): Supabase sends the user to your app's callback route

### 5. Middleware (Next.js)

In a Next.js SSR setup, you **must** have middleware that:

- Reads the auth cookies on every request
- Refreshes the JWT if it's expired (using the refresh token)
- Writes the new tokens back to cookies

Without middleware, users will appear logged out after their JWT expires (~1 hour), even though they have a valid refresh token.

---

## Auth in This Course

| # | Sub-chapter | Topic |
|---|-------------|-------|
| 01 | [01_auth-google](./01_auth-google/) | Full Google OAuth integration with Next.js |
| 02 | 02_magic-link/ | Email-based passwordless login with Magic Links (coming soon) |

### Sections in 01_auth-google

| # | Section | Topic |
|---|---------|-------|
| 00 | [Concepts](./01_auth-google/00_concepts.md) | OAuth, PKCE, sessions, two redirects, sequence diagram, URL reference |
| 01 | [Setup Project](./01_auth-google/01_setup-project.md) | Create Next.js app, install Supabase packages |
| 02 | [Supabase + Google Config](./01_auth-google/02_supabase-google-config.md) | Google Cloud Console, enable provider, redirect URLs |
| 03 | [Env & Clients](./01_auth-google/03_env-and-clients.md) | `.env.local`, browser + server clients |
| 04 | [Callback Route](./01_auth-google/04_callback-route.md) | Exchange code for session, PKCE, error handling |
| 05 | [Login Page](./01_auth-google/05_login-page.md) | `signInWithOAuth`, Client Component, `redirectTo` |
| 06 | [Middleware / Proxy](./01_auth-google/06_middleware.md) | Token refresh, route protection, `getUser()` |
| 07 | [Protected Pages](./01_auth-google/07_protected-pages.md) | Home page, logout button, Server Component pattern |
| 08 | [Security Best Practices](./01_auth-google/08_security-best-practices.md) | Open redirect, JWT forgery, cookie security, checklist |
| 09 | [Local Auth Setup](./01_auth-google/09_local-auth-setup.md) | `config.toml`, local Google OAuth, `supabase/.env`, troubleshooting |

---

## Key Security Principles

1. **Always use `getUser()`, not `getSession()`** on the server — `getUser()` validates the JWT with Supabase's server, while `getSession()` only reads the local token (which could be tampered with)
2. **Never trust the client** — validate everything server-side
3. **Use middleware** to keep sessions fresh
4. **Validate redirect URLs** — never redirect to arbitrary URLs after auth
5. **Enable RLS** on all tables — auth without RLS means anyone with the anon key can read/write everything
