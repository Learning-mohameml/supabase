Perfect. Here is a **realistic step-by-step architecture** for a **Todo app with Next.js + TypeScript + Supabase + Server Actions + Context**.

The goal is:

* Supabase CRUD stays on the **server**
* Server actions handle **mutations + revalidation**
* Context avoids **prop drilling**
* Client components can call `createTodo`, `updateTodo`, `deleteTodo` easily

---

# Global idea

We will separate the app into **4 layers**:

### 1. Database/service layer

Pure server functions that talk to Supabase.

### 2. Server actions layer

Functions with `"use server"` that call the service layer and do:

* validation if needed
* `revalidatePath`
* return action results

### 3. Context layer

A client provider that receives:

* initial todos
* server action references

and exposes them to deep client components.

### 4. Client components

Use the context with `useTodo()` instead of prop drilling.

---

# Step 1 — Define your Todo types

Create:

`types/todo.ts`

```ts
export type Todo = {
  id: string
  title: string
  description: string | null
  completed: boolean
  priority: "low" | "medium" | "high"
  due_date: string | null
  category_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type CreateTodoInput = {
  title: string
  description?: string | null
  priority?: "low" | "medium" | "high"
  due_date?: string | null
  category_id?: string | null
  metadata?: Record<string, unknown> | null
}

export type UpdateTodoInput = {
  title?: string
  description?: string | null
  completed?: boolean
  priority?: "low" | "medium" | "high"
  due_date?: string | null
  category_id?: string | null
  metadata?: Record<string, unknown> | null
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
```

---

# Step 2 — Create small helpers for action results

Create:

`lib/action-result.ts`

```ts
import type { ActionResult } from "@/types/todo"

export function ok<T = void>(data?: T): ActionResult<T> {
  return { success: true, data }
}

export function fail(message: string): ActionResult {
  return { success: false, error: message }
}
```

---

# Step 3 — Create your Supabase server client

You probably already have this, but the idea is to have a server-only creator.

Example:

`lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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
            // ignored in server components if needed
          }
        },
      },
    }
  )
}
```

---

# Step 4 — Create the service layer

This is where the real DB logic goes.

Create:

`lib/todos/service.ts`

```ts
import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@/types/todo"

export async function getTodos(): Promise<Todo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Todo[]
}

export async function getTodoById(id: string): Promise<Todo | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return data as Todo
}

export async function createTodoInDb(input: CreateTodoInput): Promise<Todo> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("todos")
    .insert({
      title: input.title,
      description: input.description ?? null,
      completed: false,
      priority: input.priority ?? "medium",
      due_date: input.due_date ?? null,
      category_id: input.category_id ?? null,
      metadata: input.metadata ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Todo
}

export async function updateTodoInDb(
  id: string,
  input: UpdateTodoInput
): Promise<Todo> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("todos")
    .update({
      title: input.title,
      description: input.description,
      completed: input.completed,
      priority: input.priority,
      due_date: input.due_date,
      category_id: input.category_id,
      metadata: input.metadata,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Todo
}

export async function deleteTodoInDb(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("todos").delete().eq("id", id)

  if (error) {
    throw new Error(error.message)
  }
}
```

---

# Step 5 — Create the server actions

These are the functions your UI will trigger.

Create:

`app/dashboard/todos/actions.ts`

```ts
"use server"

import { revalidatePath } from "next/cache"
import { fail, ok } from "@/lib/action-result"
import {
  createTodoInDb,
  deleteTodoInDb,
  updateTodoInDb,
} from "@/lib/todos/service"
import type { CreateTodoInput, UpdateTodoInput } from "@/types/todo"

export async function createTodoAction(input: CreateTodoInput) {
  try {
    const todo = await createTodoInDb(input)

    revalidatePath("/dashboard")
    return ok(todo)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to create todo")
  }
}

export async function updateTodoAction(id: string, input: UpdateTodoInput) {
  try {
    const todo = await updateTodoInDb(id, input)

    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/todo/${id}`)

    return ok(todo)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to update todo")
  }
}

export async function deleteTodoAction(id: string) {
  try {
    await deleteTodoInDb(id)

    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/todo/${id}`)

    return ok()
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete todo")
  }
}
```

---

# Step 6 — Create the context

This will be a **client component**.

It will contain:

* `todos` state
* `setTodos`
* `createTodo`
* `updateTodo`
* `deleteTodo`

Create:

`contexts/TodoContext.tsx`

```tsx
"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"
import type {
  ActionResult,
  CreateTodoInput,
  Todo,
  UpdateTodoInput,
} from "@/types/todo"

type TodoContextType = {
  todos: Todo[]
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
  createTodo: (input: CreateTodoInput) => Promise<ActionResult<Todo>>
  updateTodo: (id: string, input: UpdateTodoInput) => Promise<ActionResult<Todo>>
  deleteTodo: (id: string) => Promise<ActionResult<void>>
}

const TodoContext = createContext<TodoContextType | undefined>(undefined)

type TodoProviderProps = {
  children: ReactNode
  initialTodos: Todo[]
  actions: {
    createTodo: (input: CreateTodoInput) => Promise<ActionResult<Todo>>
    updateTodo: (id: string, input: UpdateTodoInput) => Promise<ActionResult<Todo>>
    deleteTodo: (id: string) => Promise<ActionResult<void>>
  }
}

export function TodoProvider({
  children,
  initialTodos,
  actions,
}: TodoProviderProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)

  return (
    <TodoContext.Provider
      value={{
        todos,
        setTodos,
        createTodo: actions.createTodo,
        updateTodo: actions.updateTodo,
        deleteTodo: actions.deleteTodo,
      }}
    >
      {children}
    </TodoContext.Provider>
  )
}

export function useTodo() {
  const context = useContext(TodoContext)

  if (!context) {
    throw new Error("useTodo must be used within TodoProvider")
  }

  return context
}
```

---

# Step 7 — Fetch initial todos in a server component

Now the page fetches data on the server, then passes:

* `initialTodos`
* server actions

to the provider.

Create:

`app/dashboard/page.tsx`

```tsx
import { getTodos } from "@/lib/todos/service"
import {
  createTodoAction,
  deleteTodoAction,
  updateTodoAction,
} from "./todos/actions"
import { TodoProvider } from "@/contexts/TodoContext"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
  const todos = await getTodos()

  return (
    <TodoProvider
      initialTodos={todos}
      actions={{
        createTodo: createTodoAction,
        updateTodo: updateTodoAction,
        deleteTodo: deleteTodoAction,
      }}
    >
      <DashboardClient />
    </TodoProvider>
  )
}
```

---

# Step 8 — Create a client shell

Create:

`app/dashboard/DashboardClient.tsx`

```tsx
"use client"

import AddTodoForm from "@/components/todos/AddTodoForm"
import TodoList from "@/components/todos/TodoList"

export default function DashboardClient() {
  return (
    <div className="space-y-6">
      <AddTodoForm />
      <TodoList />
    </div>
  )
}
```

---

# Step 9 — Use context in a deep client component for create

Create:

`components/todos/AddTodoForm.tsx`

```tsx
"use client"

import { useState } from "react"
import { useTodo } from "@/contexts/TodoContext"

export default function AddTodoForm() {
  const { createTodo, setTodos } = useTodo()
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!title.trim()) return

    setLoading(true)

    const result = await createTodo({
      title,
      priority: "medium",
    })

    if (result.success && result.data) {
      setTodos((prev) => [result.data!, ...prev])
      setTitle("")
    } else {
      alert(result.error)
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New todo"
        className="border px-3 py-2"
      />
      <button type="submit" disabled={loading} className="border px-3 py-2">
        {loading ? "Creating..." : "Add"}
      </button>
    </form>
  )
}
```

---

# Step 10 — Use context in another client component for read/delete/toggle

Create:

`components/todos/TodoList.tsx`

```tsx
"use client"

import { useTodo } from "@/contexts/TodoContext"

export default function TodoList() {
  const { todos, setTodos, updateTodo, deleteTodo } = useTodo()

  async function handleToggle(id: string, completed: boolean) {
    const result = await updateTodo(id, { completed: !completed })

    if (result.success && result.data) {
      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? result.data! : todo))
      )
    } else {
      alert(result.error)
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteTodo(id)

    if (result.success) {
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
    } else {
      alert(result.error)
    }
  }

  return (
    <div className="space-y-3">
      {todos.map((todo) => (
        <div
          key={todo.id}
          className="flex items-center justify-between border p-3"
        >
          <div>
            <p>{todo.title}</p>
            <p className="text-sm opacity-70">{todo.priority}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleToggle(todo.id, todo.completed)}
              className="border px-2 py-1"
            >
              {todo.completed ? "Undo" : "Complete"}
            </button>

            <button
              onClick={() => handleDelete(todo.id)}
              className="border px-2 py-1"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

# Step 11 — Understand what the context is doing here

Your context is **not** replacing the backend.

It is only giving deep client components access to:

* shared todo state
* action references

So the flow is:

### Read flow

* server page calls `getTodos()`
* provider receives `initialTodos`
* client components read `todos` from context

### Mutation flow

* client component calls `createTodo` / `updateTodo` / `deleteTodo`
* that triggers a **server action**
* server action calls the **service**
* service talks to **Supabase**
* server action revalidates pages
* client optionally updates local context state immediately

---

# Step 12 — Folder structure

A clean structure:

```txt
app/
  dashboard/
    page.tsx
    DashboardClient.tsx
    todos/
      actions.ts

components/
  todos/
    AddTodoForm.tsx
    TodoList.tsx

contexts/
  TodoContext.tsx

lib/
  action-result.ts
  supabase/
    server.ts
  todos/
    service.ts

types/
  todo.ts
```

---

# Step 13 — Why this is good

This architecture solves several problems:

### No prop drilling

Deep client components do:

```ts
const { createTodo, todos } = useTodo()
```

instead of passing props through 5 levels.

### Clean separation

* service = DB logic
* actions = UI mutation entry points
* context = client sharing
* components = rendering

### Easy to scale

Later you can add:

* `selectedTodo`
* modal state
* filters
* optimistic updates

without breaking the architecture.

---

# Step 14 — Important practical note

If you do local updates with `setTodos(...)` **and** also use `revalidatePath(...)`, that is okay.

Why?

* `setTodos(...)` gives the user an immediate UI update
* `revalidatePath(...)` ensures the server-rendered pages stay correct on next render/navigation

So local state update is for **instant UX**, revalidation is for **server consistency**.

---

# Step 15 — Optional improvement: optimistic helper methods inside context

Later, instead of exposing only raw actions, your provider can expose wrapped methods like:

```ts
async function createTodoAndSync(input: CreateTodoInput) {
  const result = await actions.createTodo(input)

  if (result.success && result.data) {
    setTodos((prev) => [result.data!, ...prev])
  }

  return result
}
```

Then the provider value becomes:

```tsx
<TodoContext.Provider
  value={{
    todos,
    setTodos,
    createTodo: createTodoAndSync,
    updateTodo: updateTodoAndSync,
    deleteTodo: deleteTodoAndSync,
  }}
>
```

That is often even cleaner, because components stay dumb.

---

# Step 16 — Even cleaner provider version

Here is the improved provider:

```tsx
"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"
import type {
  ActionResult,
  CreateTodoInput,
  Todo,
  UpdateTodoInput,
} from "@/types/todo"

type TodoContextType = {
  todos: Todo[]
  createTodo: (input: CreateTodoInput) => Promise<ActionResult<Todo>>
  updateTodo: (id: string, input: UpdateTodoInput) => Promise<ActionResult<Todo>>
  deleteTodo: (id: string) => Promise<ActionResult<void>>
}

const TodoContext = createContext<TodoContextType | undefined>(undefined)

type TodoProviderProps = {
  children: ReactNode
  initialTodos: Todo[]
  actions: {
    createTodo: (input: CreateTodoInput) => Promise<ActionResult<Todo>>
    updateTodo: (id: string, input: UpdateTodoInput) => Promise<ActionResult<Todo>>
    deleteTodo: (id: string) => Promise<ActionResult<void>>
  }
}

export function TodoProvider({
  children,
  initialTodos,
  actions,
}: TodoProviderProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)

  async function createTodo(input: CreateTodoInput) {
    const result = await actions.createTodo(input)

    if (result.success && result.data) {
      setTodos((prev) => [result.data!, ...prev])
    }

    return result
  }

  async function updateTodo(id: string, input: UpdateTodoInput) {
    const result = await actions.updateTodo(id, input)

    if (result.success && result.data) {
      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? result.data! : todo))
      )
    }

    return result
  }

  async function deleteTodo(id: string) {
    const result = await actions.deleteTodo(id)

    if (result.success) {
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
    }

    return result
  }

  return (
    <TodoContext.Provider
      value={{
        todos,
        createTodo,
        updateTodo,
        deleteTodo,
      }}
    >
      {children}
    </TodoContext.Provider>
  )
}

export function useTodo() {
  const context = useContext(TodoContext)

  if (!context) {
    throw new Error("useTodo must be used within TodoProvider")
  }

  return context
}
```

Then your components become much cleaner.

Example:

```tsx
"use client"

import { useState } from "react"
import { useTodo } from "@/contexts/TodoContext"

export default function AddTodoForm() {
  const { createTodo } = useTodo()
  const [title, setTitle] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const result = await createTodo({ title })

    if (result.success) {
      setTitle("")
    } else {
      alert(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  )
}
```

---

# Step 17 — Final rule to remember

Use this rule:

### Put in service layer

* Supabase queries
* CRUD logic

### Put in server actions

* mutation entry points
* `revalidatePath`
* redirects
* auth checks if needed

### Put in context

* shared client state
* access to server actions
* local sync after mutation

### Put in client components

* forms
* buttons
* UI rendering

---

# Final summary

For your real Todo app, the steps are:

1. Create `Todo` types
2. Create result helpers like `ok/fail`
3. Create server Supabase client
4. Create server-only CRUD service functions
5. Create server actions for create/update/delete
6. Create a client `TodoProvider`
7. Fetch initial todos in a server page
8. Pass `initialTodos + actions` into the provider
9. Use `useTodo()` in deep client components
10. Let the provider manage local updates to avoid prop drilling and keep UI responsive

If you want, next I can give you the **full final code ready to paste** for all files in one message.
