// ---------------------------------------------------------------------------
// Error translation layer
// Maps raw Supabase / PostgreSQL errors to user-friendly messages.
// ---------------------------------------------------------------------------

import { fail, type ActionResult } from "@/types/actions"

type SupabaseError = {
  code?: string
  message?: string
}

/** Known error patterns: [test, user-facing message] */
const ERROR_MAP: [test: (code: string, msg: string) => boolean, message: string][] = [
  // PostgreSQL 23505 — unique constraint violation
  [(code, msg) => code === "23505" || /duplicate|unique/i.test(msg),
    "This name already exists. Please choose a different one."],

  // PostgreSQL 42501 — RLS / insufficient privilege
  [(code, msg) => code === "42501" || /row.level security|permission denied/i.test(msg),
    "You don't have permission to do this."],

  // PostgreSQL 23503 — foreign key violation
  [(code, msg) => code === "23503" || /foreign key/i.test(msg),
    "This item is linked to other data. Remove those links first."],

  // PostgREST PGRST116 — no rows returned
  [(code, msg) => code === "PGRST116" || /no rows/i.test(msg),
    "The item was not found. It may have been deleted."],

  // JWT / session expired
  [(_code, msg) => /jwt expired|token.*expired|expired.*token/i.test(msg),
    "Your session has expired. Please sign in again."],

  // Network / fetch errors
  [(_code, msg) => /fetcherror|network|ECONNREFUSED|fetch failed/i.test(msg),
    "Connection error. Check your internet and try again."],

  // Not authenticated
  [(_code, msg) => /not authenticated|auth.*required|unauthorized/i.test(msg),
    "Please sign in to continue."],
]

const GENERIC_MESSAGE = "Something went wrong. Please try again."

/**
 * Translates a raw error into a user-friendly message.
 * Accepts any shape: Supabase error object, native Error, string, or unknown.
 */
export function toUserMessage(error: unknown): string {
  const { code, message } = extractCodeAndMessage(error)

  for (const [test, userMessage] of ERROR_MAP) {
    if (test(code, message)) return userMessage
  }

  return GENERIC_MESSAGE
}

/**
 * Logs an error server-side with context.
 * In production (Vercel, etc.) console.error goes to platform logs.
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)
}

/**
 * Wraps a server action with a top-level try/catch safety net.
 * Catches unexpected errors (network, runtime) that bypass the `if (error)` check.
 */
export function withErrorHandling<Args extends unknown[]>(
  name: string,
  fn: (...args: Args) => Promise<ActionResult>
) {
  return async (...args: Args): Promise<ActionResult> => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(name, error)
      return fail(toUserMessage(error))
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCodeAndMessage(error: unknown): { code: string; message: string } {
  if (error == null) return { code: "", message: "" }

  if (typeof error === "string") return { code: "", message: error }

  if (typeof error === "object") {
    const e = error as SupabaseError
    return {
      code: e.code ?? "",
      message: e.message ?? String(error),
    }
  }

  return { code: "", message: String(error) }
}
