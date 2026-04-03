"use client"

import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Category, Tag, TodoWithRelations, UpdateTodoInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TodoEditForm } from "@/components/todos/todo-edit-form"
import { TagPicker } from "@/components/todos/tag-picker"

const priorityLabels: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
}

const priorityColors: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  3: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const priorityBorderColors: Record<number, string> = {
  1: "#3b82f6",
  2: "#f59e0b",
  3: "#ef4444",
}

export function TodoDetail({
  todo,
  categories,
  allTags,
  onUpdate,
  onAddTag,
  onRemoveTag,
}: {
  todo: TodoWithRelations
  categories: Category[]
  allTags: Tag[]
  onUpdate: (id: string, data: UpdateTodoInput) => Promise<ActionResult>
  onAddTag: (todoId: string, tagId: string) => Promise<ActionResult>
  onRemoveTag: (todoId: string, tagId: string) => Promise<ActionResult>
}) {
  const [editing, setEditing] = useState(false)

  const assignedTagIds = new Set(todo.todo_tags.map((tt) => tt.tags.id))
  const availableTags = allTags.filter((t) => !assignedTagIds.has(t.id))
  const assignedTags = todo.todo_tags.map((tt) => tt.tags)

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <ArrowLeft className="size-4 mr-1" />
            Cancel
          </Button>
          <h2 className="text-lg font-semibold">Edit Todo</h2>
        </div>
        <TodoEditForm
          todo={todo}
          categories={categories}
          onSubmit={async (data) => {
            const result = await onUpdate(todo.id, data)
            if (!result.error) setEditing(false)
            return result
          }}
        />
        <TagPicker
          assignedTags={assignedTags}
          availableTags={availableTags}
          onAdd={(tagId) => onAddTag(todo.id, tagId)}
          onRemove={(tagId) => onRemoveTag(todo.id, tagId)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Link>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="size-4 mr-1" />
          Edit
        </Button>
      </div>

      <Card
        className={cn(
          todo.priority > 0 && "border-l-4",
          todo.completed && "opacity-60",
        )}
        style={todo.priority > 0 ? { borderLeftColor: priorityBorderColors[todo.priority] } : undefined}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn(
                "text-xl font-semibold",
                todo.completed && "line-through text-muted-foreground"
              )}>
                {todo.title}
              </h2>
              {todo.description && (
                <p className="text-sm text-muted-foreground mt-1.5">
                  {todo.description}
                </p>
              )}
            </div>
            <Badge
              variant={todo.completed ? "secondary" : "outline"}
              className={todo.completed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" : ""}
            >
              {todo.completed ? "Completed" : "Active"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground mb-1">Priority</p>
              <Badge variant="secondary" className={priorityColors[todo.priority]}>
                {priorityLabels[todo.priority]}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Category</p>
              {todo.categories ? (
                <Badge variant="outline" style={{ borderColor: todo.categories.color }}>
                  <span
                    className="inline-block size-2 rounded-full mr-1"
                    style={{ backgroundColor: todo.categories.color }}
                  />
                  {todo.categories.name}
                </Badge>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Due date</p>
              {todo.due_date ? (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {format(new Date(todo.due_date), "MMM d, yyyy 'at' h:mm a")}
                </span>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Created</p>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-muted-foreground" />
                {format(new Date(todo.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {assignedTags.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {assignedTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    <span
                      className="inline-block size-2 rounded-full mr-1"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {todo.metadata && Object.keys(todo.metadata).length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Metadata</p>
              <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto">
                {JSON.stringify(todo.metadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
