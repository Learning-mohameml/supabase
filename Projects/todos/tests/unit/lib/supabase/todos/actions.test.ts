import { beforeEach, describe, expect, it, vi } from "vitest"

const { revalidatePath, getUser, createClient } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath,
}))

vi.mock("@/lib/supabase/auth/queries", () => ({
  getUser,
}))

vi.mock("@/lib/supabase/clients/server", () => ({
  createClient,
}))

import { addTodo } from "@/lib/supabase/todos/actions"

describe("todos actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a sign-in error when there is no authenticated user", async () => {
    getUser.mockResolvedValue(null)
    createClient.mockResolvedValue({})

    const result = await addTodo({
      title: "Test todo",
      description: "",
      priority: 1,
      category_id: null,
      due_date: null,
    })

    expect(result).toEqual({
      data: null,
      error: "Please sign in to continue.",
    })
  })

  it("returns a friendly message when Supabase insert fails", async () => {
    const insert = vi.fn().mockResolvedValue({
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "todos_user_id_title_key"',
      },
    })

    createClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert,
      }),
    })
    getUser.mockResolvedValue({ id: "user-1" })

    const result = await addTodo({
      title: "Duplicate todo",
      description: "",
      priority: 1,
      category_id: null,
      due_date: null,
    })

    expect(result).toEqual({
      data: null,
      error: "This name already exists. Please choose a different one.",
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("revalidates the dashboard on success", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })

    createClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert,
      }),
    })
    getUser.mockResolvedValue({ id: "user-1" })

    const result = await addTodo({
      title: "New todo",
      description: "Do something important",
      priority: 2,
      category_id: "category-1",
      due_date: "2026-04-05",
    })

    expect(insert).toHaveBeenCalledWith({
      title: "New todo",
      description: "Do something important",
      priority: 2,
      category_id: "category-1",
      due_date: "2026-04-05",
      user_id: "user-1",
    })
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard")
    expect(result).toEqual({
      data: undefined,
      error: null,
    })
  })
})
