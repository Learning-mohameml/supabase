import { createClient } from "@/lib/supabase/clients/client"

export async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            // redriect 2 : supabase -- to --> server Next js 
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    })
}

export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
}
