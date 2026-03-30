"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail, type ActionResult } from "@/types/actions"
import type { CreateCategoryInput, UpdateCategoryInput } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"

export async function addCategory(data: CreateCategoryInput): Promise<ActionResult> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return fail("Not authenticated")

    const { error } = await supabase
        .from("categories")
        .insert({
            name: data.name,
            color: data.color,
            icon: data.icon,
            user_id: user.id,
        })

    if (error) return fail(error.message)

    revalidatePath("/dashboard/categories")
    revalidatePath("/dashboard")
    return ok()
}

export async function updateCategory(id: string, data: UpdateCategoryInput): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("categories")
        .update({
            name: data.name,
            color: data.color,
            icon: data.icon,
        })
        .eq("id", id)

    if (error) return fail(error.message)

    revalidatePath("/dashboard/categories")
    revalidatePath("/dashboard")
    return ok()
}

export async function deleteCategory(id: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)

    if (error) return fail(error.message)

    revalidatePath("/dashboard/categories")
    revalidatePath("/dashboard")
    return ok()
}
