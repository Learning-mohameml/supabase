"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail } from "@/types/actions"
import type { CreateTagInput, UpdateTagInput } from "@/types/helpers"
import { getUser } from "../auth/queries"
import { toUserMessage, logError, withErrorHandling } from "@/lib/errors"

export const addTag = withErrorHandling("addTag", async (data: CreateTagInput) => {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return fail("Please sign in to continue.")

    const { error } = await supabase
        .from("tags")
        .insert({
            name: data.name,
            color: data.color,
            user_id: user.id,
        })

    if (error) {
        logError("addTag", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard/tags")
    revalidatePath("/dashboard")
    return ok()
})

export const updateTag = withErrorHandling("updateTag", async (id: string, data: UpdateTagInput) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("tags")
        .update({
            name: data.name,
            color: data.color,
        })
        .eq("id", id)

    if (error) {
        logError("updateTag", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard/tags")
    revalidatePath("/dashboard")
    return ok()
})

export const deleteTag = withErrorHandling("deleteTag", async (id: string) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id)

    if (error) {
        logError("deleteTag", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard/tags")
    revalidatePath("/dashboard")
    return ok()
})
