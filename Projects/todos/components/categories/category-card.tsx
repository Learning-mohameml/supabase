"use client"

import { useState } from "react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Category, UpdateCategoryInput } from "@/types/helpers"
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
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog"

export function CategoryCard({
  category,
  todoCount,
  onUpdate,
  onDelete,
}: {
  category: Category
  todoCount: number
  onUpdate: (id: string, data: UpdateCategoryInput) => Promise<ActionResult>
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
              style={{ backgroundColor: category.color }}
            />
            <h3 className="font-medium">{category.name}</h3>
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
                  const result = await onDelete(category.id)
                  if (result.error) toast.error(result.error)
                  else toast.success("Category deleted")
                }}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {category.icon && (
              <span className="text-lg">{category.icon}</span>
            )}
            <Badge variant="secondary" className="ml-auto">
              {todoCount} {todoCount === 1 ? "todo" : "todos"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <EditCategoryDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={onUpdate}
      />
    </>
  )
}
