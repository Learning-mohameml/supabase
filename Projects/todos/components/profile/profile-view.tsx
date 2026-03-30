"use client"

import { Calendar, Mail, Shield } from "lucide-react"
import type { UpdateProfileInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"
import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog"

type ProfileUser = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  provider: string
  createdAt: string
}

export function ProfileView({
  user,
  onUpdateProfile,
  onDeleteAccount,
}: {
  user: ProfileUser
  onUpdateProfile: (data: UpdateProfileInput) => Promise<ActionResult>
  onDeleteAccount: () => Promise<ActionResult>
}) {
  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account</CardTitle>
            <EditProfileDialog
              currentName={user.displayName}
              onUpdate={onUpdateProfile}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium">
                {user.displayName || "No display name"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Mail className="size-4" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Shield className="size-4" />
              <span className="capitalize">{user.provider}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Calendar className="size-4" />
              <span>Member since {memberSince}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data (todos, categories, tags). This action cannot be undone.
          </p>
          <DeleteAccountDialog onDelete={onDeleteAccount} />
        </CardContent>
      </Card>
    </div>
  )
}
