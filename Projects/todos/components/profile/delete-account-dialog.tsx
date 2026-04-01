"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { ActionResult } from "@/types/actions"
import { signOut } from "@/lib/supabase/auth/client"
import { toUserMessage } from "@/lib/errors"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function DeleteAccountDialog({
  onDelete,
}: {
  onDelete: () => Promise<ActionResult>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    const result = await onDelete()

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    try {
      await signOut()
    } catch (error) {
      toast.error(toUserMessage(error))
    }
    router.push("/login")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Trash2 className="size-4 mr-2" />
        Delete Account
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will permanently delete your account and all your data (todos, categories, tags). This cannot be undone.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Type <span className="font-mono text-destructive">delete my account</span> to confirm
            </label>
            <Input
              placeholder="delete my account"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          <Button
            variant="destructive"
            className="w-full"
            disabled={confirmation !== "delete my account" || loading}
            onClick={handleDelete}
          >
            {loading ? "Deleting..." : "Permanently Delete Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
