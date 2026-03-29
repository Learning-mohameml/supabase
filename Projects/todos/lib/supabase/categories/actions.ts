"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail, type ActionResult } from "@/types/actions"
import type { CreateCategoryInput, UpdateCategoryInput } from "@/types/helpers"

// Hardcoded user_id until Auth (Chapter 04) replaces it with auth.uid()
const USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"

export async function addCategory(data: CreateCategoryInput): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("categories")
        .insert({
            name: data.name,
            color: data.color,
            icon: data.icon,
            user_id: USER_ID,
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
