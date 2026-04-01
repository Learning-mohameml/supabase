import { createClient } from "@/lib/supabase/clients/server"
import type { TodoWithRelations } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"
import { toUserMessage, logError } from "@/lib/errors"

export async function getTodosWithRelations(): Promise<TodoWithRelations[]> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from("todos")
        .select("*, categories(*), todo_tags(*, tags(*))")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("priority", { ascending: false })

    if (error) {
        logError("getTodosWithRelations", error)
        throw new Error(toUserMessage(error))
    }
    return data as TodoWithRelations[]

}

export async function getTodoById(id: string): Promise<TodoWithRelations | null> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from("todos")
        .select("* ,categories(*), todo_tags(*, tags(*))")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()

    if (error) {
        logError("getTodoById", error)
        throw new Error(toUserMessage(error))
    }

    return data as TodoWithRelations | null
}
