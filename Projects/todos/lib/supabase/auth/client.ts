import { createClient } from "@/lib/supabase/clients/client"

export async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    })
}

export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
}
