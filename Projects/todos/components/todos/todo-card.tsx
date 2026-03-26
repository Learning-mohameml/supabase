"use client"

import { format } from "date-fns"
import { Calendar, MoreVertical, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { TodoWithRelations } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

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

export function TodoCard({
  todo,
  onToggleComplete,
  onDelete,
}: {
  todo: TodoWithRelations
  onToggleComplete: (id: string, completed: boolean) => Promise<ActionResult>
  onDelete: (id: string) => Promise<ActionResult>
}) {
  return (
    <Card className={todo.completed ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={async () => {
            const result = await onToggleComplete(todo.id, !todo.completed)
            if (result.error) toast.error(result.error)
          }}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/todo/${todo.id}`}
            className="font-medium hover:underline leading-tight"
          >
            <span className={todo.completed ? "line-through" : ""}>
              {todo.title}
            </span>
          </Link>
          {todo.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {todo.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={async () => {
                const result = await onDelete(todo.id)
                if (result.error) toast.error(result.error)
                else toast.success("Todo deleted")
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pl-10 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          {todo.priority > 0 && (
            <Badge variant="secondary" className={priorityColors[todo.priority]}>
              {priorityLabels[todo.priority]}
            </Badge>
          )}
          {todo.categories && (
            <Badge variant="outline" style={{ borderColor: todo.categories.color }}>
              <span
                className="inline-block size-2 rounded-full mr-1"
                style={{ backgroundColor: todo.categories.color }}
              />
              {todo.categories.name}
            </Badge>
          )}
          {todo.todo_tags?.map(({ tags }) => (
            <Badge key={tags.id} variant="secondary" className="text-xs">
              {tags.name}
            </Badge>
          ))}
          {todo.due_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Calendar className="size-3" />
              {format(new Date(todo.due_date), "MMM d")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
