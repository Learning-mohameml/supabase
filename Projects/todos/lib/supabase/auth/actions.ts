"use server"

import { revalidatePath } from "next/cache"
import { getUser } from "@/lib/supabase/auth/queries"
import { createClient } from "@/lib/supabase/clients/server"
import { fail, ok } from "@/types/actions"
import type { UpdateProfileInput } from "@/types/helpers"
import { toUserMessage, logError, withErrorHandling } from "@/lib/errors"

export const updateProfile = withErrorHandling("updateProfile", async (data: UpdateProfileInput) => {
    const user = await getUser()
    if (!user) return fail("Please sign in to continue.")

    const displayName = data.display_name.trim()
    if (!displayName) return fail("Display name is required")

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName },
    })

    if (error) {
        logError("updateProfile", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/profile")

    return ok()
})

export const deleteAccount = withErrorHandling("deleteAccount", async () => {
    const user = await getUser()
    if (!user) return fail("Please sign in to continue.")

    const supabase = await createClient()
    const { error } = await supabase.rpc("delete_user")

    if (error) {
        logError("deleteAccount", error)
        return fail(toUserMessage(error))
    }

    return ok()
})
