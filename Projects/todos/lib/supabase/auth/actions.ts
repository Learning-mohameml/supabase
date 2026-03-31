"use server"

import { revalidatePath } from "next/cache"
import { getUser } from "@/lib/supabase/auth/queries"
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
  const { error } = await supabase.rpc("delete_user")

  if (error) return fail(error.message)

  return ok()
}
