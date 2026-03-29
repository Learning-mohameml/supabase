# Task 02 — Dashboard & CRUD

## Objective

Build the todos dashboard with full CRUD. Claude generates UI components; user implements all Supabase logic (queries, types, data fetching).

## Current State

- Auth (Google OAuth) works — login, callback, session refresh, protected routes
- 4 migrations applied — tables, trigger, indexes
- Seed data loaded — 3 categories, 10 todos, 5 tags, 7 tag assignments
- shadcn/ui **not installed yet**
- No TypeScript types generated yet

---

## Steps

### Phase A — Setup

- [x] **A1.** Generate TypeScript types *(user)*
  ```bash
  mkdir -p types
  supabase gen types typescript --local > types/database.types.ts
  ```

- [x] **A2.** Add helper types *(user)*
  - Create `types/helpers.ts` with extracted `Todo`, `Category`, `Tag` types
  - Create `TodoWithRelations` type (todo + category + tags)

- [x] **A3.** Wire `<Database>` generic into both client files *(user)*
  - `utils/supabase/client.ts` → `createBrowserClient<Database>(...)`
  - `utils/supabase/server.ts` → `createServerClient<Database>(...)`

- [x] **A4.** Install shadcn/ui *(user)*
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button card badge input textarea select checkbox dialog dropdown-menu sidebar toast
  ```

- [x] **A5.** Add `gen:types` script to `package.json` *(user)*
  ```json
  "gen:types": "supabase gen types typescript --local > types/database.types.ts"
  ```

---

### Phase B — Layout & Navigation *(Claude generates)*

- [x] **B1.** Create app shell layout for `/dashboard`
  - `app/dashboard/layout.tsx` — sidebar + main content area
  - Sidebar: app name, navigation links (Todos, Categories, Tags), user email, logout button
  - Responsive: collapsible sidebar on mobile
  - Clean, minimal design

- [x] **B2.** Move logout button to shared components
  - `components/logout-button.tsx` (move from `app/components/`)

---

### Phase C — Todos List Page

- [x] **C1.** Create todos page UI *(Claude generates)*
  - `app/dashboard/page.tsx` — Server Component shell
  - `components/todos/todo-list.tsx` — renders the list
  - `components/todos/todo-card.tsx` — single todo card showing: title, priority badge, category badge, tags, due date, completed checkbox
  - `components/todos/todo-filters.tsx` — filter bar: by category, priority, completed status
  - `components/todos/add-todo-dialog.tsx` — dialog with form: title, description, priority select, category select, due date

- [x] **C2.** Implement data fetching *(user)*
  - In `app/dashboard/page.tsx`: fetch todos with categories + tags (nested query)
  - Filter out soft-deleted todos (`.is('deleted_at', null)`)
  - Order by priority descending
  - Pass data as props to `todo-list`

- [x] **C3.** Implement todo actions *(user)*
  - Toggle completed: `.update({ completed: !current })` on checkbox click
  - Soft delete: `.update({ deleted_at: new Date().toISOString() })` from dropdown
  - Add todo: `.insert({...})` from dialog form

---

### Phase D — Todo Detail Page

- [x] **D1.** Create detail page UI *(Claude generates)*
  - `app/dashboard/todo/[id]/page.tsx` — Server Component shell
  - `components/todos/todo-detail.tsx` — full view: all fields, editable
  - `components/todos/todo-edit-form.tsx` — edit form: title, description, priority, category, due date, metadata (JSON editor)
  - `components/todos/tag-picker.tsx` — add/remove tags from a todo

- [x] **D2.** Implement data fetching *(user)*
  - Fetch single todo by ID with category + tags (`.eq('id', id).single()`)
  - Fetch all categories (for the category dropdown)
  - Fetch all tags (for the tag picker)

- [x] **D3.** Implement todo edit *(user)*
  - Update todo: `.update({...}).eq('id', id)`
  - Add tag: `.insert({ todo_id, tag_id })` into `todo_tags`
  - Remove tag: `.delete().eq('todo_id', id).eq('tag_id', tagId)` from `todo_tags`

---

### Phase E — Categories Page

- [x] **E1.** Create categories page UI *(Claude generates)*
  - `app/dashboard/categories/page.tsx` — Server Component shell
  - `components/categories/category-list.tsx` — list with todo count per category
  - `components/categories/category-card.tsx` — name, color dot, icon, todo count
  - `components/categories/add-category-dialog.tsx` — form: name, color picker, icon
  - `components/categories/edit-category-dialog.tsx` — edit form (pre-filled)

- [x] **E2.** Implement data fetching *(user)*
  - Fetch categories with todo count: `.select('*, todos(count)')`

- [x] **E3.** Implement category actions *(user)*
  - Add category: `.insert({...})`
  - Edit category: `.update({...}).eq('id', id)`
  - Delete category: `.delete().eq('id', id)` (todos get `category_id = null` via ON DELETE SET NULL)

---

### Phase F — Tags Page

- [ ] **F1.** Create tags page UI *(Claude generates)*
  - `app/dashboard/tags/page.tsx` — Server Component shell
  - `components/tags/tag-list.tsx` — list of tags with usage count
  - `components/tags/add-tag-dialog.tsx` — form: name, color picker

- [ ] **F2.** Implement data fetching *(user)*
  - Fetch tags with todo count: `.select('*, todo_tags(count)')`

- [ ] **F3.** Implement tag actions *(user)*
  - Add tag: `.insert({...})`
  - Edit tag (upsert): `.upsert({...}, { onConflict: 'name, user_id' })`
  - Delete tag: `.delete().eq('id', id)` (cascades via `todo_tags`)

---

## Component Architecture

```
components/
├── layout/
│   └── sidebar.tsx              # Dashboard sidebar navigation
├── todos/
│   ├── todo-list.tsx            # List container
│   ├── todo-card.tsx            # Single todo card
│   ├── todo-detail.tsx          # Full todo view
│   ├── todo-edit-form.tsx       # Edit form
│   ├── todo-filters.tsx         # Filter bar
│   ├── add-todo-dialog.tsx      # Create dialog
│   └── tag-picker.tsx           # Add/remove tags
├── categories/
│   ├── category-list.tsx        # List container
│   ├── category-card.tsx        # Single category card
│   └── add-category-dialog.tsx  # Create/edit dialog
├── tags/
│   ├── tag-list.tsx             # List container
│   └── add-tag-dialog.tsx       # Create/edit dialog
└── logout-button.tsx            # Shared logout button
```

## Pages

```
app/
├── dashboard/
│   ├── layout.tsx               # Sidebar + main content
│   ├── page.tsx                 # Todos list (home)
│   ├── todo/
│   │   └── [id]/page.tsx        # Todo detail
│   ├── categories/
│   │   └── page.tsx             # Categories management
│   └── tags/
│       └── page.tsx             # Tags management
├── login/page.tsx               # Existing login page
└── page.tsx                     # Redirect to /dashboard
```

---

## Division of Work

| Who | What |
|-----|------|
| **Claude** | All `.tsx` component files, layouts, styling, shadcn usage |
| **User** | TypeScript types, Supabase queries in page files, insert/update/delete logic |

---

## Done Criteria

- [ ] TypeScript types generated and wired into clients
- [ ] shadcn/ui installed with required components
- [ ] Dashboard layout with sidebar navigation
- [ ] Todos list page with filtering, add, toggle complete, soft delete
- [ ] Todo detail page with edit form and tag picker
- [ ] Categories page with CRUD and todo counts
- [ ] Tags page with CRUD and usage counts
- [ ] All data comes from Supabase local stack (no hardcoded data)
- [ ] All queries use the typed client (`<Database>`)

---

## Note

All queries use a hardcoded `user_id` for now (`aaaaaaaa-0000-0000-0000-000000000001`). In Chapter 04 (Auth), this will be replaced with `auth.uid()` from the logged-in user. In Chapter 05 (RLS), policies will enforce it at the database level.
