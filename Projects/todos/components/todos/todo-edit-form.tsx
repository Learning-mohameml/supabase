"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Category, TodoWithRelations, UpdateTodoInput } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TodoEditForm({
  todo,
  categories,
  onSubmit,
}: {
  todo: TodoWithRelations
  categories: Category[]
  onSubmit: (data: UpdateTodoInput) => Promise<ActionResult>
}) {
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description ?? "")
  const [priority, setPriority] = useState(String(todo.priority))
  const [categoryId, setCategoryId] = useState(todo.category_id ?? "none")
  const [dueDate, setDueDate] = useState(todo.due_date ? toDatetimeLocal(todo.due_date) : "")
  const [metadataJson, setMetadataJson] = useState(JSON.stringify(todo.metadata ?? {}, null, 2))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    let parsedMetadata: Record<string, unknown> = {}
    try {
      parsedMetadata = JSON.parse(metadataJson)
    } catch {
      toast.error("Invalid JSON in metadata field")
      return
    }

    setSaving(true)
    const result = await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      priority: Number(priority),
      category_id: categoryId === "none" ? null : categoryId,
      due_date: dueDate || null,
      metadata: parsedMetadata,
    })
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Todo updated")
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Todo title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details (optional)"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Priority</label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority">
                    {(value: string) => {
                      const labels: Record<string, string> = { "0": "None", "1": "Low", "2": "Medium", "3": "High" }
                      return labels[value] ?? "Priority"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Category</label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Category">
                    {(value: string) => {
                      if (value === "none") return "No category"
                      const cat = categories.find((c) => c.id === value)
                      if (!cat) return "Category"
                      return (
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
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
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Due date</label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Metadata (JSON)</label>
            <Textarea
              value={metadataJson}
              onChange={(e) => setMetadataJson(e.target.value)}
              placeholder="{}"
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={!title.trim() || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
