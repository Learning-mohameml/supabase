# Step 3 — Environment Variables and Supabase Clients

## Goal

Store your Supabase credentials securely and create the two Supabase client helpers (browser + server).

---

## 1. Create `.env.local`

In your project root, create a file called `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Why `.env.local`?

- `.env.local` is **automatically loaded** by Next.js
- `.env.local` is listed in `.gitignore` by default — it won't be committed to git
- The `NEXT_PUBLIC_` prefix makes these variables available in both server and client code

### Is the anon key a secret?

**No.** The anon key is a public key. It's safe to expose in client-side code. What protects your data is **Row Level Security (RLS)**, not the key itself. Think of the anon key as a door — RLS is the lock.

However, your **service role key** (found in the same dashboard section) **IS a secret**. Never expose it in client code.

---

## 2. Create the Browser Client

Create `utils/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### When is this used?

In **Client Components** (files with `'use client'`). For example:
- The login button that triggers `signInWithOAuth`
- The logout button that calls `signOut`
- Any interactive component that needs to talk to Supabase

### How it works

`createBrowserClient` from `@supabase/ssr`:
- Creates a Supabase client that runs in the browser
- Automatically reads/writes auth tokens from cookies
- Handles token refresh on the client side

---

## 3. Create the Server Client

Create `utils/supabase/server.ts`:

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
            // This can be ignored in Server Components
            // (they can read cookies but not write them)
          }
        },
      },
    }
  )
}
```

### When is this used?

In **Server Components**, **Route Handlers**, and **Server Actions**. For example:
- Reading the logged-in user on the home page
- The `/auth/callback` route that exchanges the code for a session
- Any server-side data fetching that needs auth context

### Why the `try/catch` in `setAll`?

Server Components in Next.js are **read-only** for cookies. They can read cookies but can't set them. If Supabase tries to refresh a token while in a Server Component, the `set` call would throw. The `try/catch` silently handles this — the middleware will handle the actual refresh instead.

---

## 4. Why Two Clients?

| | Browser Client | Server Client |
|---|---|---|
| **Runs in** | User's browser | Server (Node.js) |
| **Created with** | `createBrowserClient` | `createServerClient` |
| **Cookie handling** | Automatic | Manual (via `cookies()` API) |
| **Used in** | Client Components | Server Components, Route Handlers |
| **Can trigger OAuth** | Yes | No (can't redirect the browser) |
| **Can read user** | Yes | Yes (preferred — more secure) |

### Security note

Always prefer reading the user on the **server** using `getUser()`. The server client validates the JWT with Supabase's server, while the browser client trusts the local token (which could theoretically be tampered with by a malicious browser extension or XSS).

---

## File structure at this point

```
auth-google/
  app/
    layout.tsx
    page.tsx
  utils/
    supabase/
      client.ts     ← browser client
      server.ts     ← server client
  .env.local        ← credentials (not committed)
```

---

**Next:** [04_callback-route.md](./04_callback-route.md) — Create the callback route that exchanges the auth code for a session
