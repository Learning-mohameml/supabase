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

## 5. Full Sequence Diagram

Here is the complete OAuth + PKCE flow with all actors and every HTTP hop:

```
 ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌─────────┐
 │   Browser    │       │  Your App    │       │   Supabase   │       │  Google  │
 │ (Client JS)  │       │  (Next.js)   │       │   (GoTrue)   │       │  (OAuth) │
 └──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └────┬────┘
        │                      │                      │                    │
 ① User clicks                │                      │                    │
   "Sign in with Google"      │                      │                    │
        │                      │                      │                    │
 ② Browser runs                │                      │                    │
   signInWithOAuth()           │                      │                    │
   generates PKCE:             │                      │                    │
   - code_verifier             │                      │                    │
     (stored locally)          │                      │                    │
   - code_challenge            │                      │                    │
     (SHA-256 of verifier)     │                      │                    │
        │                      │                      │                    │
 ③ Browser ───────────────────────────────────────────►                    │
   GET /auth/v1/authorize?     │                      │                    │
     provider=google           │                      │                    │
     &code_challenge=xxx       │                      │                    │
     &redirect_to=localhost:3000/auth/callback         │                    │
        │                      │                      │                    │
        │                      │               ④ Supabase builds           │
        │                      │                 Google OAuth URL           │
        │                      │                      │                    │
        │◄── 302 Redirect ───────────────────────────┤                    │
        │    to Google         │                      │                    │
        │    accounts.google.com/o/oauth2/auth?       │                    │
        │    client_id=xxx     │                      │                    │
        │    &redirect_uri=supabase/auth/v1/callback  │                    │
        │    &scope=email+profile                     │                    │
        │                      │                      │                    │
        ├──── GET ────────────────────────────────────────────────────────►│
        │                      │                      │                    │
 ⑤ User logs in at Google      │                      │                    │
   (email/password, consent)   │                      │                    │
        │                      │                      │                    │
        │◄── 302 Redirect ─────────────────────────────────────────────── │
        │    to Supabase       │                      │    (REDIRECT 1)   │
        │    supabase/auth/v1/callback?code=GOOGLE_CODE                   │
        │                      │                      │                    │
        ├──── GET ────────────────────────────────────►│                    │
        │                      │                      │                    │
        │                      │               ⑥ Supabase exchanges       │
        │                      │                 GOOGLE_CODE              │
        │                      │                 + client_secret          │
        │                      │                 with Google ────────────►│
        │                      │                      │                    │
        │                      │                      │◄── tokens ────────┤
        │                      │                      │   (id_token,      │
        │                      │                      │    access_token)   │
        │                      │                      │                    │
        │                      │               ⑦ Supabase creates/updates │
        │                      │                 user in auth.users       │
        │                      │                 generates auth code      │
        │                      │                 (SUPABASE_CODE)          │
        │                      │                      │                    │
        │◄── 302 Redirect ───────────────────────────┤                    │
        │    to YOUR APP       │                      │    (REDIRECT 2)   │
        │    localhost:3000/auth/callback?             │                    │
        │    code=SUPABASE_CODE│                      │                    │
        │                      │                      │                    │
        ├──── GET ────────────►│                      │                    │
        │    /auth/callback?   │                      │                    │
        │    code=SUPABASE_CODE│                      │                    │
        │                      │                      │                    │
        │               ⑧ Route handler calls         │                    │
        │                 exchangeCodeForSession()    │                    │
        │                      ├──── POST ───────────►│                    │
        │                      │  code=SUPABASE_CODE  │                    │
        │                      │  + code_verifier     │                    │
        │                      │                      │                    │
        │                      │◄── session ─────────┤                    │
        │                      │  (JWT + refresh token│                    │
        │                      │   in Set-Cookie)     │                    │
        │                      │                      │                    │
        │◄── 302 Redirect ────┤                      │                    │
        │    to /dashboard     │                      │                    │
        │    + Set-Cookie      │                      │                    │
        │                      │                      │                    │
 ⑨ User is now logged in      │                      │                    │
   (JWT in cookies)            │                      │                    │
        ▼                      ▼                      ▼                    ▼
```

### Key insight: two phases

All four actors are present throughout, but **your Next.js server is only active in step ⑧**:

**Phase A — Browser ↔ Supabase ↔ Google (steps ①–⑦):** The browser handles the PKCE generation and follows redirects between Supabase and Google. Your Next.js server is idle — it's not involved in any of these hops.

**Phase B — Browser → Your Server → Supabase (step ⑧):** Only when the browser arrives at `/auth/callback` does your Next.js route handler take over. It exchanges the `SUPABASE_CODE` + `code_verifier` for a session, sets cookies, and redirects the user.

### The 9 steps summarized

| # | What happens | Where |
|---|-------------|-------|
| ① | User clicks "Sign in with Google" | Browser |
| ② | `signInWithOAuth()` generates PKCE verifier + challenge, stores verifier locally | Browser (Supabase JS) |
| ③ | Browser redirects to Supabase's `/auth/v1/authorize` endpoint | Browser → Supabase |
| ④ | Supabase builds the Google OAuth URL and redirects the browser | Supabase server |
| ⑤ | User authenticates at Google | Google login page |
| ⑥ | Supabase exchanges Google's code for Google tokens (server-to-server) | Supabase → Google |
| ⑦ | Supabase creates/updates user, generates `SUPABASE_CODE` | Supabase server |
| ⑧ | Your app's route handler exchanges `SUPABASE_CODE` + `code_verifier` for a session | **Your server → Supabase** |
| ⑨ | Session cookies are set, user is logged in | Browser |

> **Two codes, two exchanges:** Google gives a code to Supabase (step ⑥), and Supabase gives a different code to your app (step ⑧). The PKCE `code_verifier` protects the second exchange — it was generated in the browser (step ②) and sent from your server (step ⑧), so even if someone intercepts `SUPABASE_CODE`, they can't use it without the verifier.

---

## 6. URL Reference — Local vs Production

Every URL in the OAuth chain must be consistent. Here is the complete reference:

### Where each URL is configured

| # | URL | Local | Production |
|---|-----|-------|------------|
| 1 | **Supabase Auth callback** (Google redirects here) | `http://127.0.0.1:54321/auth/v1/callback` | `https://<ref>.supabase.co/auth/v1/callback` |
| 2 | **App callback** (Supabase redirects here) | `http://localhost:3000/auth/callback` | `https://yourdomain.com/auth/callback` |
| 3 | **Site URL** (base URL of your app) | `http://127.0.0.1:3000` | `https://yourdomain.com` |
| 4 | **Supabase API URL** (your `.env`) | `http://127.0.0.1:54321` | `https://<ref>.supabase.co` |

### Where to configure each URL

| URL # | Google Cloud Console | Supabase config | Your code |
|-------|---------------------|-----------------|-----------|
| **1** | Authorized redirect URIs | Automatic (built-in) | — |
| **2** | — | Redirect URLs allowlist | `redirectTo` in `signInWithOAuth()` |
| **3** | — | `site_url` in config.toml / Dashboard | — |
| **4** | — | — | `NEXT_PUBLIC_SUPABASE_URL` in `.env` |

### Google Cloud Console — Authorized redirect URIs

You need **both** URLs in the same OAuth client:

```
http://127.0.0.1:54321/auth/v1/callback       ← local Supabase
https://<ref>.supabase.co/auth/v1/callback     ← production Supabase
```

### Supabase — Redirect URLs allowlist

**Local** (`config.toml`):
```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
```

**Production** (Dashboard → Authentication → URL Configuration):
```
Site URL:       https://yourdomain.com
Redirect URLs:  https://yourdomain.com/auth/callback
```

### Your code — `redirectTo`

```ts
// Uses window.location.origin → works in both environments automatically
redirectTo: `${window.location.origin}/auth/callback`
```

### Visual map

```
                       LOCAL                                PRODUCTION
                 ┌──────────────┐                     ┌──────────────────┐
  Google Cloud   │ Redirect URI:│                     │ Redirect URI:    │
  Console        │ 127.0.0.1:   │                     │ <ref>.supabase.  │
                 │ 54321/auth/  │                     │ co/auth/v1/      │
                 │ v1/callback  │                     │ callback         │
                 └──────┬───────┘                     └──────┬───────────┘
                        │                                    │
                        ▼                                    ▼
                 ┌──────────────┐                     ┌──────────────────┐
  Supabase       │ config.toml  │                     │ Dashboard        │
  Auth           │ site_url:    │                     │ Site URL:        │
                 │ 127.0.0.1:   │                     │ yourdomain.com   │
                 │ 3000         │                     │                  │
                 │              │                     │ Redirect URLs:   │
                 │ redirect:    │                     │ yourdomain.com/  │
                 │ localhost:   │                     │ auth/callback    │
                 │ 3000/auth/   │                     │                  │
                 │ callback     │                     │                  │
                 └──────┬───────┘                     └──────┬───────────┘
                        │                                    │
                        ▼                                    ▼
                 ┌──────────────┐                     ┌──────────────────┐
  Your App       │ .env.local   │                     │ .env.production  │
  (Next.js)      │ SUPABASE_URL:│                     │ SUPABASE_URL:    │
                 │ 127.0.0.1:   │                     │ <ref>.supabase.  │
                 │ 54321        │                     │ co               │
                 │              │                     │                  │
                 │ redirectTo:  │                     │ redirectTo:      │
                 │ localhost:   │                     │ yourdomain.com/  │
                 │ 3000/auth/   │                     │ auth/callback    │
                 │ callback     │                     │ (auto via origin)│
                 └──────────────┘                     └──────────────────┘
```

---

## Summary

| Concept | One-liner |
|---------|-----------|
| OAuth | Let Google prove who the user is |
| PKCE | Secure code exchange that prevents interception |
| Session | JWT tokens stored in cookies, refreshed by middleware |
| Two redirects | Google → Supabase → Your app (each configured separately) |
| Local auth | Configure Google in `config.toml`, add local callback to Google Console |
| URL consistency | All three actors (Google, Supabase, App) must agree on every URL |

---

**Next:** [01_setup-project.md](./01_setup-project.md) — Create the Next.js project and install Supabase packages
