"use client"

import { X, Plus } from "lucide-react"
import { toast } from "sonner"
import type { Tag } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function TagPicker({
  assignedTags,
  availableTags,
  onAdd,
  onRemove,
}: {
  assignedTags: Tag[]
  availableTags: Tag[]
  onAdd: (tagId: string) => Promise<ActionResult>
  onRemove: (tagId: string) => Promise<ActionResult>
}) {
  const handleAdd = async (tagId: string) => {
    const result = await onAdd(tagId)
    if (result.error) toast.error(result.error)
    else toast.success("Tag added")
  }

  const handleRemove = async (tagId: string) => {
    const result = await onRemove(tagId)
    if (result.error) toast.error(result.error)
    else toast.success("Tag removed")
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Current Tags</p>
          {assignedTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags assigned</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {assignedTags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-4 ml-0.5 hover:bg-destructive/20"
                    onClick={() => handleRemove(tag.id)}
                  >
                    <X className="size-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {availableTags.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Add Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="gap-1 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleAdd(tag.id)}
                >
                  <Plus className="size-3" />
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
