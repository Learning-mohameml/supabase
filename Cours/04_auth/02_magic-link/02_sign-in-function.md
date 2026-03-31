# Step 2 — The `signInWithMagicLink()` Function

## Goal

Add a `signInWithMagicLink(email)` function alongside the existing `signInWithGoogle()`.

---

## 1. Two ways to verify a Magic Link

Supabase supports two flows for Magic Link verification. Which one you use depends on your architecture:

### Flow A: PKCE / Server-side (our approach)

```
signInWithOtp({ email, emailRedirectTo })
    │
    ▼
Supabase sends email with link to Supabase's /auth/v1/verify endpoint
    │
    ▼
User clicks link → Supabase verifies token server-side
    │
    ▼
Supabase redirects to YOUR APP /auth/callback?code=xxx
    │
    ▼
Your route handler calls exchangeCodeForSession(code)
    │
    ▼
Session established (cookies set)
```

This is what we use because:
- We have a Next.js server (SSR)
- We use `@supabase/ssr` with PKCE
- Our `/auth/callback` route already handles `exchangeCodeForSession()`
- Same flow as Google OAuth — the callback doesn't care which auth method was used

### Flow B: Client-side / `verifyOtp()` (not our approach)

```
signInWithOtp({ email })  ← no emailRedirectTo
    │
    ▼
Supabase sends email with link containing #token_hash=xxx&type=magiclink
    │
    ▼
User clicks link → your client-side code extracts token_hash from URL
    │
    ▼
Your app calls verifyOtp({ token_hash, type: 'email' })
    │
    ▼
Session established
```

This is used when:
- You have a client-only SPA (no server)
- You don't use `@supabase/ssr`
- You want to verify OTP codes typed by the user (6-digit code)

**We don't use this.** If you see `verifyOtp()` in the Supabase docs, it's for this alternative setup.

### Why does this matter?

Because the `emailRedirectTo` option is what tells Supabase to use the PKCE flow. Without it, Supabase falls back to the client-side flow with `token_hash`. **Always include `emailRedirectTo` in an SSR setup.**

---

## 2. The implementation

Add this function to `lib/supabase/auth/client.ts`:

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

## 3. Line-by-line explanation

### `signInWithOtp()`

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

What this does:
1. Sends a POST request to Supabase's GoTrue server
2. Supabase creates or finds the user with this email
3. Supabase generates a one-time token and embeds it in a Magic Link URL
4. Supabase sends the email (via Inbucket locally, SMTP in production)
5. Returns `{ error: null }` if the email was sent successfully

### `emailRedirectTo`

```typescript
emailRedirectTo: `${window.location.origin}/auth/callback`
```

This tells Supabase: "After the user clicks the Magic Link, redirect them to my `/auth/callback` route."

**Critical:** This is what triggers the PKCE flow. The Magic Link email will contain a link like:

```
http://127.0.0.1:54321/auth/v1/verify?token=TOKEN&type=magiclink&redirect_to=http://localhost:3000/auth/callback
```

When the user clicks this:
1. Goes to Supabase's `/auth/v1/verify` endpoint
2. Supabase verifies the token
3. Supabase redirects to `http://localhost:3000/auth/callback?code=SUPABASE_CODE`
4. Your existing callback route handles the rest

### Why `window.location.origin`?

Same reason as `signInWithGoogle()` — it works in all environments:
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

### Error handling

```typescript
if (error) throw error
```

The calling component (login page) will catch this and show a toast. Possible errors:
- Rate limit exceeded (too many emails sent)
- Invalid email format
- Email provider disabled

### No session is returned

Unlike `signInWithPassword()`, `signInWithOtp()` does **not** return a session. It only triggers the email. The session is created later, when the user clicks the link and the callback route exchanges the code.

---

## 4. Comparing with `signInWithGoogle()`

```typescript
// Google OAuth
export async function signInWithGoogle() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

// Magic Link
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

| Difference | Google OAuth | Magic Link |
|-----------|-------------|------------|
| Method | `signInWithOAuth()` | `signInWithOtp()` |
| Input | Provider name (`"google"`) | User's email |
| Redirect option | `redirectTo` | `emailRedirectTo` |
| Immediate effect | Browser redirects to Google | Email is sent (no redirect) |
| Error handling | Redirect fails silently | Returns `{ error }` we can display |

### Why `redirectTo` vs `emailRedirectTo`?

- `redirectTo` — used by OAuth. The browser is immediately redirected, so the option name is literal: "redirect to this URL"
- `emailRedirectTo` — used by OTP/Magic Link. The redirect happens later (when the user clicks the email link), so it's "the redirect URL to embed in the email"

---

## 5. What you should NOT do

### Don't forget `emailRedirectTo`

```typescript
// BAD — falls back to client-side flow with token_hash
await supabase.auth.signInWithOtp({ email })

// GOOD — triggers PKCE flow, uses your callback route
await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

Without `emailRedirectTo`, the email link won't go through your callback route, and the SSR session won't be established properly.

### Don't use `verifyOtp()` in an SSR setup

```typescript
// BAD — this is for client-only apps
await supabase.auth.verifyOtp({ token_hash, type: 'email' })

// GOOD — let the callback route handle it
// (nothing to do here — the callback route already exists)
```

The callback route at `app/auth/callback/route.ts` already calls `exchangeCodeForSession()`, which handles the verification automatically.

---

## Summary

| Item | Value |
|------|-------|
| Function | `signInWithMagicLink(email: string)` |
| Supabase method | `signInWithOtp({ email, options: { emailRedirectTo } })` |
| Flow | PKCE (server-side code exchange) |
| Callback route | Reuses existing `/auth/callback` unchanged |
| Returns | Nothing (email is sent, user clicks link later) |

---

**Next:** [03_email-templates.md](./03_email-templates.md) — Customize the Magic Link email template
