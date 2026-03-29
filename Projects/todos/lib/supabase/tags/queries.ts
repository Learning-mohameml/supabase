import { createClient } from "@/lib/supabase/clients/server"
import type { Tag } from "@/types/helpers"

export async function getTags() : Promise<Tag[]> {
    const supabase = await createClient();
    const {data , error} = await supabase
        .from("tags")
        .select('*')
        .order("name");

    if(error) throw new Error(error.message);

    return data as Tag[];
}
