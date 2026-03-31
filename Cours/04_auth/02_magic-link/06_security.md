# Step 5 — Security Considerations

## Goal

Understand the security properties and risks specific to Magic Link authentication.

---

## 1. Security model: email inbox = identity

With Magic Link, the security assumption is:

> **If you control the email inbox, you are the user.**

This is fundamentally different from password-based auth (where "knowing the secret" = identity) or OAuth (where "the provider vouches" = identity).

### Implications

| Factor | Impact |
|--------|--------|
| Email account compromised | Attacker can log in as any user with that email |
| Shared email access | Anyone with inbox access can use the link |
| Email forwarding | Forwarded Magic Links are valid |
| Email interception | Man-in-the-middle can steal the link |

These risks are inherent to all email-based auth (password reset links have the same model). Mitigations are below.

---

## 2. Built-in protections from Supabase

### Single-use tokens

Each Magic Link can only be used **once**. After the first click exchanges the code for a session, the token is invalidated. A second click on the same link results in an error.

### Token expiry

Magic Links expire after `otp_expiry` seconds (default: 3600 = 1 hour). After expiry, the link is dead and the user must request a new one.

```toml
[auth.email]
otp_expiry = 3600  # 1 hour — reasonable for most apps
```

For higher security, reduce this:

```toml
otp_expiry = 600  # 10 minutes — stricter
```

### Rate limiting

Supabase limits how many emails can be sent:

```toml
[auth.rate_limit]
email_sent = 2              # per hour per user
sign_in_sign_ups = 30       # total sign-in attempts per 5 min
token_verifications = 30    # total verifications per 5 min
```

This prevents:
- **Brute force**: Can't spam emails to overwhelm a user's inbox
- **Enumeration**: Rate limits make it hard to discover valid emails
- **Abuse**: Can't use your app as an email spam tool

### PKCE protection

Since we use the PKCE flow, the `code` in the callback URL is useless without the `code_verifier` stored in the browser that initiated the request. Even if someone intercepts the callback URL, they can't exchange the code from a different browser/device.

---

## 3. Application-level protections

### Open redirect prevention (already done)

Your callback route at `app/auth/callback/route.ts` already validates the `next` parameter:

```typescript
if (!next.startsWith('/') || next.startsWith('//')) {
  next = '/'
}
```

This prevents an attacker from crafting a Magic Link that redirects to a malicious site after login.

### Email validation on the client

Basic HTML5 validation (`type="email"`) prevents obviously malformed emails. For production, consider:

```typescript
// Minimal server-side validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  return { error: 'Invalid email address' }
}
```

### Don't expose whether an email exists

When `signInWithOtp()` is called with a non-existent email, Supabase creates a new user (if `enable_signup = true`) or returns the same success response. This is by design — it prevents **email enumeration** (discovering which emails have accounts).

**Important:** Don't add custom logic that reveals "this email is not registered" — it's an information leak.

---

## 4. Comparing security: Magic Link vs Google OAuth

| Security aspect | Magic Link | Google OAuth |
|----------------|-----------|-------------|
| **Auth factor** | Email inbox access | Google account (password + optional 2FA) |
| **Phishing risk** | Medium — fake emails can trick users | Low — Google's login page is harder to fake |
| **Account recovery** | Send another Magic Link | Google's own recovery |
| **Token interception** | PKCE protects the exchange | PKCE protects the exchange |
| **Session security** | Same (JWT in HttpOnly cookies) | Same |
| **2FA support** | Depends on email provider | Google supports 2FA natively |

### When to prefer each

| Use case | Best choice |
|----------|------------|
| Internal tools / dev teams | Magic Link (simple, no Google dependency) |
| Consumer apps | Both (let users choose) |
| High-security apps | OAuth with 2FA-enabled provider |
| Privacy-conscious users | Magic Link (no Google tracking) |

---

## 5. Production security checklist

For when you deploy to production (Chapter 06):

- [ ] **SMTP over TLS** — email content (including Magic Link) is encrypted in transit
- [ ] **Short OTP expiry** — reduce `otp_expiry` to 600-900 seconds (10-15 min)
- [ ] **Low rate limits** — keep `email_sent` low (2-5 per hour) in production
- [ ] **HTTPS only** — `site_url` and all redirect URLs must use `https://`
- [ ] **Custom email templates** — brand the Magic Link email so users recognize it (reduces phishing risk)
- [ ] **Monitor auth logs** — watch for unusual patterns (many failed verifications, rapid sign-ups)
- [ ] **RLS enabled** — Magic Link authenticates the user, but RLS secures the data (Chapter 05)

---

## Summary

| Protection | Source | Status |
|-----------|--------|--------|
| Single-use tokens | Supabase built-in | Automatic |
| Token expiry | `config.toml` | Default 1 hour |
| Rate limiting | `config.toml` | Default 2/hour |
| PKCE flow | `@supabase/ssr` | Automatic |
| Open redirect prevention | Callback route | Already implemented |
| Email enumeration prevention | Supabase built-in | Automatic |
| HTTPS | Production config | Chapter 06 |
| RLS | Database policies | Chapter 05 |

---

**Next:** [summary.md](./summary.md) — Complete reference for the Magic Link implementation
