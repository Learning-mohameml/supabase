'use client'

import { signInWithGoogle } from '@/lib/supabase/auth/client'

export default function LoginPage() {
  const handleLogin = async () => {
    await signInWithGoogle()
  }

  return (
    <main>
      <h1>Login</h1>
      <button onClick={handleLogin}>Sign in with Google</button>
    </main>
  )
}