"use client"

import type { Category } from "@/types/helpers"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type TodoFiltersState = {
  category: string   // "all" | category UUID
  priority: string   // "all" | "0" | "1" | "2" | "3"
  status: string     // "all" | "completed" | "active"
}

export function TodoFilters({
  categories,
  filters,
  onFiltersChange,
}: {
  categories: Category[]
  filters: TodoFiltersState
  onFiltersChange: (filters: TodoFiltersState) => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.category}
        onValueChange={(v) => v && onFiltersChange({ ...filters, category: v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) => v && onFiltersChange({ ...filters, priority: v })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="3">High</SelectItem>
          <SelectItem value="2">Medium</SelectItem>
          <SelectItem value="1">Low</SelectItem>
          <SelectItem value="0">None</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(v) => v && onFiltersChange({ ...filters, status: v })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
