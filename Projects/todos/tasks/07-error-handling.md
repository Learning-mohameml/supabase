# Task 06 — Professional Error Handling

## Objective

Replace raw Supabase error messages with user-friendly messages. Add server-side error logging, an error translation layer, and proper error boundaries. Users should never see database error codes or technical jargon.

## Current State

- All server actions pass `error.message` from Supabase directly to `fail()` → shown in toast
- All queries `throw new Error(error.message)` → shown in error boundary
- No error translation layer
- No server-side logging (`console.error` not used anywhere)
- Only 1 error boundary (`app/dashboard/error.tsx`), no global one
- `signInWithGoogle()` has no error handling

### Examples of raw errors users can see today

| Scenario | Raw message shown |
|----------|-------------------|
| Duplicate category name | `duplicate key value violates unique constraint "categories_user_id_name_key"` |
| RLS blocks an action | `new row violates row-level security policy for table "todos"` |
| Auth session expired | `JWT expired` |
| Network failure | `FetchError: request to ... failed` |

---

## Steps

### Phase A — Error translation layer *(user implements, Claude reviews)*

> **Learning goal:** Never trust external error messages for display. Map known error patterns to friendly messages, and use a generic fallback for unknown errors. Log the original for debugging.

- [ ] **A1.** Create `lib/errors.ts` with:

  **`toUserMessage(error: unknown): string`** — maps errors to user-friendly messages:
  - Check for known Supabase error codes/patterns (PostgreSQL error codes like `23505` for unique violation, `42501` for RLS, etc.)
  - Return a human-readable message for each known pattern
  - Return a generic fallback: `"Something went wrong. Please try again."` for unknown errors

  **Known patterns to handle:**

  | Pattern | User message |
  |---------|-------------|
  | `23505` / `unique` / `duplicate` | `"This name already exists. Please choose a different one."` |
  | `42501` / `row-level security` | `"You don't have permission to do this."` |
  | `23503` / `foreign key` | `"This item is linked to other data. Remove those links first."` |
  | `PGRST116` (no rows) | `"The item was not found. It may have been deleted."` |
  | `JWT expired` / `token` | `"Your session has expired. Please sign in again."` |
  | `FetchError` / `network` / `fetch` | `"Connection error. Check your internet and try again."` |
  | `Auth` / `not authenticated` | `"Please sign in to continue."` |
  | Anything else | `"Something went wrong. Please try again."` |

  **`logError(context: string, error: unknown): void`** — logs errors server-side:
  - Log the context (which action failed), the original error message, and stack trace
  - Use `console.error()` (in production, this goes to your hosting platform's logs)
  - Never log sensitive data (passwords, tokens)

**Hints:**
- Supabase errors have a `code` property (PostgreSQL error code) and a `message` property
- Use pattern matching (string includes or regex) for flexibility — error formats can vary
- Keep it simple: a function with if/else or a lookup map, not a class hierarchy

### Phase B — Update server actions *(Claude generates)*

- [ ] **B1.** Update all action files to use `toUserMessage()` and `logError()`:
  - `lib/supabase/todos/actions.ts`
  - `lib/supabase/categories/actions.ts`
  - `lib/supabase/tags/actions.ts`
  - `lib/supabase/auth/actions.ts`

  **Pattern change:**
  ```typescript
  // Before:
  if (error) return fail(error.message)

  // After:
  if (error) {
    logError("addTodo", error)
    return fail(toUserMessage(error))
  }
  ```

- [ ] **B2.** Wrap each action in a top-level try/catch as safety net:
  ```typescript
  export async function addTodo(input: CreateTodoInput): Promise<ActionResult> {
    try {
      // ... existing logic
    } catch (error) {
      logError("addTodo", error)
      return fail(toUserMessage(error))
    }
  }
  ```

### Phase C — Update queries *(Claude generates)*

- [ ] **C1.** Update all query files to log errors before throwing:
  - `lib/supabase/todos/queries.ts`
  - `lib/supabase/categories/queries.ts`
  - `lib/supabase/tags/queries.ts`

  **Pattern change:**
  ```typescript
  // Before:
  if (error) throw new Error(error.message)

  // After:
  if (error) {
    logError("getTodos", error)
    throw new Error(toUserMessage(error))
  }
  ```

### Phase D — Error boundaries *(Claude generates)*

- [ ] **D1.** Update `app/dashboard/error.tsx`:
  - Show a user-friendly message (the error is already translated from Phase C)
  - Add a "Go to Dashboard" link as alternative to "Try again"
  - Do NOT display `error.message` directly — use it only if it's already translated

- [ ] **D2.** Create `app/error.tsx` — global root error boundary:
  - Generic "Something went wrong" page
  - "Go home" and "Try again" buttons

- [ ] **D3.** Create `app/not-found.tsx` — custom 404 page:
  - "Page not found" with link back to dashboard

### Phase E — OAuth error handling *(user implements, Claude reviews)*

> **Learning goal:** OAuth can fail for many reasons (user denies consent, popup blocked, misconfigured redirect). Always handle the error case from `signInWithOAuth()`.

- [ ] **E1.** Update `signInWithGoogle()` in `lib/supabase/auth/client.ts`:
  - Return the error if `signInWithOAuth` fails
  - Let the caller (login page) display it via toast

- [ ] **E2.** Update login page to show OAuth errors via toast

---

## Division of Work

| Who | What |
|-----|------|
| **User** | Phases A, E |
| **Claude** | Phases B, C, D |

---

## Critical Files

| File | Change | Who |
|------|--------|-----|
| `lib/errors.ts` | New: `toUserMessage()`, `logError()` | User |
| `lib/supabase/todos/actions.ts` | Update: use error translation | Claude |
| `lib/supabase/categories/actions.ts` | Update: use error translation | Claude |
| `lib/supabase/tags/actions.ts` | Update: use error translation | Claude |
| `lib/supabase/auth/actions.ts` | Update: use error translation | Claude |
| `lib/supabase/todos/queries.ts` | Update: log + translate before throwing | Claude |
| `lib/supabase/categories/queries.ts` | Update: log + translate before throwing | Claude |
| `lib/supabase/tags/queries.ts` | Update: log + translate before throwing | Claude |
| `app/dashboard/error.tsx` | Update: improved UI | Claude |
| `app/error.tsx` | New: global error boundary | Claude |
| `app/not-found.tsx` | New: 404 page | Claude |
| `lib/supabase/auth/client.ts` | Update: return OAuth errors | User |
| `app/login/page.tsx` | Update: display OAuth errors | User |

---

## Design Decisions

- **Translation at the action/query layer, not at the component layer** — components already use `toast.error(result.error)`, so if the action returns a clean message, every component benefits automatically. No component changes needed.
- **`logError()` is a simple function, not a logging framework** — `console.error()` is enough. In production (Vercel/etc.), these go to platform logs automatically.
- **Pattern matching over exact error codes** — Supabase error formats can vary between versions. Matching on substrings (`"duplicate"`, `"security"`) is more resilient than matching exact codes only.
- **Top-level try/catch in every action** — safety net for unexpected errors (network failures, runtime exceptions) that wouldn't be caught by the `if (error)` checks.

### Phase F — Testing *(user implements, Claude reviews)*

> **Learning goal:** Error handling is invisible until it breaks. Testing ensures every error path produces the right user-facing message and that no raw database errors leak through.

#### F1. Unit tests for `toUserMessage()`

Create `lib/__tests__/errors.test.ts` using Vitest:

```typescript
import { describe, it, expect } from "vitest"
import { toUserMessage } from "../errors"

describe("toUserMessage", () => {
  // Unique constraint violation (PostgreSQL 23505)
  it("duplicate / unique → friendly message", () => { ... })

  // RLS violation (PostgreSQL 42501)
  it("row-level security → permission denied message", () => { ... })

  // Foreign key violation (PostgreSQL 23503)
  it("foreign key → linked data message", () => { ... })

  // PostgREST no rows (PGRST116)
  it("PGRST116 → not found message", () => { ... })

  // JWT / session errors
  it("JWT expired → session expired message", () => { ... })

  // Network errors
  it("FetchError → connection error message", () => { ... })

  // Auth errors
  it("not authenticated → sign in message", () => { ... })

  // Unknown errors → generic fallback
  it("unknown error → generic fallback", () => { ... })

  // Edge cases
  it("null/undefined → generic fallback", () => { ... })
  it("plain string → generic fallback", () => { ... })
})
```

**Test with various input shapes:**
- `{ code: "23505", message: "duplicate key..." }` (Supabase error object)
- `new Error("FetchError: request failed")` (native Error)
- `"JWT expired"` (plain string)
- `null`, `undefined`, `42` (unexpected types)

#### F2. Manual smoke tests

Trigger each error scenario in the running app and verify the toast/error boundary shows the correct message:

| # | Scenario | How to trigger | Expected message |
|---|----------|---------------|-----------------|
| 1 | Duplicate category | Create two categories with the same name | "This name already exists..." |
| 2 | Duplicate tag | Create two tags with the same name | "This name already exists..." |
| 3 | Session expired | Wait for JWT to expire or clear cookies, then perform an action | "Your session has expired..." |
| 4 | Network failure | Disconnect internet (or stop Supabase), then perform an action | "Connection error..." |
| 5 | Not found (deleted item) | Open a todo detail page, delete the todo from SQL editor, click "Save" | "The item was not found..." |
| 6 | OAuth failure | Temporarily break the Google redirect URI, try to log in | Toast shows error on login page |
| 7 | Unknown error | Throw a random error in a server action (temporary) | "Something went wrong..." |

#### F3. RLS isolation verification

Test that RLS violations produce friendly messages (not raw policy errors):

```sql
-- In SQL editor: try to insert a todo with a different user's ID
-- This should be blocked by RLS and the app should show "You don't have permission"
```

1. Log in as Alice
2. Use browser DevTools to manually call a server action with Bob's `user_id`
3. Verify toast shows "You don't have permission to do this." (not the raw policy error)

---

## Done Criteria

- [ ] No raw Supabase error messages visible in toasts or error boundaries
- [ ] All errors logged server-side with context (which function failed)
- [ ] Duplicate name → "This name already exists" (not a constraint violation message)
- [ ] Network failure → "Connection error" (not a FetchError stack trace)
- [ ] Global error boundary catches unexpected errors at root level
- [ ] Custom 404 page
- [ ] OAuth errors shown via toast on login page
- [ ] Unit tests for `toUserMessage()` pass (all known patterns + edge cases)
- [ ] Manual smoke tests pass (all 7 scenarios verified)
- [ ] RLS violation shows friendly message, not raw policy error
