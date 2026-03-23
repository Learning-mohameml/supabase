# Step 6 — Proxy (Token Refresh + Route Protection)

## Goal

Add a Next.js proxy that refreshes auth tokens on every request and protects routes from unauthenticated access.

**This is the most critical security step.** Without a proxy, your auth setup is incomplete.

> **Next.js 16 note:** Starting in Next.js 16, `middleware.ts` has been renamed to `proxy.ts` and the exported function is now `proxy` instead of `middleware`. The functionality is identical — it's just a rename to better reflect its purpose (a network-level layer in front of your app). If you see older Supabase tutorials using `middleware.ts`, this is the updated equivalent.

---

## 1. Why is a proxy mandatory?

### Problem: JWTs expire

The access token (JWT) lasts ~1 hour. After that, the user is effectively logged out — even if they have a valid refresh token sitting in their cookies.

### Problem: No automatic refresh

Unlike a traditional SPA where the Supabase client runs continuously and can detect/refresh expired tokens, in a server-rendered app **each request is independent**. There's no persistent process watching the token.

### Solution: Proxy

Next.js proxy runs **before every request**. It's the perfect place to:
1. Read the auth cookies
2. Check if the access token is expired
3. Use the refresh token to get a new access token
4. Write the new tokens back to cookies
5. Optionally, block unauthenticated users from protected routes

---

## 2. Create the proxy Supabase client

We need a special Supabase client for the proxy because the proxy uses a different cookie API than Server Components.

Create `utils/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Start with a basic response that passes through
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on the request (for downstream server code)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Set cookies on the response (so the browser gets them)
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() here.
  // getSession() reads the token from cookies without validation.
  // getUser() actually sends the token to Supabase to verify it.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route protection: redirect unauthenticated users to /login
  // Exclude public routes: /login, /auth/callback, /auth/auth-code-error
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### Why `getUser()` and not `getSession()`?

This is a critical security distinction:

| Method | How it works | Security |
|--------|-------------|----------|
| `getSession()` | Reads the JWT from cookies and decodes it locally | **Trusts the cookie** — a tampered token would pass |
| `getUser()` | Sends the JWT to Supabase's server to verify it | **Validates with Supabase** — tampered tokens are rejected |

**Always use `getUser()` for security-sensitive checks** (like deciding whether to block access).

---

## 3. Create the proxy file

Create `proxy.ts` in your **project root** (not inside `app/`):

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     * - Public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Why the matcher?

Without the matcher, the proxy would run on **every** request, including static files (CSS, JS, images). This would:
- Slow down page loads unnecessarily
- Make unnecessary calls to Supabase's auth server
- Potentially break static file serving

The matcher regex excludes these paths.

### Migrating from older Next.js versions

If you have an existing `middleware.ts`, Next.js provides a codemod:

```bash
npx @next/codemod@canary middleware-to-proxy .
```

This renames the file and changes `export function middleware` to `export function proxy`.

---

## 4. How it all works together

```
Browser makes a request to any page
    │
    ▼
proxy.ts runs FIRST
    │
    ▼
updateSession() creates a Supabase client
    │
    ▼
supabase.auth.getUser() is called
    │
    ├── Token valid → user object returned
    │
    ├── Token expired, refresh token valid → new tokens issued,
    │   cookies updated, user object returned
    │
    └── No valid tokens → user is null
    │
    ▼
Is the user null AND is this a protected route?
    │
   YES → redirect to /login
    │
   NO → continue to the requested page
    │
    ▼
Page renders with valid auth state
```

---

## 5. What the proxy protects

With the code above:

| Route | Behavior |
|-------|----------|
| `/` (home) | Protected — redirects to `/login` if not authenticated |
| `/dashboard` | Protected |
| `/any-other-page` | Protected |
| `/login` | Public — always accessible |
| `/auth/callback` | Public — needed for OAuth flow |
| `/auth/auth-code-error` | Public — error page |

### Customizing protected routes

You can adjust the `if` condition in `updateSession()` to match your needs. For example, to only protect `/dashboard/*`:

```ts
if (
  !user &&
  request.nextUrl.pathname.startsWith('/dashboard')
) {
  // redirect to /login
}
```

---

## 6. Common mistakes

### Putting `proxy.ts` in the wrong place

The file must be at the **project root** (same level as `package.json`), not inside `app/` or `src/`.

```
  proxy.ts             (project root)
  app/proxy.ts         (won't work)
```

### Naming it `middleware.ts` in Next.js 16

In Next.js 16, the file **must** be named `proxy.ts` and export a function named `proxy`. Using `middleware.ts` will trigger a deprecation warning.

### Using `getSession()` instead of `getUser()`

`getSession()` trusts the cookie blindly. An attacker who can modify cookies could forge a session. `getUser()` validates with Supabase's server.

### Forgetting to return `supabaseResponse`

The response object contains the updated cookies. If you return a different `NextResponse`, the refreshed tokens won't reach the browser, and the user will be logged out on the next request.

---

## File structure at this point

```
proxy.ts                    ← project root (was middleware.ts before Next.js 16)
utils/
  supabase/
    client.ts
    server.ts
    middleware.ts            ← proxy helper (name kept for Supabase convention)
app/
  auth/
    callback/
      route.ts
    auth-code-error/
      page.tsx
  login/
    page.tsx
```

---

**Next:** [07_protected-pages.md](./07_protected-pages.md) — Build the home page and logout button
