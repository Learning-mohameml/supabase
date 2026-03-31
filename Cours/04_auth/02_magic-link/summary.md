# Magic Link — Summary & Reference

Complete reference of everything covered in this sub-chapter.

---

## Flow diagram

```
User enters email → signInWithOtp() → Supabase sends email
                                            │
                          User clicks link in email
                                            │
                          Supabase /auth/v1/verify (verifies token)
                                            │
                          Redirect to /auth/callback?code=xxx
                                            │
                          exchangeCodeForSession(code)
                                            │
                          Session cookies set → redirect to /dashboard
```

---

## Files changed

| File | Change |
|------|--------|
| `lib/supabase/auth/client.ts` | Add `signInWithMagicLink(email)` function |
| `app/login/page.tsx` | Add email input, Magic Link button, divider, success state |

## Files unchanged (reused from Google OAuth)

| File | Why no changes needed |
|------|----------------------|
| `lib/supabase/clients/client.ts` | Auth-method agnostic |
| `lib/supabase/clients/server.ts` | Auth-method agnostic |
| `lib/supabase/clients/middleware.ts` | Uses `getUser()`, works for all auth |
| `proxy.ts` | Calls middleware |
| `app/auth/callback/route.ts` | `exchangeCodeForSession()` works for all auth methods |
| `app/auth/auth-code-error/page.tsx` | Generic error page |
| `lib/supabase/auth/queries.ts` | `getUser()` doesn't care how user logged in |
| `supabase/config.toml` | Email auth already enabled by default |

---

## Key code

### `signInWithMagicLink()` — `lib/supabase/auth/client.ts`

```typescript
export async function signInWithMagicLink(email: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
}
```

---

## Supabase config reference

```toml
# Already in config.toml — no changes needed

[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "http://127.0.0.1:3000/auth/callback",
  "http://localhost:3000/auth/callback"
]

[auth.email]
enable_signup = true
otp_expiry = 3600          # Magic Link valid for 1 hour
otp_length = 6
max_frequency = "1s"

[auth.rate_limit]
email_sent = 2             # Max 2 emails per hour per user
```

---

## PKCE vs verifyOtp — when to use each

| Approach | Method | When |
|----------|--------|------|
| **PKCE** (ours) | `exchangeCodeForSession(code)` in callback route | SSR apps with `@supabase/ssr` |
| **verifyOtp** | `verifyOtp({ token_hash, type })` in client code | Client-only SPAs without SSR |

We use PKCE because we have a Next.js server. The callback route handles everything — no `verifyOtp()` needed.

---

## Local testing URLs

| Service | URL |
|---------|-----|
| Next.js app | `http://localhost:3000` |
| Login page | `http://localhost:3000/login` |
| Supabase API | `http://127.0.0.1:54321` |
| Inbucket (email) | `http://127.0.0.1:54324` |
| Supabase Studio | `http://127.0.0.1:54323` |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Email not in Inbucket | Wrong mailbox | Check the email prefix (e.g., `test` for `test@example.com`) |
| "Rate limit exceeded" | Too many requests | Wait, or increase `email_sent` in `config.toml` |
| Link goes to error page | Expired or already used | Send a new Magic Link |
| Session not persisting | Middleware not running | Check `proxy.ts` matcher config |
| User not in `auth.users` | Email not sent | Check Supabase logs (`docker logs supabase_auth_todos`) |
