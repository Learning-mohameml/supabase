# Step 1 — Set Up the Next.js Project

## Goal

Create a new Next.js project and install the Supabase packages needed for server-side auth.

---

## 1. Create the Next.js app

```bash
npx create-next-app@latest auth-google
cd auth-google
```

Choose these options when prompted:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes** (optional, but we use it)
- App Router: **Yes**

### What this gives you

A Next.js project using the **App Router** (`app/` directory), which is the modern routing system. All files inside `app/` are server components by default.

---

## 2. Install Supabase packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### What each package does

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | The main Supabase client — talks to your Supabase project (auth, database, storage, etc.) |
| `@supabase/ssr` | Helpers for server-side frameworks — handles cookie-based auth for Next.js, SvelteKit, etc. |

### Why `@supabase/ssr` and not `@supabase/auth-helpers`?

`@supabase/auth-helpers` is the **old** package (deprecated). `@supabase/ssr` is its replacement. If you see tutorials using `auth-helpers`, they are outdated.

---

## 3. Verify your setup

Your `package.json` should include:

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.9.x",
    "@supabase/supabase-js": "^2.x",
    "next": "...",
    "react": "...",
    "react-dom": "..."
  }
}
```

Run the dev server to verify everything works:

```bash
npm run dev
```

Open `http://localhost:3000` — you should see the default Next.js page.

---

## File structure at this point

```
auth-google/
  app/
    layout.tsx
    page.tsx
    globals.css
  package.json
  .gitignore
  tsconfig.json
```

Nothing Supabase-specific yet — that comes in the next steps.

---

**Next:** [02_supabase-google-config.md](./02_supabase-google-config.md) — Configure Google OAuth in Supabase Dashboard and Google Cloud Console
