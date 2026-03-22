'use client'

import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main>
      <h1>Login</h1>
      <button onClick={handleLogin}>Sign in with Google</button>
    </main>
  )
}