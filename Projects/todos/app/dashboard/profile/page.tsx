import { redirect } from "next/navigation"
import { getUser } from "@/lib/supabase/auth/queries"
import { updateProfile, deleteAccount } from "@/lib/supabase/auth/actions"
import { ProfileView } from "@/components/profile/profile-view"

export default async function ProfilePage() {
  const user = await getUser()
  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your account settings.</p>
      </div>

      <ProfileView
        user={{
          id: user.id,
          email: user.email ?? "",
          displayName: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "",
          avatarUrl: user.user_metadata?.avatar_url ?? null,
          provider: user.app_metadata?.provider ?? "unknown",
          createdAt: user.created_at,
        }}
        onUpdateProfile={updateProfile}
        onDeleteAccount={deleteAccount}
      />
    </div>
  )
}
