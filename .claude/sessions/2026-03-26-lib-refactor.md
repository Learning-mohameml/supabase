# Session — 2026-03-26 — lib/ Architecture Refactor

## What we did

### 1. Reviewed Task 02 Progress

- Checked task spec (`Projects/todos/tasks/02_dashboard-crud.md`)
- Phases A, B, C are done — Phases D, E, F still pending

### 2. Discussed lib/ Architecture

- User noticed that `dashboard/layout.tsx` calls `createClient()` directly instead of going through `lib/`
- Same issue in `logout-button.tsx` and `login/page.tsx`
- Agreed on a rule: **pages and components never import from `utils/supabase/` — they always go through `lib/`**

### 3. Refactored lib/ to Domain-Based Structure

Old structure:
```
lib/
├── queries/todos.ts
├── actions/todos.ts
└── utils.ts
```

New structure:
```
lib/
├── auth/
│   ├── queries.ts     # getUser() — server-side
│   └── client.ts      # signInWithGoogle(), signOut() — browser-side
├── todos/
│   ├── queries.ts     # getTodosWithRelations()
│   └── actions.ts     # toggleTodoComplete(), softDeleteTodo(), addTodo()
├── categories/
│   └── queries.ts     # getCategories()
└── utils.ts           # cn() — shadcn utility
```

Key decisions:
- Group by **domain** (auth, todos, categories), not by operation type (queries, actions)
- `getCategories()` moved from `todos/queries` to `categories/queries` — each domain owns its queries
- Client-side auth operations (`signInWithGoogle`, `signOut`) in `auth/client.ts`, separate from server-side `auth/queries.ts`

### 4. Updated All Consumers

- `app/dashboard/layout.tsx` → uses `getUser()` from `lib/auth/queries`
- `app/dashboard/page.tsx` → imports from `lib/todos/queries` + `lib/categories/queries`
- `app/login/page.tsx` → uses `signInWithGoogle()` from `lib/auth/client`
- `components/logout-button.tsx` → uses `signOut()` from `lib/auth/client`
- Verified: zero direct `utils/supabase/` imports in `app/` or `components/`

### 5. Architecture Discussion

Confirmed that `lib/` as the business logic layer is the standard Next.js professional pattern:
- `utils/supabase/` → infrastructure (HOW to connect)
- `lib/` → business logic (WHAT to do)
- `app/` → routing (thin, delegates to lib/)
- `components/` → UI (pure presentation)

## Where to resume

1. **Test the refactor** — run `npm run dev` and verify login, logout, dashboard still work
2. **Continue Task 02 Phase D** — Todo Detail page (Claude generates UI, user implements queries)
3. Phases E (Categories) and F (Tags) after that
4. After Task 02 → Chapter 04 (Auth)
