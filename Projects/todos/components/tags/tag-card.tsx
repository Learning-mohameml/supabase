"use client"

import { useState } from "react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Tag, UpdateTagInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditTagDialog } from "@/components/tags/edit-tag-dialog"

export function TagCard({
  tag,
  todoCount,
  onUpdate,
  onDelete,
}: {
  tag: Tag
  todoCount: number
  onUpdate: (id: string, data: UpdateTagInput) => Promise<ActionResult>
  onDelete: (id: string) => Promise<ActionResult>
}) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            <h3 className="font-medium">{tag.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  const result = await onDelete(tag.id)
                  if (result.error) toast.error(result.error)
                  else toast.success("Tag deleted")
                }}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">
            {todoCount} {todoCount === 1 ? "todo" : "todos"}
          </Badge>
        </CardContent>
      </Card>

      <EditTagDialog
        tag={tag}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={onUpdate}
      />
    </>
  )
}
