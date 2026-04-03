import { notFound } from "next/navigation"
import { getTodoById } from "@/lib/supabase/todos/queries"
import { getCategories } from "@/lib/supabase/categories/queries"
import { getTags } from "@/lib/supabase/tags/queries"
import { updateTodo, addTagToTodo, removeTagFromTodo } from "@/lib/supabase/todos/actions"
import { TodoDetail } from "@/components/todos/todo-detail"

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default async function TodoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!isUuid(id)) notFound()

  const [todo, categories, tags] = await Promise.all([
    getTodoById(id),
    getCategories(),
    getTags(),
  ])

  if (!todo) notFound()

  return (
    <TodoDetail
      todo={todo}
      categories={categories}
      allTags={tags}
      onUpdate={updateTodo}
      onAddTag={addTagToTodo}
      onRemoveTag={removeTagFromTodo}
    />
  )
}
