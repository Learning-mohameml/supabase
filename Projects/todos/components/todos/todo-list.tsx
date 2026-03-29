"use client"

import { useMemo, useState } from "react"
import { ClipboardList } from "lucide-react"
import type { Category, CreateTodoInput, TodoWithRelations } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { TodoCard } from "@/components/todos/todo-card"
import { TodoFilters, type TodoFiltersState } from "@/components/todos/todo-filters"
import { AddTodoDialog } from "@/components/todos/add-todo-dialog"

export function TodoList({
  initialTodos,
  categories,
  onToggleComplete,
  onDelete,
  onAdd,
}: {
  initialTodos: TodoWithRelations[]
  categories: Category[]
  onToggleComplete: (id: string, completed: boolean) => Promise<ActionResult>
  onDelete: (id: string) => Promise<ActionResult>
  onAdd: (data: CreateTodoInput) => Promise<ActionResult>
}) {
  const [filters, setFilters] = useState<TodoFiltersState>({
    category: "all",
    priority: "all",
    status: "all",
  })

  const hasActiveFilters = filters.category !== "all" || filters.priority !== "all" || filters.status !== "all"

  const filtered = useMemo(() => {
    return initialTodos.filter((todo) => {
      if (filters.category !== "all" && todo.category_id !== filters.category) return false
      if (filters.priority !== "all" && todo.priority !== Number(filters.priority)) return false
      if (filters.status === "active" && todo.completed) return false
      if (filters.status === "completed" && !todo.completed) return false
      return true
    })
  }, [initialTodos, filters])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-3">
          <TodoFilters
            categories={categories}
            filters={filters}
            onFiltersChange={setFilters}
          />
          {hasActiveFilters && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {filtered.length} of {initialTodos.length}
            </span>
          )}
        </div>
        <AddTodoDialog categories={categories} onAdd={onAdd} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ClipboardList className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg">No todos found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
            {hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : "Create your first todo to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
