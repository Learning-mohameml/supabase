"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail } from "@/types/actions"
import type { CreateCategoryInput, UpdateCategoryInput } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"
import { toUserMessage, logError, withErrorHandling } from "@/lib/errors"

export const addCategory = withErrorHandling("addCategory", async (data: CreateCategoryInput) => {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return fail("Please sign in to continue.")

    const { error } = await supabase
        .from("categories")
        .insert({
            name: data.name,
            color: data.color,
            icon: data.icon,
            user_id: user.id,
        })

    if (error) {
        logError("addCategory", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard/categories")
    revalidatePath("/dashboard")
    return ok()
})

export const updateCategory = withErrorHandling("updateCategory", async (id: string, data: UpdateCategoryInput) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("categories")
        .update({
            name: data.name,
            color: data.color,
            icon: data.icon,
        })
        .eq("id", id)

    if (error) {
        logError("updateCategory", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard/categories")
    revalidatePath("/dashboard")
    return ok()
})

export const deleteCategory = withErrorHandling("deleteCategory", async (id: string) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)

    if (error) {
        logError("deleteCategory", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard/categories")
    revalidatePath("/dashboard")
    return ok()
})
