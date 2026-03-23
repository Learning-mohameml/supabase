# Step 4 — The Callback Route

## Goal

Create the route that receives the user after Google login and exchanges the authorization code for a real session.

---

## 1. What happens at this route?

After the user logs in with Google, Supabase redirects them to your app at `/auth/callback` with a **code** in the URL:

```
http://localhost:3000/auth/callback?code=abc123&next=/
```

This code is **not** the session. It's a temporary authorization code that must be exchanged for real tokens (access token + refresh token). This is the PKCE flow in action.

---

## 2. Create the route handler

Create `app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  // SECURITY: Validate that 'next' is a relative path
  // This prevents open redirect attacks where an attacker crafts:
  //   /auth/callback?code=xxx&next=https://evil.com
  if (!next.startsWith('/')) {
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Handle forwarded host for production behind load balancers
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If code is missing or exchange failed, redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

---

## 3. Line-by-line explanation

### Getting the code and next URL

```ts
const code = searchParams.get('code')
let next = searchParams.get('next') ?? '/'
```

- `code` — the temporary authorization code from Supabase (via Google)
- `next` — where to send the user after login (defaults to `/`)

### Open redirect protection

```ts
if (!next.startsWith('/')) {
  next = '/'
}
```

**Why this matters:** Without this check, an attacker could craft a URL like:

```
https://yourapp.com/auth/callback?code=legit_code&next=https://evil.com/steal
```

After login, the user would be redirected to `evil.com`. By ensuring `next` starts with `/`, we guarantee it's a relative path within our app.

### Exchanging the code

```ts
const { error } = await supabase.auth.exchangeCodeForSession(code)
```

This sends the authorization code to Supabase, which:
1. Verifies the code is valid and hasn't expired
2. Verifies the PKCE code verifier matches
3. Returns access + refresh tokens
4. Sets them as cookies (via the `setAll` callback in our server client)

### Forwarded host handling

```ts
const forwardedHost = request.headers.get('x-forwarded-host')
```

In production, your app might sit behind a load balancer or reverse proxy (Vercel, AWS ALB, etc.). The `x-forwarded-host` header tells you the original domain the user visited. Without this, the redirect would go to the internal server address instead of your domain.

### Error handling

```ts
return NextResponse.redirect(`${origin}/auth/auth-code-error`)
```

If the code is missing or the exchange fails, we redirect to an error page instead of silently failing. You should create a simple error page at `app/auth/auth-code-error/page.tsx`:

```tsx
export default function AuthErrorPage() {
  return (
    <main>
      <h1>Authentication Error</h1>
      <p>Something went wrong during sign-in. Please try again.</p>
      <a href="/login">Back to login</a>
    </main>
  )
}
```

---

## 4. Security checklist for this route

- [x] **Validate `next` parameter** — only allow relative paths (starts with `/`)
- [x] **Handle errors** — don't silently redirect on failure
- [x] **Handle forwarded host** — correct redirects behind load balancers
- [x] **Use server client** — the code exchange happens server-side (never expose it to the browser)

---

## File structure at this point

```
app/
  auth/
    callback/
      route.ts          ← this file
    auth-code-error/
      page.tsx           ← error page
```

---

**Next:** [05_login-page.md](./05_login-page.md) — Create the login page with the Google sign-in button
