"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import type { UpdateProfileInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function EditProfileDialog({
  currentName,
  onUpdate,
}: {
  currentName: string
  onUpdate: (data: UpdateProfileInput) => Promise<ActionResult>
}) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(currentName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return

    const result = await onUpdate({ display_name: displayName.trim() })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Profile updated")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="size-4 mr-2" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Display name</label>
            <Input
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={!displayName.trim()}>
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
