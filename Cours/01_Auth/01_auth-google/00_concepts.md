# Step 0 — Concepts: OAuth, PKCE, and Sessions

Before writing any code, let's understand the three core concepts behind Google OAuth with Supabase.

---

## 1. What is OAuth?

**OAuth 2.0** is a protocol that lets your app say:

> "Google, can you verify who this person is?"

Instead of your app managing passwords, Google (the **provider**) handles authentication. Your app receives proof that the user is who they claim to be.

This is why login buttons say **"Continue with Google"** — your app delegates identity verification to a trusted third party.

**Benefits:**
- Users don't need yet another password
- You don't need to store or hash passwords
- Google handles security (2FA, breach detection, etc.)
- Login feels fast and familiar to users

---

## 2. What is the PKCE Flow?

**PKCE** (Proof Key for Code Exchange, pronounced "pixy") is a secure variant of the OAuth flow designed for apps that have a server component.

### Why not just the basic OAuth flow?

In the basic ("implicit") flow, the provider returns an access token directly in the URL. This is risky because:
- URLs can be logged by browsers, proxies, or server logs
- A man-in-the-middle could intercept the token

### How PKCE works

```
┌─────────────┐
│  Your App   │
│             │
│ 1. Generate │
│   verifier  │──── (random string, kept secret on server)
│   + challenge│──── (SHA-256 hash of verifier, sent to Google)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Google     │
│             │
│ 2. User logs │
│    in here   │
│             │
│ 3. Returns   │
│    a "code"  │──── (not a token — useless without the verifier)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Your App   │
│  (server)   │
│             │
│ 4. Sends    │
│  code +     │
│  verifier   │──── to Supabase
│  to exchange │
│  for session │
└─────────────┘
```

The key insight: even if someone intercepts the **code**, they can't use it without the **verifier** (which never left your server).

Supabase uses PKCE by default for server-side frameworks like Next.js.

---

## 3. What is a Session?

A **session** is proof that a user has already logged in. Without sessions, the user would need to log in on every single page load.

In Supabase, a session consists of:

| Token | Purpose | Lifetime |
|-------|---------|----------|
| **Access token** (JWT) | Proves identity on each request | ~1 hour |
| **Refresh token** | Gets a new access token when it expires | ~1 week |

### Where are they stored?

In a Next.js SSR setup with `@supabase/ssr`, tokens are stored in **cookies**, not `localStorage`.

Why cookies?
- Sent automatically with every HTTP request (including server-side requests)
- Can be `HttpOnly` — invisible to JavaScript (prevents XSS attacks from stealing tokens)
- Work on both client and server (unlike `localStorage`, which only exists in the browser)

### The refresh cycle

```
Request comes in
    │
    ▼
Middleware reads cookies
    │
    ▼
Is the access token expired?
    │
   YES ──► Use refresh token to get a new access token
    │       Write new tokens to cookies
    │
   NO ──► Continue with existing token
    │
    ▼
Request proceeds with valid auth
```

This is why **middleware is mandatory** in Next.js — without it, expired tokens are never refreshed, and users appear randomly logged out.

---

## 4. The Two Redirects (The Part That Confuses Everyone)

There are **two separate redirect hops** in the Google OAuth flow:

### Redirect 1: Google → Supabase

- **Configured in:** Google Cloud Console (Authorized redirect URIs)
- **URL:** `https://<your-project>.supabase.co/auth/v1/callback`
- **What happens:** After the user logs in at Google, Google sends them to Supabase with an authorization code

### Redirect 2: Supabase → Your App

- **Configured in:** Your code (`redirectTo` option) + Supabase Dashboard (allowed redirect URLs)
- **URL:** `http://localhost:3000/auth/callback` (dev) or `https://yourdomain.com/auth/callback` (prod)
- **What happens:** Supabase processes the Google auth code and redirects the user to your app with a new code for session exchange

### Memory trick

```
Google  ──trusts──►  Supabase  ──trusts──►  Your App
```

Each link in the chain needs explicit configuration on both sides.

---

## Summary

| Concept | One-liner |
|---------|-----------|
| OAuth | Let Google prove who the user is |
| PKCE | Secure code exchange that prevents interception |
| Session | JWT tokens stored in cookies, refreshed by middleware |
| Two redirects | Google → Supabase → Your app (each configured separately) |

---

**Next:** [01_setup-project.md](./01_setup-project.md) — Create the Next.js project and install Supabase packages
