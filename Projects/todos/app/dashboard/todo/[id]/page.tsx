import { notFound } from "next/navigation"
import { getTodoById } from "@/lib/supabase/todos/queries"
import { getCategories } from "@/lib/supabase/categories/queries"
import { getTags } from "@/lib/supabase/tags/queries"
import { updateTodo, addTagToTodo, removeTagFromTodo } from "@/lib/supabase/todos/actions"
import { TodoDetail } from "@/components/todos/todo-detail"

export default async function TodoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
