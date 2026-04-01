import { createClient } from "@/lib/supabase/clients/server"
import type { User } from "@supabase/supabase-js"
import { logError } from "@/lib/errors"

export async function getUser(): Promise<User | null> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
        logError("getUser", error)
        return null
    }
    return user
}
