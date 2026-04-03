import { describe, it, expect, vi } from "vitest"
import { toUserMessage, logError, withErrorHandling } from "@/lib/errors"

// ---------------------------------------------------------------------------
// toUserMessage
// ---------------------------------------------------------------------------
describe("toUserMessage", () => {
  // --- Unique constraint (23505) ---
  it("handles PostgreSQL unique violation by code", () => {
    const error = { code: "23505", message: 'duplicate key value violates unique constraint "categories_user_id_name_key"' }
    expect(toUserMessage(error)).toBe("This name already exists. Please choose a different one.")
  })

  it("handles unique violation by message pattern", () => {
    const error = new Error("duplicate key value violates unique constraint")
    expect(toUserMessage(error)).toBe("This name already exists. Please choose a different one.")
  })

  // --- RLS violation (42501) ---
  it("handles RLS violation by code", () => {
    const error = { code: "42501", message: "permission denied for table todos" }
    expect(toUserMessage(error)).toBe("You don't have permission to do this.")
  })

  it("handles RLS violation by message pattern", () => {
    const error = new Error('new row violates row-level security policy for table "todos"')
    expect(toUserMessage(error)).toBe("You don't have permission to do this.")
  })

  // --- Foreign key violation (23503) ---
  it("handles foreign key violation by code", () => {
    const error = { code: "23503", message: 'insert or update on table "todos" violates foreign key constraint' }
    expect(toUserMessage(error)).toBe("This item is linked to other data. Remove those links first.")
  })

  it("handles foreign key violation by message pattern", () => {
    const error = new Error("violates foreign key constraint")
    expect(toUserMessage(error)).toBe("This item is linked to other data. Remove those links first.")
  })

  // --- PostgREST no rows (PGRST116) ---
  it("handles PGRST116 by code", () => {
    const error = { code: "PGRST116", message: "The result contains 0 rows" }
    expect(toUserMessage(error)).toBe("The item was not found. It may have been deleted.")
  })

  it("handles no rows by message pattern", () => {
    const error = { message: "no rows returned" }
    expect(toUserMessage(error)).toBe("The item was not found. It may have been deleted.")
  })

  // --- JWT / session expired ---
  it("handles JWT expired", () => {
    const error = new Error("JWT expired")
    expect(toUserMessage(error)).toBe("Your session has expired. Please sign in again.")
  })

  it("handles token expired variation", () => {
    const error = { message: "Token has expired or is invalid" }
    expect(toUserMessage(error)).toBe("Your session has expired. Please sign in again.")
  })

  // --- Network errors ---
  it("handles FetchError", () => {
    const error = new Error("FetchError: request to http://localhost:54321 failed")
    expect(toUserMessage(error)).toBe("Connection error. Check your internet and try again.")
  })

  it("handles ECONNREFUSED", () => {
    const error = new Error("connect ECONNREFUSED 127.0.0.1:54321")
    expect(toUserMessage(error)).toBe("Connection error. Check your internet and try again.")
  })

  it("handles fetch failed", () => {
    const error = new Error("fetch failed")
    expect(toUserMessage(error)).toBe("Connection error. Check your internet and try again.")
  })

  // --- Not authenticated ---
  it("handles not authenticated", () => {
    const error = new Error("not authenticated")
    expect(toUserMessage(error)).toBe("Please sign in to continue.")
  })

  it("handles unauthorized", () => {
    const error = { message: "unauthorized" }
    expect(toUserMessage(error)).toBe("Please sign in to continue.")
  })

  // --- Generic fallback ---
  it("returns generic message for unknown errors", () => {
    const error = new Error("some random database error we didn't anticipate")
    expect(toUserMessage(error)).toBe("Something went wrong. Please try again.")
  })

  // --- Edge cases ---
  it("handles null", () => {
    expect(toUserMessage(null)).toBe("Something went wrong. Please try again.")
  })

  it("handles undefined", () => {
    expect(toUserMessage(undefined)).toBe("Something went wrong. Please try again.")
  })

  it("handles plain string", () => {
    expect(toUserMessage("some error string")).toBe("Something went wrong. Please try again.")
  })

  it("handles number", () => {
    expect(toUserMessage(42)).toBe("Something went wrong. Please try again.")
  })

  it("handles empty object", () => {
    expect(toUserMessage({})).toBe("Something went wrong. Please try again.")
  })

  it("handles plain string matching a known pattern", () => {
    expect(toUserMessage("duplicate key")).toBe("This name already exists. Please choose a different one.")
  })
})

// ---------------------------------------------------------------------------
// logError
// ---------------------------------------------------------------------------
describe("logError", () => {
  it("logs error with context prefix", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("test error")

    logError("addTodo", error)

    expect(spy).toHaveBeenCalledWith("[addTodo]", error)
    spy.mockRestore()
  })

  it("logs non-Error values", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    logError("deleteTag", "string error")

    expect(spy).toHaveBeenCalledWith("[deleteTag]", "string error")
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// withErrorHandling
// ---------------------------------------------------------------------------
describe("withErrorHandling", () => {
  it("returns the action result on success", async () => {
    const action = withErrorHandling("test", async () => {
      return { data: undefined as void, error: null }
    })

    const result = await action()
    expect(result).toEqual({ data: undefined, error: null })
  })

  it("catches thrown errors and returns a friendly message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const action = withErrorHandling("testThrow", async () => {
      throw new Error("FetchError: network down")
    })

    const result = await action()
    expect(result).toEqual({ data: null, error: "Connection error. Check your internet and try again." })
    expect(spy).toHaveBeenCalledWith("[testThrow]", expect.any(Error))
    spy.mockRestore()
  })

  it("catches unknown thrown values", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const action = withErrorHandling("testUnknown", async () => {
      throw "something weird"
    })

    const result = await action()
    expect(result).toEqual({ data: null, error: "Something went wrong. Please try again." })
    spy.mockRestore()
  })

  it("passes arguments through to the wrapped function", async () => {
    const action = withErrorHandling("testArgs", async (a: number, b: string) => {
      return { data: `${a}-${b}` as unknown as void, error: null }
    })

    const result = await action(42, "hello")
    expect(result.error).toBeNull()
  })
})
