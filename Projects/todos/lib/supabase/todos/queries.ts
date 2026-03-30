import { createClient } from "@/lib/supabase/clients/server"
import type { TodoWithRelations } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"

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

    if (error) throw new Error(error.message)
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

    if (error) throw new Error(error.message)

    return data as TodoWithRelations | null
}
