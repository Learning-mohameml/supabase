import { createClient } from "@/lib/supabase/clients/server"
import type { Tag } from "@/types/helpers"
import { getUser } from "@/lib/supabase/auth/queries"

export async function getTags() : Promise<Tag[]> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return []

    const {data , error} = await supabase
        .from("tags")
        .select('*')
        .eq("user_id", user.id)
        .order("name")

    if(error) throw new Error(error.message)

    return data as Tag[]
}

type TagWithTodoCount = Tag & {
    todo_tags: { count: number }[]
}

export async function getTagsWithTodoCount(): Promise<TagWithTodoCount[]> {
    const supabase = await createClient()
    const user = await getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from("tags")
        .select("*, todo_tags(count)")
        .eq("user_id", user.id)
        .order("name")

    if (error) throw new Error(error.message)

    return data
}
