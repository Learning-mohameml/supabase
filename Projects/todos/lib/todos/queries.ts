import { createClient } from "@/utils/supabase/server"
import type { TodoWithRelations } from "@/types/helpers"

export async function getTodosWithRelations(): Promise<TodoWithRelations[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("todos")
        .select("*, categories(*), todo_tags(*, tags(*))")
        .is("deleted_at", null)
        .order("priority", { ascending: false })

    if (error) throw new Error(error.message)
    return data as TodoWithRelations[]

}
