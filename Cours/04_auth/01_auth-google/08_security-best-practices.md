# Step 8 — Security Best Practices

## Goal

Understand the security vulnerabilities in auth flows and how to prevent them. This is a reference you should revisit when building any Supabase + Next.js app.

---

## 1. Open Redirect Vulnerability

### What is it?

An **open redirect** happens when your app redirects users to a URL controlled by an attacker.

### How it applies to auth

Your callback route accepts a `next` parameter:

```
/auth/callback?code=xxx&next=/dashboard
```

If you don't validate `next`, an attacker can craft:

```
/auth/callback?code=xxx&next=https://evil.com/steal-session
```

After the user logs in (legitimately), they get redirected to the attacker's site. The attacker can then phish the user or steal sensitive data from the referrer.

### The fix

```ts
let next = searchParams.get('next') ?? '/'

// Only allow relative paths
if (!next.startsWith('/')) {
  next = '/'
}
```

This ensures the redirect stays within your app. An absolute URL like `https://evil.com` doesn't start with `/`, so it gets replaced with `/`.

### Extra hardening

For maximum security, you could also block `//evil.com` (protocol-relative URLs):

```ts
if (!next.startsWith('/') || next.startsWith('//')) {
  next = '/'
}
```

---

## 2. `getUser()` vs `getSession()` — Always Validate Server-Side

### The rule

| Method | Use for |
|--------|---------|
| `getUser()` | **Any security decision** (route protection, data access, auth checks) |
| `getSession()` | **Non-security reads** (showing UI, getting metadata for display only) |

### Why?

`getSession()` reads the JWT from the cookie and decodes it **locally**. It never contacts Supabase's server. This means:

- A tampered JWT would pass (if the attacker modifies the cookie)
- An expired JWT might still decode successfully
- A revoked session wouldn't be caught

`getUser()` sends the JWT to Supabase's auth server for validation. If the token is invalid, tampered, or revoked, Supabase rejects it.

### Where this matters most

- **Middleware** — deciding whether to block a request
- **Server Components** — reading user data before rendering
- **Route Handlers** — any API endpoint that modifies data
- **Server Actions** — any mutation triggered by a form

---

## 3. Middleware Is Not Optional

### Without middleware

```
User logs in → gets JWT (expires in 1 hour)
    │
    ▼
User browses for 2 hours
    │
    ▼
JWT is expired → getUser() returns null
    │
    ▼
User appears logged out (even though refresh token is valid)
```

### With middleware

```
User logs in → gets JWT (expires in 1 hour)
    │
    ▼
User browses for 2 hours
    │
    ▼
Middleware detects expired JWT → uses refresh token → issues new JWT
    │
    ▼
User stays logged in seamlessly
```

### What middleware must do

1. Call `getUser()` on every request (this triggers token refresh if needed)
2. Return the `supabaseResponse` (which contains updated cookies)

If you return a different `NextResponse` without the cookies, the refreshed tokens won't reach the browser.

---

## 4. Supabase Redirect URL Allowlist

### The risk

Without an allowlist, `signInWithOAuth({ redirectTo: ... })` would accept any URL. An attacker could create a link like:

```
https://yourapp.com/login?redirect=https://evil.com/capture
```

And if your login page passes that redirect through, the user ends up at the attacker's site after login.

### The protection

Supabase lets you configure **Redirect URLs** in the Dashboard (Authentication → URL Configuration). Only URLs in this list are accepted as `redirectTo` targets.

### What to add

```
http://localhost:3000/auth/callback        ← development
https://yourapp.com/auth/callback          ← production
https://staging.yourapp.com/auth/callback  ← staging
```

**Never add wildcard patterns** like `https://*.com/*` — this defeats the purpose of the allowlist.

---

## 5. Environment Variable Security

### Public vs secret keys

| Variable | Public? | Where to use |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Anywhere (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anywhere (client + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | **NO** | Server only (never expose to client) |

### The anon key is not a secret

The anon key is meant to be public. It only grants the permissions defined by your RLS policies. If RLS is enabled and properly configured, the anon key can't be used to access unauthorized data.

### The service role key IS a secret

The service role key **bypasses RLS entirely**. If exposed:
- Anyone can read/write/delete any data in your database
- Anyone can manage users (create, delete, impersonate)
- This is a full database compromise

**Never put the service role key in a `NEXT_PUBLIC_` variable.** Never use it in Client Components.

---

## 6. Cookie Security

### What `@supabase/ssr` does for you

The SSR package handles cookie configuration. But you should understand the security properties:

| Cookie attribute | What it does |
|-----------------|-------------|
| `HttpOnly` | Cookie is not accessible via JavaScript (prevents XSS theft) |
| `Secure` | Cookie is only sent over HTTPS (prevents interception) |
| `SameSite=Lax` | Cookie is not sent on cross-site requests (prevents CSRF) |
| `Path=/` | Cookie is available on all routes |

In development (`http://localhost`), `Secure` is relaxed. In production, always use HTTPS.

---

## 7. Error Handling in the Callback

### Don't silently succeed

```ts
// BAD — no error handling
if (code) {
  await supabase.auth.exchangeCodeForSession(code)
}
return NextResponse.redirect(`${origin}${next}`)

// GOOD — handle errors explicitly
if (code) {
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error) {
    return NextResponse.redirect(`${origin}${next}`)
  }
}
return NextResponse.redirect(`${origin}/auth/auth-code-error`)
```

If the code exchange fails (expired code, invalid code, network error), the user should see an error page — not be silently redirected to a page that says "you are not logged in."

---

## 8. Security Checklist

Use this checklist for every Supabase + Next.js project:

### Auth Setup
- [ ] Middleware is in place and calls `getUser()` on every request
- [ ] Callback route validates the `next` parameter (open redirect prevention)
- [ ] Callback route handles `exchangeCodeForSession` errors
- [ ] Error page exists at `/auth/auth-code-error`
- [ ] `getUser()` is used (not `getSession()`) for all auth checks

### Supabase Dashboard
- [ ] Google provider enabled with correct Client ID and Secret
- [ ] Redirect URLs allowlist configured (only your app's domains)
- [ ] No wildcard patterns in redirect URLs
- [ ] RLS enabled on all tables

### Environment
- [ ] `.env.local` is in `.gitignore`
- [ ] Service role key is never in `NEXT_PUBLIC_` variables
- [ ] No `console.log` of user data in production code

### Production
- [ ] HTTPS is enforced (for `Secure` cookies)
- [ ] Production redirect URL added to Supabase allowlist
- [ ] Forwarded host handling in callback route (for load balancers)

---

## Summary

| Vulnerability | Fix |
|--------------|-----|
| Open redirect | Validate `next` starts with `/` |
| JWT forgery | Use `getUser()` not `getSession()` |
| Session expiry | Add middleware with token refresh |
| Arbitrary redirect | Use Supabase redirect URL allowlist |
| Secret key leak | Never expose service role key to client |
| Silent auth failure | Handle errors in callback route |
| User data in logs | Remove `console.log(data)` |

---

This completes the auth-google course. You now have a secure, production-ready Google OAuth setup with Next.js and Supabase.
