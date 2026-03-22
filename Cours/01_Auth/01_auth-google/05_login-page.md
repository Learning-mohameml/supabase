# Step 5 — The Login Page

## Goal

Create a login page with a "Sign in with Google" button that starts the OAuth flow.

---

## 1. Create the login page

Create `app/login/page.tsx`:

```tsx
'use client'

import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main>
      <h1>Login</h1>
      <button onClick={handleLogin}>Sign in with Google</button>
    </main>
  )
}
```

---

## 2. Line-by-line explanation

### `'use client'`

```tsx
'use client'
```

This file must be a **Client Component** because:
- It uses `onClick` (event handler — browser only)
- It uses `window.location` (browser API)
- It uses the browser Supabase client

Server Components cannot do any of these things.

### Creating the browser client

```tsx
const supabase = createClient()
```

This creates a Supabase client that runs in the browser. We use the **browser** client here (from `utils/supabase/client.ts`), not the server one.

### Starting the OAuth flow

```tsx
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

What this does:
1. Supabase generates the Google OAuth URL (with PKCE challenge)
2. The browser is redirected to Google's login page
3. After the user logs in at Google, Google redirects to Supabase
4. Supabase redirects to your `redirectTo` URL (your callback route)

### The `redirectTo` option

```tsx
redirectTo: `${window.location.origin}/auth/callback`
```

This tells Supabase: "after you process the Google login, send the user back to my `/auth/callback` route."

**Important:** This URL must be in your Supabase Dashboard's **Redirect URLs** allowlist (configured in Step 2). If it's not, Supabase will reject it.

### Why `window.location.origin`?

Using `window.location.origin` (e.g., `http://localhost:3000`) instead of hardcoding the URL means the same code works in:
- Development (`http://localhost:3000`)
- Staging (`https://staging.yourapp.com`)
- Production (`https://yourapp.com`)

---

## 3. The full flow triggered by the button

```
User clicks "Sign in with Google"
    │
    ▼
signInWithOAuth({ provider: 'google' })
    │
    ▼
Browser redirects to Google login page
    │
    ▼
User approves login at Google
    │
    ▼
Google redirects to Supabase (Redirect 1)
    │
    ▼
Supabase redirects to /auth/callback (Redirect 2)
    │
    ▼
Callback route exchanges code for session (Step 4)
    │
    ▼
User is redirected to home page, now logged in
```

---

## 4. What you should NOT do

### Don't use Server Actions for OAuth

You might think: "I should use a Server Action instead of a client-side click handler."

**Don't.** The OAuth flow requires a **browser redirect** — the user needs to be sent to Google's page. Server Actions run on the server and return data, they don't redirect the browser to external URLs.

### Don't hardcode the redirect URL

```tsx
// BAD — breaks when you deploy
redirectTo: 'http://localhost:3000/auth/callback'

// GOOD — works everywhere
redirectTo: `${window.location.origin}/auth/callback`
```

---

**Next:** [06_middleware.md](./06_middleware.md) — Add middleware for session refresh and route protection
