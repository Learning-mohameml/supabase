import { getTodosWithRelations } from "@/lib/todos/queries"
import { getCategories } from "@/lib/categories/queries"
import { toggleTodoComplete, softDeleteTodo, addTodo } from "@/lib/todos/actions"
import { TodoList } from "@/components/todos/todo-list"

export default async function DashboardPage() {
  const [todos, categories] = await Promise.all([
    getTodosWithRelations(),
    getCategories(),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Todos</h2>
        <p className="text-muted-foreground">Manage your todos here.</p>
      </div>
      <TodoList
        initialTodos={todos}
        categories={categories}
        onToggleComplete={toggleTodoComplete}
        onDelete={softDeleteTodo}
        onAdd={addTodo}
      />
    </div>
  )
}
