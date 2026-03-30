"use server"

import { revalidatePath } from "next/cache"
import { getUser } from "@/lib/supabase/auth/queries"
import { createAdminClient } from "@/lib/supabase/clients/admin"
import { createClient } from "@/lib/supabase/clients/server"
import { fail, ok, type ActionResult } from "@/types/actions"
import type { UpdateProfileInput } from "@/types/helpers"

export async function updateProfile(
  data: UpdateProfileInput
): Promise<ActionResult> {
  const user = await getUser()
  if (!user) return fail("Not authenticated")

  const displayName = data.display_name.trim()
  if (!displayName) return fail("Display name is required")

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  })

  if (error) return fail(error.message)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/profile")

  return ok()
}

export async function deleteAccount(): Promise<ActionResult> {
  const user = await getUser()
  if (!user) return fail("Not authenticated")

  const supabase = await createClient()

  const { data: todos, error: todosError } = await supabase
    .from("todos")
    .select("id")
    .eq("user_id", user.id)

  if (todosError) return fail(todosError.message)

  const todoIds = todos.map((todo) => todo.id)
  if (todoIds.length > 0) {
    const { error: todoTagsError } = await supabase
      .from("todo_tags")
      .delete()
      .in("todo_id", todoIds)

    if (todoTagsError) return fail(todoTagsError.message)
  }

  const { error: todosDeleteError } = await supabase
    .from("todos")
    .delete()
    .eq("user_id", user.id)

  if (todosDeleteError) return fail(todosDeleteError.message)

  const { error: categoriesDeleteError } = await supabase
    .from("categories")
    .delete()
    .eq("user_id", user.id)

  if (categoriesDeleteError) return fail(categoriesDeleteError.message)

  const { error: tagsDeleteError } = await supabase
    .from("tags")
    .delete()
    .eq("user_id", user.id)

  if (tagsDeleteError) return fail(tagsDeleteError.message)

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.auth.admin.deleteUser(user.id)

    if (error) return fail(error.message)
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to delete account"
    )
  }

  revalidatePath("/dashboard")

  return ok()
}
