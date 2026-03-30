"use client"

import { Tags } from "lucide-react"
import type { Tag, CreateTagInput, UpdateTagInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { TagCard } from "@/components/tags/tag-card"
import { AddTagDialog } from "@/components/tags/add-tag-dialog"

type TagWithCount = Tag & {
  todo_tags: { count: number }[]
}

export function TagList({
  tags,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tags: TagWithCount[]
  onAdd: (data: CreateTagInput) => Promise<ActionResult>
  onUpdate: (id: string, data: UpdateTagInput) => Promise<ActionResult>
  onDelete: (id: string) => Promise<ActionResult>
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <span className="text-sm text-muted-foreground tabular-nums">
          {tags.length} {tags.length === 1 ? "tag" : "tags"}
        </span>
        <AddTagDialog onAdd={onAdd} />
      </div>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Tags className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg">No tags yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
            Create your first tag to label and filter your todos.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              todoCount={tag.todo_tags[0]?.count ?? 0}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
