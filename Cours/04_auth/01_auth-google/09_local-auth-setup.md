# Step 9 — Local Auth with Supabase CLI

## Goal

Configure Google OAuth to work with the **local** Supabase stack (`supabase start`) so you can test the full auth flow without deploying to production.

---

## Why this matters

The existing course sections (01–08) set up auth via the **Supabase Dashboard** (cloud). But in a local-first workflow:

- You run `supabase start` — your auth server is at `http://127.0.0.1:54321`
- Google needs to redirect to your **local** Supabase, not the cloud one
- Supabase auth config lives in `config.toml`, not the Dashboard

If you skip this step, clicking "Sign in with Google" locally will either fail or redirect through your **production** Supabase project — not your local stack.

---

## 1. Update `config.toml`

Open `supabase/config.toml` and add the `[auth.external.google]` section:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
# Required for local Google sign-in — skips the OpenID Connect nonce check
# which can fail when auth runs on localhost
skip_nonce_check = true
```

### What each field does

| Field | Purpose |
|-------|---------|
| `enabled` | Turns on the Google provider locally |
| `client_id` | Your Google OAuth Client ID (same one from Google Cloud Console) |
| `secret` | Your Google OAuth Client Secret |
| `skip_nonce_check` | Bypasses the nonce verification — needed because the local auth server doesn't use HTTPS, which can break the nonce flow |

### Why `env()` instead of hardcoding?

`env(GOOGLE_CLIENT_ID)` tells Supabase CLI to read from environment variables. This avoids committing secrets to git — `config.toml` **is** committed, but the actual values live in a `.env` file that is not.

---

## 2. Create `supabase/.env`

Create a `.env` file inside the `supabase/` directory (not the project root):

```env
GOOGLE_CLIENT_ID=123456-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
```

> **Important:** This file should be in your `.gitignore`. Add `supabase/.env` if it's not already there.

The Supabase CLI automatically reads `supabase/.env` when running `supabase start`.

---

## 3. Verify the `[auth]` section

Make sure these fields are set correctly in `config.toml`:

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
```

| Field | What it does |
|-------|-------------|
| `site_url` | The base URL of your app — used as the default redirect and in email templates |
| `additional_redirect_urls` | Allowlist of URLs that `redirectTo` can point to (prevents open redirects) |

---

## 4. Add local callback URI in Google Cloud Console

Go to **Google Cloud Console → APIs & Services → Credentials → Your OAuth Client ID**.

In **Authorized redirect URIs**, add the **local Supabase** callback:

```
http://127.0.0.1:54321/auth/v1/callback
```

You should now have **two** redirect URIs:

```
http://127.0.0.1:54321/auth/v1/callback           ← local Supabase
https://<your-ref>.supabase.co/auth/v1/callback    ← production Supabase
```

> **Why `127.0.0.1` and not `localhost`?** Google treats them as different origins. The Supabase CLI binds to `127.0.0.1`, so the redirect URI must match exactly.

---

## 5. Restart the local stack

`config.toml` changes only take effect on startup. Restart:

```bash
supabase stop
supabase start
```

After restart, verify Google is enabled:

```bash
# Check the auth config in Studio
# Open http://127.0.0.1:54323 → Authentication → Providers
# Google should show as enabled
```

---

## 6. Update your app's `.env.local`

Make sure your Next.js app points to the **local** stack:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
```

The anon key is printed when you run `supabase start`. You can also get it with:

```bash
supabase status
```

---

## 7. The complete local flow

```
User clicks "Sign in with Google"
    │
    ▼
signInWithOAuth({ redirectTo: "http://localhost:3000/auth/callback" })
    │
    ▼
Browser → http://127.0.0.1:54321/auth/v1/authorize?provider=google
    │
    ▼
Supabase (local) → redirects to Google
    │
    ▼
User logs in at Google
    │
    ▼
Google → http://127.0.0.1:54321/auth/v1/callback?code=xxx   (Redirect 1)
    │
    ▼
Supabase (local) → http://localhost:3000/auth/callback?code=yyy   (Redirect 2)
    │
    ▼
App exchanges code → session set in cookies → user is logged in
```

---

## 8. Local vs Production — Config comparison

| Setting | Local (`config.toml`) | Production (Dashboard) |
|---------|----------------------|----------------------|
| Google provider | `[auth.external.google]` in config.toml | Authentication → Providers → Google |
| Client ID / Secret | `supabase/.env` via `env()` | Pasted directly in Dashboard |
| Site URL | `site_url = "http://127.0.0.1:3000"` | URL Configuration → Site URL |
| Redirect URLs | `additional_redirect_urls` | URL Configuration → Redirect URLs |
| skip_nonce_check | `true` (needed locally) | `false` (default, don't change) |
| Google redirect URI | `http://127.0.0.1:54321/auth/v1/callback` | `https://<ref>.supabase.co/auth/v1/callback` |

---

## 9. Troubleshooting

### "redirect_uri_mismatch" error from Google

The redirect URI in Google Cloud Console doesn't match what Supabase is sending. Make sure you added `http://127.0.0.1:54321/auth/v1/callback` (not `localhost`, not `https`).

### "provider is not enabled" error

Either `[auth.external.google]` is missing from `config.toml`, or you didn't restart (`supabase stop && supabase start`).

### "invalid nonce" error

Add `skip_nonce_check = true` to `[auth.external.google]` in `config.toml`. This is a known issue with local development.

### Login works in production but not locally (or vice versa)

Check that both redirect URIs are in Google Cloud Console, and that your `.env.local` points to the correct Supabase URL (`127.0.0.1:54321` for local, `<ref>.supabase.co` for prod).

---

## Checklist

- [ ] `[auth.external.google]` added to `config.toml` with `enabled = true`
- [ ] `supabase/.env` created with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] `supabase/.env` added to `.gitignore`
- [ ] `site_url` and `additional_redirect_urls` set correctly in `config.toml`
- [ ] `http://127.0.0.1:54321/auth/v1/callback` added to Google Cloud Console
- [ ] Local stack restarted (`supabase stop && supabase start`)
- [ ] `.env.local` points to local Supabase (`http://127.0.0.1:54321`)

---

**Previous:** [08_security-best-practices.md](./08_security-best-practices.md)
