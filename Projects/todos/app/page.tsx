import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import LogoutButton from './components/logout-button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  return (
    <main>
      <h1>Home</h1>

      {data.user ? (
        <div>
          <p>You are logged in as: {data.user.email}</p>
          <LogoutButton />
        </div>
      ) : (
        <div>
          <p>You are not logged in.</p>
          <Link href="/login">Go to login</Link>
        </div>
      )}
    </main>
  )
}