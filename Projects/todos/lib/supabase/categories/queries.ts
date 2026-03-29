import { createClient } from "@/lib/supabase/clients/server"
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

type CategoryWithTodoCount = Category & {
    todos: {count : number}[]
}

export async function getCategoriesWithTodoCount() : Promise<CategoryWithTodoCount[]> {

    const supabase = await createClient()
    const {data , error} = await supabase
        .from("categories")
        .select("* , todos(count)")
        .is("todos.deleted_at" , null);
    
    if(error) throw new Error(error.message);

    return data;
}