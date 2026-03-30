"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail, type ActionResult } from "@/types/actions"
import type { Json } from "@/types/database.types"
import type { CreateTodoInput, UpdateTodoInput } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"

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

export async function addTodo(data: CreateTodoInput): Promise<ActionResult> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return fail("Not authenticated")

    const { error } = await supabase
        .from("todos")
        .insert({
            title: data.title,
            description: data.description,
            priority: data.priority,
            category_id: data.category_id,
            due_date: data.due_date,
            user_id: user.id,
        })

    if (error) return fail(error.message)

    revalidatePath("/dashboard")
    return ok()
}


export async function updateTodo(id: string, data: UpdateTodoInput): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todos")
        .update({
            title: data.title,
            description: data.description,
            priority: data.priority,
            category_id: data.category_id,
            due_date: data.due_date,
            metadata: data.metadata as Json,
        })
        .eq("id", id)

    if (error) return fail(error.message)

    
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/todo/${id}`)
    return ok()
}

export async function addTagToTodo(todoId: string, tagId: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todo_tags")
        .insert({ todo_id: todoId, tag_id: tagId })

    if (error) return fail(error.message)

    revalidatePath(`/dashboard/todo/${todoId}`)
    return ok()
}

export async function removeTagFromTodo(todoId: string, tagId: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todo_tags")
        .delete()
        .eq("todo_id", todoId)
        .eq("tag_id", tagId)

    if (error) return fail(error.message)

    revalidatePath(`/dashboard/todo/${todoId}`)
    return ok()
}
