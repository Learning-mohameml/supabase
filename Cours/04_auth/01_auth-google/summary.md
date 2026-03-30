# Google Auth with Supabase + Next.js — Implementation Summary

A step-by-step reference of every file, config, and code needed to add Google OAuth to a Next.js App Router project with Supabase.

---

## 1. Install packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

| Package | Role |
|---------|------|
| `@supabase/supabase-js` | Supabase client (auth, database, storage) |
| `@supabase/ssr` | Cookie-based auth for server-side frameworks |

---

## 2. Environment variables

**.env.local** (not committed):

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
```

Both are public (`NEXT_PUBLIC_`) — the anon key is not a secret. RLS protects your data, not the key.

---

## 3. Three Supabase clients

You need 3 client factories because each runs in a different context with different cookie access:

### Browser client — `utils/supabase/client.ts`

Used in Client Components (`"use client"`) for OAuth triggers, sign-out, and interactive features.

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server client — `utils/supabase/server.ts`

Used in Server Components, Route Handlers, and Server Actions. Reads cookies via Next.js `cookies()` API.

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components can read cookies but not write them.
            // The middleware handles the actual refresh.
          }
        },
      },
    }
  )
}
```

### Middleware client — `utils/supabase/middleware.ts`

Runs on every request. Refreshes expired JWTs and redirects unauthenticated users. Uses the request/response cookie API (not `cookies()`).

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the JWT with Supabase's server AND refreshes expired tokens
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users (except public routes)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: always return supabaseResponse — it carries the refreshed cookies
  return supabaseResponse
}
```

---

## 4. Proxy (middleware entry point)

**`proxy.ts`** at project root — calls `updateSession()` on every non-static request:

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

This runs **before every request** and does two things:
1. Refreshes the JWT if expired (keeps users logged in)
2. Redirects to `/login` if not authenticated

---

## 5. Auth helper functions

### Sign in + sign out — `lib/auth/client.ts` (browser-side)

```ts
import { createClient } from '@/utils/supabase/client'

export async function signInWithGoogle() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
```

`redirectTo` tells Supabase: "after processing the Google login, send the user back to this URL." It must be in the Supabase redirect URLs allowlist.

### Get user — `lib/auth/queries.ts` (server-side)

```ts
import { createClient } from '@/utils/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

Always use `getUser()` (not `getSession()`) on the server — it validates the JWT with Supabase. `getSession()` just reads the cookie without checking if it's been tampered with.

---

## 6. Callback route — `app/auth/callback/route.ts`

This is where Supabase redirects the user after Google login. It exchanges the temporary code for a real session (JWT + refresh token stored in cookies).

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  // Prevent open redirect attacks
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
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

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

---

## 7. Login page — `app/login/page.tsx`

A Client Component that calls `signInWithGoogle()` on button click:

```tsx
'use client'

import { signInWithGoogle } from '@/lib/auth/client'

export default function LoginPage() {
  return (
    <main>
      <button onClick={() => signInWithGoogle()}>
        Sign in with Google
      </button>
    </main>
  )
}
```

---

## 8. Logout button (Client Component)

```tsx
'use client'

import { signOut } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return <button onClick={handleLogout}>Log out</button>
}
```

---

## 9. Reading the user in Server Components

```tsx
import { getUser } from '@/lib/auth/queries'

export default async function DashboardLayout({ children }) {
  const user = await getUser()

  return (
    <div>
      <p>{user?.email}</p>
      {children}
    </div>
  )
}
```

The middleware already redirected unauthenticated users, so `user` is guaranteed to exist here. But calling `getUser()` is still needed to **access** the user data.

---

## 10. Using `user.id` in server actions

In any server action that creates data, get the authenticated user and use their ID:

```ts
'use server'

import { getUser } from '@/lib/auth/queries'
import { createClient } from '@/utils/supabase/server'

export async function addTodo(data) {
  const user = await getUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase = await createClient()
  await supabase.from('todos').insert({
    title: data.title,
    user_id: user.id,  // real user UUID from Google auth
  })
}
```

---

## 11. Google Cloud Console setup

Go to **APIs & Services > Credentials > OAuth 2.0 Client ID** and add your Supabase callback URLs in **Authorized redirect URIs**:

```
http://127.0.0.1:54321/auth/v1/callback       ← local Supabase
https://<your-ref>.supabase.co/auth/v1/callback  ← production Supabase
```

This is where Google sends the user after login (Redirect 1). Google checks the redirect URI in each request against this allowlist — if it doesn't match, auth fails with `redirect_uri_mismatch`.

Copy the **Client ID** and **Client Secret**.

---

## 12. Supabase config

### Local — `config.toml`

```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://127.0.0.1:3000/auth/callback", "http://localhost:3000/auth/callback"]

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
skip_nonce_check = true
```

`additional_redirect_urls` is the allowlist for Redirect 2 (Supabase → your app). The `redirectTo` URL in your code must be in this list, otherwise Supabase ignores it and falls back to `site_url`.

`skip_nonce_check = true` is needed locally because the auth server runs on HTTP, which breaks OpenID Connect nonce verification.

### Secrets — `supabase/.env` (not committed)

```env
GOOGLE_CLIENT_ID=123456-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
```

`config.toml` reads these via `env()`. Restart the stack after any change: `supabase stop && supabase start`.

### Production — Supabase Dashboard

- **Authentication > Providers > Google**: paste Client ID + Secret
- **Authentication > URL Configuration**: set Site URL and add redirect URLs

---

## 13. Complete file structure

```
project-root/
├── proxy.ts                          # Middleware entry — runs on every request
├── .env.local                        # SUPABASE_URL + ANON_KEY
│
├── utils/supabase/
│   ├── client.ts                     # Browser client factory
│   ├── server.ts                     # Server client factory
│   └── middleware.ts                 # Session refresh + route protection
│
├── lib/auth/
│   ├── client.ts                     # signInWithGoogle(), signOut()
│   └── queries.ts                    # getUser()
│
├── app/
│   ├── login/page.tsx                # Login page (Client Component)
│   ├── auth/
│   │   ├── callback/route.ts         # Code → session exchange
│   │   └── auth-code-error/page.tsx  # Error page
│   └── dashboard/
│       └── layout.tsx                # Reads user, passes to UI
│
└── supabase/
    ├── config.toml                   # [auth.external.google] config
    └── .env                          # Google secrets (not committed)
```

---

## 14. The full pipeline — what happens when you click "Sign in with Google"

```
 Browser                         Supabase                        Google
────────                        ──────────                      ────────
1. signInWithGoogle()
   generates code_verifier
   + code_challenge
   (stored in browser)

2. Browser redirects to ──────► /auth/v1/authorize
                                ?provider=google
                                &code_challenge=xxx
                                &redirect_to=localhost:3000/auth/callback

3.                               Builds Google URL,
                                 redirects browser to ─────────► Google login

4.                                                               User logs in,
                                                                 picks account

5.                               ◄──── Google redirects back ── with GOOGLE_CODE
                                       (Redirect 1)

6.                               Exchanges GOOGLE_CODE
                                 + client_secret
                                 with Google ──────────────────► Google verifies
                                 ◄──── receives tokens ──────── (id_token, etc.)

7.                               Creates/updates user
                                 in auth.users,
                                 generates SUPABASE_CODE

8. ◄──── Redirect 2 ──────────  /auth/callback?code=SUPABASE_CODE
   Browser hits your app

9. Route handler (server)
   exchangeCodeForSession()
   sends SUPABASE_CODE    ──────►  Verifies code
   + code_verifier                 + code_verifier match
                           ◄──────  Returns JWT + refresh token
                                    (Set-Cookie headers)

10. Browser receives cookies,
    redirected to /dashboard.
    User is logged in.
```

---

## 15. URL reference — local vs production

| URL | Local | Production | Configured in |
|-----|-------|------------|---------------|
| Supabase callback (Redirect 1) | `http://127.0.0.1:54321/auth/v1/callback` | `https://<ref>.supabase.co/auth/v1/callback` | Google Cloud Console |
| App callback (Redirect 2) | `http://localhost:3000/auth/callback` | `https://yourdomain.com/auth/callback` | `config.toml` / Supabase Dashboard + `redirectTo` in code |
| Site URL | `http://127.0.0.1:3000` | `https://yourdomain.com` | `config.toml` / Dashboard |
| Supabase API | `http://127.0.0.1:54321` | `https://<ref>.supabase.co` | `.env.local` / `.env.production` |

---

## Key rules

1. **Always use `getUser()`, never `getSession()`** for auth checks on the server
2. **Middleware is mandatory** — without it, tokens expire after 1 hour and users get logged out
3. **Always return `supabaseResponse`** from middleware — it carries the refreshed cookies
4. **`redirectTo` must be in the allowlist** — otherwise Supabase falls back to `site_url`
5. **Validate the `next` parameter** in the callback route — prevents open redirect attacks
6. **Never expose the service role key** in `NEXT_PUBLIC_` variables
