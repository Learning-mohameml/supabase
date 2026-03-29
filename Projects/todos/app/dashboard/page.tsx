import { getTodosWithRelations } from "@/lib/supabase/todos/queries"
import { getCategories } from "@/lib/supabase/categories/queries"
import { toggleTodoComplete, softDeleteTodo, addTodo } from "@/lib/supabase/todos/actions"
import { TodoList } from "@/components/todos/todo-list"
import { Card, CardContent } from "@/components/ui/card"
import { ListTodo, Circle, CheckCircle2, AlertTriangle } from "lucide-react"


export default async function DashboardPage() {
  const [todos, categories] = await Promise.all([
    getTodosWithRelations(),
    getCategories(),
  ])

  const now = new Date()
  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
    overdue: todos.filter((t) => !t.completed && t.due_date && new Date(t.due_date) < now).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Todos</h2>
        <p className="text-sm text-muted-foreground">Manage your tasks and stay on track.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <ListTodo className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Circle className="size-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-red-500/10 p-2">
              <AlertTriangle className="size-4 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
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
