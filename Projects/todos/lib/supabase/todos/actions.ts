"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/clients/server"
import { ok, fail } from "@/types/actions"
import type { Json } from "@/types/database.types"
import type { CreateTodoInput, UpdateTodoInput } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"
import { toUserMessage, logError, withErrorHandling } from "@/lib/errors"

export const toggleTodoComplete = withErrorHandling("toggleTodoComplete", async (id: string, completed: boolean) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todos")
        .update({ completed })
        .eq("id", id)

    if (error) {
        logError("toggleTodoComplete", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard")
    return ok()
})

export const softDeleteTodo = withErrorHandling("softDeleteTodo", async (id: string) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)

    if (error) {
        logError("softDeleteTodo", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard")
    return ok()
})

export const addTodo = withErrorHandling("addTodo", async (data: CreateTodoInput) => {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return fail("Please sign in to continue.")

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

    if (error) {
        logError("addTodo", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard")
    return ok()
    
})

export const updateTodo = withErrorHandling("updateTodo", async (id: string, data: UpdateTodoInput) => {
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

    if (error) {
        logError("updateTodo", error)
        return fail(toUserMessage(error))
    }

    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/todo/${id}`)
    return ok()
})

export const addTagToTodo = withErrorHandling("addTagToTodo", async (todoId: string, tagId: string) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todo_tags")
        .insert({ todo_id: todoId, tag_id: tagId })

    if (error) {
        logError("addTagToTodo", error)
        return fail(toUserMessage(error))
    }

    revalidatePath(`/dashboard/todo/${todoId}`)
    return ok()
})

export const removeTagFromTodo = withErrorHandling("removeTagFromTodo", async (todoId: string, tagId: string) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from("todo_tags")
        .delete()
        .eq("todo_id", todoId)
        .eq("tag_id", tagId)

    if (error) {
        logError("removeTagFromTodo", error)
        return fail(toUserMessage(error))
    }

    revalidatePath(`/dashboard/todo/${todoId}`)
    return ok()
})
