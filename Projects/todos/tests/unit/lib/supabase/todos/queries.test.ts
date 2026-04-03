import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUser, createClient } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/auth/queries", () => ({
  getUser,
}))

vi.mock("@/lib/supabase/clients/server", () => ({
  createClient,
}))

import { getTodoById } from "@/lib/supabase/todos/queries"

describe("todos queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when there is no authenticated user", async () => {
    getUser.mockResolvedValue(null)
    createClient.mockResolvedValue({})

    const result = await getTodoById("550e8400-e29b-41d4-a716-446655440000")

    expect(result).toBeNull()
  })

  it("throws a friendly message when Supabase returns an error", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST116",
        message: "The result contains 0 rows",
      },
    })

    const eqByUser = vi.fn().mockReturnValue({ maybeSingle })
    const eqById = vi.fn().mockReturnValue({ eq: eqByUser })

    createClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqById,
        }),
      }),
    })
    getUser.mockResolvedValue({ id: "user-1" })

    await expect(
      getTodoById("550e8400-e29b-41d4-a716-446655440000")
    ).rejects.toThrow("The item was not found. It may have been deleted.")
  })

  it("returns the todo data when the query succeeds", async () => {
    const todo = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Existing todo",
      todo_tags: [],
      categories: null,
    }

    const maybeSingle = vi.fn().mockResolvedValue({
      data: todo,
      error: null,
    })

    const eqByUser = vi.fn().mockReturnValue({ maybeSingle })
    const eqById = vi.fn().mockReturnValue({ eq: eqByUser })

    createClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqById,
        }),
      }),
    })
    getUser.mockResolvedValue({ id: "user-1" })

    const result = await getTodoById("550e8400-e29b-41d4-a716-446655440000")

    expect(result).toEqual(todo)
  })
})
