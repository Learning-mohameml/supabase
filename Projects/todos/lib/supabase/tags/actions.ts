"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail, type ActionResult } from "@/types/actions"
import type { CreateTagInput, UpdateTagInput } from "@/types/helpers"

// Hardcoded user_id until Auth (Chapter 04) replaces it with auth.uid()
const USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"

export async function addTag(data: CreateTagInput): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("tags")
        .insert({
            name: data.name,
            color: data.color,
            user_id: USER_ID,
        })

    if (error) return fail(error.message)

    revalidatePath("/dashboard/tags")
    revalidatePath("/dashboard")
    return ok()
}

export async function updateTag(id: string, data: UpdateTagInput): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("tags")
        .update({
            name: data.name,
            color: data.color,
        })
        .eq("id", id)

    if (error) return fail(error.message)

    revalidatePath("/dashboard/tags")
    revalidatePath("/dashboard")
    return ok()
}

export async function deleteTag(id: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id)

    if (error) return fail(error.message)

    revalidatePath("/dashboard/tags")
    revalidatePath("/dashboard")
    return ok()
}
