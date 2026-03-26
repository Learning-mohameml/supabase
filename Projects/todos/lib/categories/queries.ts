import { createClient } from "@/utils/supabase/server"
import type { Category } from "@/types/helpers"

export async function getCategories(): Promise<Category[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name")

    if (error) throw new Error(error.message)
    return data
}
