"use client"

import { useMemo, useState } from "react"
import type { Category, TodoWithRelations } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { TodoCard } from "@/components/todos/todo-card"
import { TodoFilters, type TodoFiltersState } from "@/components/todos/todo-filters"
import { AddTodoDialog, type NewTodoData } from "@/components/todos/add-todo-dialog"

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
  onAdd: (data: NewTodoData) => Promise<ActionResult>
}) {
  const [filters, setFilters] = useState<TodoFiltersState>({
    category: "all",
    priority: "all",
    status: "all",
  })

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TodoFilters
          categories={categories}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <AddTodoDialog categories={categories} onAdd={onAdd} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No todos found.
        </p>
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
