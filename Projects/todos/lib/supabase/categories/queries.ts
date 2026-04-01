import { createClient } from "@/lib/supabase/clients/server"
import type { Category } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"
import { toUserMessage, logError } from "@/lib/errors"

export async function getCategories(): Promise<Category[]> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name")

    if (error) {
        logError("getCategories", error)
        throw new Error(toUserMessage(error))
    }
    return data
}

type CategoryWithTodoCount = Category & {
    todos: {count : number}[]
}

export async function getCategoriesWithTodoCount() : Promise<CategoryWithTodoCount[]> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return []

    const {data , error} = await supabase
        .from("categories")
        .select("* , todos(count)")
        .eq("user_id", user.id)
        .is("todos.deleted_at" , null)

    if (error) {
        logError("getCategoriesWithTodoCount", error)
        throw new Error(toUserMessage(error))
    }

    return data
}