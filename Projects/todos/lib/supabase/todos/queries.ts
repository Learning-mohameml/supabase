import { createClient } from "@/lib/supabase/clients/server"
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

export async function getTodoById(id: string): Promise<TodoWithRelations | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("todos")
        .select("* ,categories(*), todo_tags(*, tags(*))")
        .eq("id", id)
        .maybeSingle();

    if (error) throw new Error(error.message)

    return data as TodoWithRelations | null
}
