# Step 0 — Concepts: Magic Link Authentication

Before writing any code, let's understand how Magic Link (passwordless email) authentication works and how it compares to the Google OAuth flow we already built.

---

## 1. What is a Magic Link?

A **Magic Link** is a one-time login URL sent to the user's email. Click the link, you're logged in. No password involved.

> "Prove you own this email address by clicking the link we just sent."

That's it. Ownership of the email inbox *is* the authentication factor.

**Benefits:**
- No passwords to remember, store, or hash
- No third-party OAuth provider needed (Google, GitHub, etc.)
- Works on any device with email access
- Familiar UX — users already click email links constantly

**Trade-offs:**
- Requires access to email (no email = no login)
- Slower than OAuth (user must switch to email client, click link, come back)
- Dependent on email delivery (spam filters, delays)

---

## 2. How Does It Work?

Magic Link uses Supabase's **OTP (One-Time Password)** flow. The "password" is embedded in the email link — the user never sees or types it.

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Browser    │       │   Supabase   │       │  User's      │
│              │       │   (GoTrue)   │       │  Email       │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
 ① User enters email          │                      │
   clicks "Send Magic Link"   │                      │
       │                      │                      │
 ② signInWithOtp(email)       │                      │
       ├──── POST ───────────►│                      │
       │                      │                      │
       │               ③ Supabase creates            │
       │                 or finds user                │
       │                 generates OTP code           │
       │                 builds magic link URL         │
       │                      │                      │
       │                      ├──── Email ──────────►│
       │                      │  "Click to login"    │
       │                      │  link contains code   │
       │                      │                      │
       │◄── 200 OK ──────────┤                      │
       │    "Check your email"│                      │
       │                      │                      │
       │                      │        ④ User opens  │
       │                      │          email,      │
       │                      │          clicks link  │
       │                      │                      │
 ⑤ Browser lands at           │◄─────────────────────┤
   /auth/callback?code=xxx    │                      │
       │                      │                      │
 ⑥ Route handler calls        │                      │
   exchangeCodeForSession()   │                      │
       ├──── POST ───────────►│                      │
       │   code + verifier    │                      │
       │                      │                      │
       │◄── session ─────────┤                      │
       │  (JWT + refresh      │                      │
       │   in Set-Cookie)     │                      │
       │                      │                      │
 ⑦ User is logged in          │                      │
       ▼                      ▼                      ▼
```

### The 7 steps summarized

| # | What happens | Where |
|---|-------------|-------|
| 1 | User types their email and clicks "Send Magic Link" | Browser |
| 2 | `signInWithOtp({ email })` sends the email address to Supabase | Browser -> Supabase |
| 3 | Supabase creates or finds the user, generates a one-time code, sends the email | Supabase server |
| 4 | User opens their email and clicks the magic link | Email client |
| 5 | Browser lands at `/auth/callback?code=xxx` | Browser |
| 6 | Route handler exchanges the code for a session (same as OAuth) | Your server -> Supabase |
| 7 | Session cookies are set, user is redirected to the dashboard | Browser |

---

## 3. Comparing Magic Link vs Google OAuth

| Aspect | Google OAuth | Magic Link |
|--------|-------------|------------|
| **External provider** | Yes (Google) | No (just Supabase + email) |
| **Number of redirects** | 2 (Google -> Supabase -> App) | 1 (Email link -> App) |
| **PKCE flow** | Yes | Yes (Supabase uses PKCE internally) |
| **Callback route** | `/auth/callback` | `/auth/callback` (same!) |
| **User experience** | Click button -> Google popup -> done | Enter email -> check inbox -> click link |
| **Speed** | Fast (2-3 seconds) | Slower (depends on email delivery) |
| **Configuration** | Google Cloud Console + Supabase | Just Supabase (+ SMTP for production) |
| **Account creation** | Automatic on first login | Automatic on first login |

### Key insight: the callback is identical

Steps 5-7 are **exactly the same** as steps 7-9 in the Google OAuth flow. The `/auth/callback` route handler and `exchangeCodeForSession()` work for both. We don't need to change any of the existing auth infrastructure.

---

## 4. What is Inbucket?

When running Supabase locally (`supabase start`), emails are **not actually sent**. Instead, they're captured by **Inbucket** — a local email testing server.

```
Production:  Supabase --SMTP--> Real email (Gmail, Outlook, etc.)
Local dev:   Supabase -------> Inbucket (localhost:54324)
```

Inbucket provides a web UI where you can see all captured emails, including Magic Links. This means:
- No SMTP configuration needed for development
- No risk of sending test emails to real addresses
- Instant email delivery (no spam filters or delays)

You'll access Inbucket at `http://127.0.0.1:54324` (the port shown by `supabase status`).

---

## 5. What Code We Already Have (and What's New)

Since we already built Google OAuth, most of the infrastructure is in place:

### Already done (reuse as-is)

| Component | File | Why it works |
|-----------|------|--------------|
| Browser client | `lib/supabase/clients/client.ts` | Auth-method agnostic |
| Server client | `lib/supabase/clients/server.ts` | Auth-method agnostic |
| Middleware | `lib/supabase/clients/middleware.ts` | Uses `getUser()`, works for all auth |
| Proxy | `proxy.ts` | Calls middleware, auth-method agnostic |
| Callback route | `app/auth/callback/route.ts` | `exchangeCodeForSession()` works for all |
| Error page | `app/auth/auth-code-error/page.tsx` | Generic auth error |
| Auth queries | `lib/supabase/auth/queries.ts` | `getUser()` doesn't care how user logged in |

### New code needed

| Component | What to do |
|-----------|-----------|
| `signInWithMagicLink()` | New function in `lib/supabase/auth/client.ts` |
| Login page | Add email input + Magic Link button alongside Google button |
| Supabase config | Verify email auth is enabled (it is by default) |

---

## Summary

| Concept | One-liner |
|---------|-----------|
| Magic Link | Passwordless login via one-time email link |
| OTP flow | Supabase sends a code embedded in the email link |
| Callback reuse | Same `/auth/callback` route and `exchangeCodeForSession()` as OAuth |
| Inbucket | Local email server — captures Magic Link emails during development |
| Minimal changes | Only need a new sign-in function and an updated login page |

---

**Next:** [01_supabase-config.md](./01_supabase-config.md) — Verify the email auth configuration in Supabase
