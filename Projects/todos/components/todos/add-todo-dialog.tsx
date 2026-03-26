"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import type { Category } from "@/types/helpers"
import type { ActionResult } from "@/types/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type NewTodoData = {
  title: string
  description: string
  priority: number
  category_id: string | null
  due_date: string | null
}

export function AddTodoDialog({
  categories,
  onAdd,
}: {
  categories: Category[]
  onAdd: (data: NewTodoData) => Promise<ActionResult>
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("0")
  const [categoryId, setCategoryId] = useState("none")
  const [dueDate, setDueDate] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const result = await onAdd({
      title: title.trim(),
      description: description.trim() || "",
      priority: Number(priority),
      category_id: categoryId === "none" ? null : categoryId,
      due_date: dueDate || null,
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Todo created")
    setTitle("")
    setDescription("")
    setPriority("0")
    setCategoryId("none")
    setDueDate("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4 mr-2" />
        Add Todo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Todo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">Low</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
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
          <Input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={!title.trim()}>
            Create Todo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
