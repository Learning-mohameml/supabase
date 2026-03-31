# Step 4 — Local Testing with Inbucket

## Goal

Test the full Magic Link login flow using Inbucket (the local email server that comes with `supabase start`).

---

## 1. The test flow

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Login   │     │ Supabase │     │   Inbucket   │     │ Callback │
│  Page    │     │ (GoTrue) │     │ :54324       │     │ Route    │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
     │                │                  │                   │
 1.  │ Enter email    │                  │                   │
     │ Click "Send"   │                  │                   │
     │                │                  │                   │
 2.  ├───POST────────►│                  │                   │
     │                │                  │                   │
 3.  │                ├───email──────────►│                   │
     │                │                  │                   │
 4.  │  "Check your   │                  │                   │
     │   email!"      │                  │                   │
     │                │                  │                   │
 5.  │   Open Inbucket (http://127.0.0.1:54324)              │
     │   Find email, click the Magic Link                    │
     │                │                  │                   │
 6.  │────────────────│──────────────────│──────────────────►│
     │                │                  │    /auth/callback  │
     │                │                  │    ?code=xxx       │
     │                │                  │                   │
 7.  │                │◄─── exchangeCodeForSession ──────────┤
     │                │                  │                   │
 8.  │◄──── redirect to /dashboard ──────────────────────────┤
     │   (with session cookies)          │                   │
     ▼                ▼                  ▼                   ▼
```

---

## 2. Step-by-step testing

### Step 1: Start the local stack

Make sure Supabase and Next.js are running:

```bash
supabase start        # if not already running
npm run dev           # start Next.js
```

### Step 2: Go to the login page

Open `http://localhost:3000/login` in your browser.

### Step 3: Enter an email and send

Type any email address (it doesn't need to be real — Inbucket captures everything):

```
test@example.com
```

Click "Send Magic Link". You should see the "Check your email!" confirmation.

### Step 4: Open Inbucket

Open `http://127.0.0.1:54324` in a new tab. This is the Inbucket web UI.

You should see an email for `test@example.com` with a subject like "Magic Link" or "Confirm your signup".

### Step 5: Click the Magic Link

Open the email in Inbucket and click the Magic Link URL. This will:
1. Go to Supabase's `/auth/v1/verify` endpoint
2. Supabase verifies the token
3. Supabase redirects to `http://localhost:3000/auth/callback?code=xxx`
4. Your callback route exchanges the code for a session
5. You're redirected to `/dashboard`

### Step 6: Verify you're logged in

You should now be on the dashboard, logged in as `test@example.com`. Check that:
- The user's email appears in the UI
- You can create todos, categories, etc.
- Refreshing the page keeps you logged in (session cookies work)

---

## 3. Testing edge cases

### Rate limiting

Send more than 2 Magic Links within an hour (the default `email_sent` limit). You should get an error from `signInWithOtp()`:

```
"For security purposes, you can only request this once every 60 seconds"
```

Your login page should display this as a toast error.

### Expired link

Wait for the OTP to expire (default: 3600 seconds / 1 hour — or set `otp_expiry` lower in `config.toml` for faster testing). Click the expired link. You should:
1. Land at `/auth/callback?code=xxx`
2. `exchangeCodeForSession()` fails (expired code)
3. Get redirected to `/auth/auth-code-error`

### Invalid email format

Try submitting an invalid email (e.g., `notanemail`). The HTML5 `type="email"` validation should prevent submission. If it gets through, `signInWithOtp()` returns an error.

### Same email, different auth methods

If you signed up with Google (`john@gmail.com`) and then try a Magic Link with the same email, Supabase handles this gracefully — it recognizes the existing user and links the Magic Link login to the same account. The user gets one account with two auth methods.

> **Note:** This behavior depends on `enable_manual_linking` in `config.toml`. By default, Supabase auto-links identities with the same email.

---

## 4. Debugging common issues

### "Email not received"

For local development, this is always an Inbucket issue:

| Check | Fix |
|-------|-----|
| Inbucket not running | Run `supabase start` (starts all services) |
| Wrong Inbucket URL | Check `supabase status` for the correct port |
| Email in wrong inbox | Inbucket uses the email prefix as the "mailbox" — look for `test` if you used `test@example.com` |

### "Link doesn't work" / auth-code-error

| Check | Fix |
|-------|-----|
| Link expired | Send a new one (default expiry: 1 hour) |
| Link already used | Each Magic Link is single-use — send a new one |
| Callback URL mismatch | Check `additional_redirect_urls` in `config.toml` |
| Wrong port | Make sure Next.js is on `:3000` and Supabase on `:54321` |

### "Rate limit exceeded"

Increase the limit in `config.toml` for development:

```toml
[auth.rate_limit]
email_sent = 100  # generous for dev — keep low in production
```

Then restart Supabase:

```bash
supabase stop && supabase start
```

---

## 5. What to verify in Supabase Studio

Open Supabase Studio at `http://127.0.0.1:54323` and check the `auth.users` table:

- A new row should exist for `test@example.com`
- The `email` column shows the email
- The `raw_app_meta_data` column shows `"provider": "email"`
- If the same email was used with Google, `raw_app_meta_data` shows `"providers": ["google", "email"]`

---

## Summary

| Test | Expected result |
|------|----------------|
| Send Magic Link | "Check your email!" confirmation |
| Click link in Inbucket | Redirected to dashboard, logged in |
| Expired link | Redirected to `/auth/auth-code-error` |
| Rate limit exceeded | Error toast on login page |
| Same email as Google | Same account, two auth methods linked |
| Refresh after login | Still logged in (cookies persist) |

---

**Next:** [06_security.md](./06_security.md) — Security considerations specific to Magic Link authentication
