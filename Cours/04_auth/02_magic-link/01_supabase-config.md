# Step 1 — Supabase Email Configuration

Before implementing Magic Link, let's verify that email authentication is properly configured in your local Supabase setup.

---

## 1. The good news: it's already enabled

If you look at your `supabase/config.toml`, the `[auth.email]` section is enabled by default:

```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false
max_frequency = "1s"
otp_length = 6
otp_expiry = 3600
```

This means Magic Link works out of the box locally — no configuration needed.

### What each setting means

| Setting | Value | Purpose |
|---------|-------|---------|
| `enable_signup` | `true` | New users can sign up via email (not just existing users) |
| `double_confirm_changes` | `true` | Email changes require confirmation from both old and new email |
| `enable_confirmations` | `false` | No email confirmation required after sign up (for dev simplicity) |
| `max_frequency` | `"1s"` | Minimum time between emails to the same address |
| `otp_length` | `6` | Length of the OTP code (if using code-based verification) |
| `otp_expiry` | `3600` | Magic Link expires after 1 hour (3600 seconds) |

---

## 2. Rate limits

The `[auth.rate_limit]` section controls how many auth emails can be sent:

```toml
[auth.rate_limit]
email_sent = 2
sms_sent = 30
token_refresh = 150
sign_in_sign_ups = 30
token_verifications = 30
```

The important one is `email_sent = 2` — only **2 emails per hour** per user. This prevents abuse but can be surprising during development when you're testing repeatedly. If you hit the limit, either wait or increase this value in `config.toml` and restart Supabase.

---

## 3. Local email testing with Inbucket

Locally, Supabase doesn't send real emails. Instead, all emails are captured by **Inbucket**, a local email testing server that runs as part of `supabase start`.

```
┌─────────────────┐        ┌──────────────────────┐
│ Supabase GoTrue  │──────►│ Inbucket             │
│ "sends" email    │        │ http://127.0.0.1:54324│
│                  │        │                      │
│                  │        │ Captures all emails   │
│                  │        │ Shows them in web UI  │
└─────────────────┘        └──────────────────────┘
```

Open **http://127.0.0.1:54324** in your browser. When you trigger a Magic Link, the email appears here within seconds. Click it to see the link and follow the login flow.

> The Inbucket port may vary — check `supabase status` for the exact URL (shown as "Mailpit" or "Inbucket").

---

## 4. Production SMTP (later — Chapter 06)

For production, you need a real SMTP provider so emails actually reach users. This is configured in `config.toml`:

```toml
# NOT needed for local development — Inbucket handles it
[auth.email.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
user = "apikey"
pass = "env(SMTP_PASSWORD)"
admin_email = "noreply@yourdomain.com"
sender_name = "Todos App"
```

Common SMTP providers: **SendGrid**, **Resend**, **Postmark**, **AWS SES**.

We won't configure this now — it belongs in Chapter 06 (Production). For local development, Inbucket is all we need.

---

## 5. Redirect URL allowlist

The callback URL for Magic Link is the same as for Google OAuth: `/auth/callback`. This is already in your `config.toml`:

```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "http://127.0.0.1:3000/auth/callback",
  "http://localhost:3000/auth/callback"
]
```

No changes needed — Magic Link reuses the same redirect configuration.

---

## Summary

| Item | Status |
|------|--------|
| Email auth enabled | Already done (default) |
| Rate limits configured | Already done (2 emails/hour) |
| Local email testing | Inbucket at `http://127.0.0.1:54324` |
| Redirect URL allowlist | Already configured for `/auth/callback` |
| Production SMTP | Deferred to Chapter 06 |

**No configuration changes required** — your local Supabase is ready for Magic Link.

---

**Next:** [02_sign-in-function.md](./02_sign-in-function.md) — Implement the `signInWithMagicLink()` function
