# Step 7 — Protected Pages (Home + Logout)

## Goal

Build a home page that shows the logged-in user's info and a logout button.

---

## 1. The Home Page (Server Component)

Edit `app/page.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import LogoutButton from './components/logout-button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  return (
    <main>
      <h1>Home</h1>

      {data.user ? (
        <div>
          <p>You are logged in as: {data.user.email}</p>
          <LogoutButton />
        </div>
      ) : (
        <div>
          <p>You are not logged in.</p>
          <Link href="/login">Go to login</Link>
        </div>
      )}
    </main>
  )
}
```

### Key points

**This is a Server Component** (no `'use client'`). It runs on the server and:
- Uses the **server** Supabase client
- Calls `getUser()` to securely check who is logged in
- Never exposes auth tokens to the client

**Why `getUser()` and not `getSession()`?**

As explained in the middleware step:
- `getUser()` validates the JWT with Supabase's server — **secure**
- `getSession()` reads the JWT from cookies without validation — **not secure for auth checks**

**No `console.log(data)` in production.** Server-side `console.log` dumps user data (email, metadata, tokens) into your server logs. This is fine for debugging but should be removed in production code.

---

## 2. The Logout Button (Client Component)

Create `app/components/logout-button.tsx`:

```tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return <button onClick={handleLogout}>Logout</button>
}
```

### Why is this a Client Component?

- It uses `onClick` (browser event)
- It uses `useRouter` for navigation
- It uses the browser Supabase client

### What `signOut()` does

1. Sends a request to Supabase to invalidate the refresh token
2. Clears the auth cookies from the browser
3. After this, `getUser()` will return `null` on the next request

### Why `router.push('/login')` instead of `window.location.reload()`?

`router.push` uses Next.js navigation (faster, no full page reload). `window.location.reload()` works too, but it triggers a full browser refresh, which is slower and loses any client state.

---

## 3. How the page works end-to-end

```
User visits / (home page)
    │
    ▼
Middleware runs first (Step 6)
    │
    ├── Not logged in → redirect to /login
    │
    └── Logged in → continue
    │
    ▼
Server Component renders
    │
    ▼
getUser() fetches user from Supabase
    │
    ▼
Page shows email + logout button
```

---

## 4. Adding more protected pages

The pattern is always the same:

```tsx
import { createClient } from '@/utils/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // user is guaranteed to exist here because middleware
  // already redirected unauthenticated users to /login

  return <div>Welcome, {user?.email}</div>
}
```

The middleware handles the redirect, so you don't need auth checks in every page. But calling `getUser()` is still useful to **access** the user data.

---

## File structure at this point

```
app/
  auth/
    callback/
      route.ts
    auth-code-error/
      page.tsx
  components/
    logout-button.tsx    ← Client Component
  login/
    page.tsx             ← Client Component
  page.tsx               ← Server Component (home)
  layout.tsx
utils/
  supabase/
    client.ts
    server.ts
    middleware.ts
middleware.ts
.env.local
```

---

**Next:** [08_security-best-practices.md](./08_security-best-practices.md) — Security checklist and common vulnerabilities
