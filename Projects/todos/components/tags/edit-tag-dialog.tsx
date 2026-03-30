"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Tag, UpdateTagInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
]

export function EditTagDialog({
  tag,
  open,
  onOpenChange,
  onUpdate,
}: {
  tag: Tag
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: UpdateTagInput) => Promise<ActionResult>
}) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const result = await onUpdate(tag.id, {
      name: name.trim(),
      color,
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Tag updated")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Name</label>
            <Input
              placeholder="Tag name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Color</label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="size-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "var(--foreground)" : "transparent",
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim()}>
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
