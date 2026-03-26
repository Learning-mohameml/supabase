# 02 — Supabase JS Client Setup

## What is the Supabase JS client?

The Supabase JavaScript client (`@supabase/supabase-js`) is a thin wrapper around PostgREST. Instead of writing raw HTTP requests with headers, you write:

```typescript
// Instead of this:
fetch('http://127.0.0.1:54321/rest/v1/todos?priority=gte.2', {
  headers: { apikey: '...', Authorization: 'Bearer ...' }
})

// You write this:
supabase.from('todos').select('*').gte('priority', 2)
```

Same result, but type-safe, readable, and handles auth automatically.

---

## Two packages, two purposes

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Core client — handles Auth, Database, Storage, Realtime |
| `@supabase/ssr` | Server-side rendering helpers — manages cookies in Next.js |

In a plain React app (SPA), you'd only need `@supabase/supabase-js`. But Next.js has **Server Components**, **Server Actions**, and **middleware** — code that runs on the server. The `@supabase/ssr` package bridges auth cookies between the browser and server.

Your project already has both installed:

```json
"@supabase/ssr": "^0.9.0",
"@supabase/supabase-js": "^2.99.3"
```

---

## Environment variables

The client needs two values to connect to Supabase:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Both are prefixed with `NEXT_PUBLIC_` — they're safe to expose in the browser. The anon key is **not a secret** (remember: RLS is the real security layer).

Get these values from `supabase status`.

---

## The three client files

Your app has three places where it creates a Supabase client, each for a different execution context:

```
utils/supabase/
├── client.ts       ← Browser (Client Components)
├── server.ts       ← Server (Server Components, Server Actions)
└── middleware.ts   ← Middleware (runs on every request)
```

### 1. Browser client — `client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Used in:** Client Components (`"use client"`)

**How it works:**
- Runs in the browser
- Reads/writes auth cookies directly from `document.cookie`
- Use for interactive features: click handlers, forms, real-time subscriptions

**Usage:**

```typescript
'use client'
import { createClient } from '@/utils/supabase/client'

function MyComponent() {
  const supabase = createClient()
  // supabase.from('todos').select('*')
  // supabase.auth.signInWithOAuth(...)
}
```

### 2. Server client — `server.ts`

```typescript
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
            // Fails in Server Components (read-only cookies) — OK
          }
        },
      },
    }
  )
}
```

**Used in:** Server Components, Server Actions, Route Handlers

**How it works:**
- Runs on the server (Node.js)
- No access to `document.cookie` — uses Next.js `cookies()` API instead
- Reads the user's auth cookie from the request → PostgREST knows who the user is
- The `try/catch` in `setAll` is needed because Server Components can read cookies but can't write them

**Usage:**

```typescript
// In a Server Component (no "use client")
import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: todos } = await supabase.from('todos').select('*')
  // Render todos...
}
```

### 3. Middleware client — `middleware.ts`

```typescript
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

  const { data: { user } } = await supabase.auth.getUser()

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

**Used in:** Next.js middleware (runs on every request before the page loads)

**What it does:**
1. **Refreshes the auth session** — JWTs expire; the middleware refreshes them silently
2. **Redirects unauthenticated users** to `/login`
3. **Passes updated cookies** to both the request and response

> Without middleware, expired sessions would fail silently. The middleware ensures the auth token is always fresh.

---

## Why three clients?

```
Browser request
    │
    ▼
┌─────────────┐   Refreshes session, redirects if not logged in
│  Middleware  │   → uses middleware.ts client
└──────┬──────┘
       │
       ▼
┌─────────────┐   Fetches data on the server before sending HTML
│  Server     │   → uses server.ts client
│  Component  │
└──────┬──────┘
       │
       ▼
┌─────────────┐   Handles clicks, form submissions, real-time updates
│  Client     │   → uses client.ts client
│  Component  │
└─────────────┘
```

The auth cookie flows through all three. Each client reads it differently because each runs in a different environment (Edge runtime, Node.js, browser).

---

## Quick reference: which client to use

| Context | File | Import |
|---------|------|--------|
| Client Component (`"use client"`) | `client.ts` | `import { createClient } from '@/utils/supabase/client'` |
| Server Component / Server Action | `server.ts` | `import { createClient } from '@/utils/supabase/server'` |
| Middleware | `middleware.ts` | `import { updateSession } from '@/utils/supabase/middleware'` |

Rule of thumb: **always prefer the server client** for data fetching. Use the browser client only when you need interactivity (event handlers, real-time, forms).

---

## Security: `getUser()` vs `getSession()`

In the middleware, notice this line:

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

Why `getUser()` and not `getSession()`?

| Method | What it does | Safe for auth checks? |
|--------|-------------|----------------------|
| `getSession()` | Reads the JWT from the cookie — **does not validate it** | No |
| `getUser()` | Sends the JWT to Supabase Auth server — **validates it** | Yes |

`getSession()` just decodes the cookie locally. A tampered cookie would pass. `getUser()` makes a round-trip to verify the token is real and not expired.

**Rule:** always use `getUser()` for auth checks on the server. Use `getSession()` only for non-security purposes (e.g., reading user metadata for display).

---

## Summary

| Concept | Key point |
|---------|-----------|
| Two packages | `@supabase/supabase-js` (core) + `@supabase/ssr` (cookie handling for Next.js) |
| Three clients | Browser (`client.ts`), Server (`server.ts`), Middleware (`middleware.ts`) |
| Environment variables | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` |
| Auth validation | Always `getUser()` on the server, never trust `getSession()` alone |
| Prefer server client | Fetch data in Server Components — faster, more secure |

---

## Next

Now that the client is set up, the next section covers **CRUD operations** — how to insert, select, update, and delete data using the Supabase JS client.
