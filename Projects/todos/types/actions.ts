export type ActionResult<T = void> =
  | { data: T; error: null }
  | { data: null; error: string }

export function ok(): ActionResult<void>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | void> {
  return { data: data as T, error: null }
}

export function fail(error: string): ActionResult<never> {
  return { data: null, error }
}
