import { createClient } from "@/lib/supabase/clients/client"
import { toUserMessage } from "@/lib/errors"

export async function signInWithGoogle() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            // redriect 2 : supabase -- to --> server Next js
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    })
    if (error) throw new Error(toUserMessage(error))
}

export async function signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(toUserMessage(error))
}

export async function signInWithMagicLink(email: string) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
    })
    if (error) throw new Error(toUserMessage(error))
}
