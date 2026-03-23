# Step 2 — Configure Google OAuth (Supabase + Google Cloud)

## Goal

Set up the trust chain: Google trusts Supabase, Supabase trusts your app.

---

## Part A: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a name, set a database password, select a region
4. Wait for the project to be provisioned (~2 minutes)

Once ready, go to **Project Settings → API** and copy:

| Value | What it is |
|-------|-----------|
| **Project URL** | `https://<your-ref>.supabase.co` — your Supabase backend address |
| **anon / public key** | A public key safe for client-side use (it's not a secret — RLS protects your data) |

---

## Part B: Create Google OAuth Credentials

### 1. Go to Google Cloud Console

- Visit [console.cloud.google.com](https://console.cloud.google.com)
- Create a new project (or select an existing one)

### 2. Configure the OAuth Consent Screen

Go to **APIs & Services → OAuth consent screen**:

- Choose **External** (unless you're in a Google Workspace org)
- Fill in the app name, support email
- Add your domain (for production) — skip for now during development
- Click through the scopes and test users sections

### 3. Create OAuth Client ID

Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:

- Application type: **Web application**
- Name: anything (e.g., "Supabase Auth")

**Authorized redirect URIs** — add:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

You can find the exact URL in the Supabase Dashboard under **Authentication → Providers → Google**.

> **This is Redirect 1** (Google → Supabase). It tells Google: "after login, send the user to Supabase."

### 4. Copy the credentials

Google gives you:
- **Client ID** (looks like `123456-xxxxx.apps.googleusercontent.com`)
- **Client Secret** (a random string)

---

## Part C: Enable Google Provider in Supabase

1. In Supabase Dashboard, go to **Authentication → Providers**
2. Find **Google** and toggle it **ON**
3. Paste the **Client ID** and **Client Secret** from Google
4. Save

---

## Part D: Add Your App's Redirect URL in Supabase

In Supabase Dashboard, go to **Authentication → URL Configuration**:

Add your app's callback URL to **Redirect URLs**:

```
http://localhost:3000/auth/callback
```

For production, also add:

```
https://yourdomain.com/auth/callback
```

> **This is Redirect 2** (Supabase → Your App). It tells Supabase: "after auth is done, it's safe to send the user to these URLs."

### Why this matters for security

If you skip this step, an attacker could craft a login link with `redirectTo=https://evil.com/steal-token` and Supabase would send the user there after login. The allowlist prevents this.

---

## The Full Trust Chain

```
Google Cloud Console                Supabase Dashboard              Your Code
─────────────────────              ──────────────────              ─────────
Authorized redirect URI:           Redirect URLs:                  redirectTo:
supabase.co/auth/v1/callback       localhost:3000/auth/callback    /auth/callback

         Google ───────────► Supabase ───────────► Your App
              (Redirect 1)           (Redirect 2)
```

All three must be consistent. If any URL doesn't match, auth will fail.

---

## Checklist

- [ ] Supabase project created, URL and anon key copied
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth Client ID created with correct redirect URI
- [ ] Google provider enabled in Supabase with Client ID + Secret
- [ ] App callback URL added to Supabase redirect URLs

---

**Next:** [03_env-and-clients.md](./03_env-and-clients.md) — Set up environment variables and create the Supabase clients
