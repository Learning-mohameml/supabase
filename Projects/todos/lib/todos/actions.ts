"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { ok, fail, type ActionResult } from "@/types/actions"

// Hardcoded user_id until Auth (Chapter 04) replaces it with auth.uid()
const USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"

export async function toggleTodoComplete(
    id: string,
    completed: boolean
): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todos")
        .update({ completed })
        .eq("id", id)


    if (error) return fail(error.message)

    revalidatePath("/dashboard")
    return ok()
}

export async function softDeleteTodo(id: string): Promise<ActionResult> {

    const supabase = await createClient()
    const { error } = await supabase
        .from("todos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)

    if (error) return fail(error.message)

    revalidatePath("/dashboard")
    return ok()

}

export async function addTodo(data: {
    title: string
    description: string
    priority: number
    category_id: string | null
    due_date: string | null

}): Promise<ActionResult> {

    const supabase = await createClient()
    const { error } = await supabase
        .from("todos")
        .insert({
            title: data.title,
            description: data.description,
            priority: data.priority,
            category_id: data.category_id,
            due_date: data.due_date,
            user_id: USER_ID,
        })

    if (error) return fail(error.message)

    revalidatePath("/dashboard")
    return ok()
}
