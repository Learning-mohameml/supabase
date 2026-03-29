"use client"

import { FolderOpen } from "lucide-react"
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { CategoryCard } from "@/components/categories/category-card"
import { AddCategoryDialog } from "@/components/categories/add-category-dialog"

type CategoryWithCount = Category & {
  todos: { count: number }[]
}

export function CategoryList({
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: {
  categories: CategoryWithCount[]
  onAdd: (data: CreateCategoryInput) => Promise<ActionResult>
  onUpdate: (id: string, data: UpdateCategoryInput) => Promise<ActionResult>
  onDelete: (id: string) => Promise<ActionResult>
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <span className="text-sm text-muted-foreground tabular-nums">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </span>
        <AddCategoryDialog onAdd={onAdd} />
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FolderOpen className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg">No categories yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
            Create your first category to organize your todos.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              todoCount={category.todos[0]?.count ?? 0}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
