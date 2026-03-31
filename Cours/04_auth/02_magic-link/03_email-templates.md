# Step 3 — Email Templates

## Goal

Understand how to customize the Magic Link email that Supabase sends to users.

---

## 1. The default email

By default, Supabase sends a plain email that looks roughly like:

```
Subject: Magic Link

Follow this link to login:

https://127.0.0.1:54321/auth/v1/verify?token=abc123&type=magiclink&redirect_to=http://localhost:3000/auth/callback
```

This works for development, but in production you want a **branded, professional email** that users trust and recognize.

---

## 2. Email template types

Supabase has templates for different auth-related emails:

| Template key | When it's sent |
|-------------|---------------|
| `magic_link` | User requests a Magic Link login |
| `confirmation` | User signs up (if `enable_confirmations = true`) |
| `recovery` | User requests password reset |
| `email_change` | User changes their email address |
| `invite` | Admin invites a user |

For Magic Link, we care about the `magic_link` template.

---

## 3. Customizing templates locally

Templates are configured in `config.toml` and stored as HTML files.

### Step 1: Create a templates folder

```bash
mkdir -p supabase/templates
```

### Step 2: Add the template config to `config.toml`

```toml
[auth.email.template.magic_link]
subject = "Your login link for Todos"
content_path = "./supabase/templates/magic_link.html"
```

### Step 3: Write the HTML template

Create `supabase/templates/magic_link.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login to Todos</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #f4f4f5; margin: 0;">
  <div style="max-width: 460px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 24px; margin: 0 0 16px 0; color: #18181b;">
      Login to Todos
    </h1>
    <p style="font-size: 16px; color: #3f3f46; line-height: 1.5; margin: 0 0 24px 0;">
      Click the button below to log in. This link expires in 1 hour and can only be used once.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; background-color: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 500;">
      Log in to Todos
    </a>
    <p style="font-size: 14px; color: #71717a; margin: 24px 0 0 0; line-height: 1.5;">
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>
```

### Step 4: Restart Supabase

```bash
supabase stop && supabase start
```

Templates are loaded at startup, so you need to restart for changes to take effect.

---

## 4. Template variables

Templates use **Go template syntax** (`{{ .Variable }}`). Available variables:

| Variable | Value | Example |
|----------|-------|---------|
| `{{ .ConfirmationURL }}` | The full Magic Link URL | `http://127.0.0.1:54321/auth/v1/verify?token=abc&type=magiclink&redirect_to=...` |
| `{{ .Token }}` | The raw OTP token | `123456` |
| `{{ .TokenHash }}` | The hashed token | `abc123def456...` |
| `{{ .SiteURL }}` | Your `site_url` from config | `http://127.0.0.1:3000` |
| `{{ .Email }}` | The user's email | `user@example.com` |
| `{{ .RedirectTo }}` | The redirect URL after verification | `http://localhost:3000/auth/callback` |

### Which variable to use?

For Magic Link with PKCE, use **`{{ .ConfirmationURL }}`** — it's the complete URL that handles verification and redirects. You don't need to build the URL yourself from `Token` or `TokenHash`.

```html
<!-- GOOD — one variable does everything -->
<a href="{{ .ConfirmationURL }}">Log in</a>

<!-- Unnecessary — ConfirmationURL already contains this -->
<a href="{{ .SiteURL }}/auth/verify?token={{ .TokenHash }}&type=magiclink">
```

---

## 5. All template types in `config.toml`

For reference, here's how to customize all email templates:

```toml
# Magic Link login
[auth.email.template.magic_link]
subject = "Your login link for Todos"
content_path = "./supabase/templates/magic_link.html"

# Email confirmation (if enable_confirmations = true)
[auth.email.template.confirmation]
subject = "Confirm your email for Todos"
content_path = "./supabase/templates/confirmation.html"

# Password recovery
[auth.email.template.recovery]
subject = "Reset your password for Todos"
content_path = "./supabase/templates/recovery.html"

# Email change confirmation
[auth.email.template.email_change]
subject = "Confirm your new email for Todos"
content_path = "./supabase/templates/email_change.html"

# Admin invitation
[auth.email.template.invite]
subject = "You've been invited to Todos"
content_path = "./supabase/templates/invite.html"
```

You only need to create the templates you actually use. For now, `magic_link` is the only one that matters.

---

## 6. Sign-up vs sign-in behavior

When `signInWithOtp({ email })` is called, Supabase checks if the email exists:

| Scenario | What happens | `enable_signup` required? |
|----------|-------------|--------------------------|
| **New email** | Creates a new user in `auth.users`, sends Magic Link | Yes (`enable_signup = true`) |
| **Existing email (Magic Link)** | Sends Magic Link to existing user | No |
| **Existing email (Google)** | Links Magic Link identity to existing Google user | Depends on `enable_manual_linking` |

### Account linking

If a user signed up with Google (`john@gmail.com`) and later tries Magic Link with the same email:

- **Default behavior**: Supabase auto-links the identities. The user gets one account with two auth methods. In `auth.users`, `raw_app_meta_data.providers` becomes `["google", "email"]`.
- **With `enable_manual_linking = true`**: Auto-linking is disabled. The user must explicitly link accounts. This is more secure but adds complexity.

Your `config.toml` has `enable_manual_linking = false` (default), so auto-linking is active.

---

## 7. Email design best practices (for production)

| Practice | Why |
|----------|-----|
| **Brand the email** | Use your logo, colors, app name — users must recognize it |
| **Clear call-to-action** | One big button: "Log in to Todos" — not a raw URL |
| **Mention expiry** | "This link expires in 1 hour" — sets expectations |
| **Add ignore notice** | "If you didn't request this..." — standard safety message |
| **Keep it simple** | No marketing, no images — just the login link |
| **Test in email clients** | Gmail, Outlook, Apple Mail all render HTML differently |
| **Use inline CSS** | Email clients strip `<style>` tags — use `style=""` attributes |
| **Set sender name** | "Todos App" not "noreply@localhost" — configured in SMTP settings |

---

## Summary

| Item | Value |
|------|-------|
| Template location | `supabase/templates/magic_link.html` |
| Config key | `[auth.email.template.magic_link]` |
| Key variable | `{{ .ConfirmationURL }}` — the full Magic Link URL |
| Syntax | Go templates (`{{ .Variable }}`) |
| Restart required | Yes — templates load at `supabase start` |
| Sign-up behavior | Auto-creates user if `enable_signup = true` |
| Account linking | Auto-links same email across providers by default |

---

**Next:** [04_login-page.md](./04_login-page.md) — Update the login page with email input and Magic Link button
