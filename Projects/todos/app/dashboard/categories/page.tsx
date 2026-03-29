import { getCategoriesWithTodoCount } from "@/lib/supabase/categories/queries"
import { addCategory, updateCategory, deleteCategory } from "@/lib/supabase/categories/actions"
import { CategoryList } from "@/components/categories/category-list"

export default async function CategoriesPage() {
  const categories = await getCategoriesWithTodoCount()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
        <p className="text-sm text-muted-foreground">Organize your todos by category.</p>
      </div>

      <CategoryList
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />
    </div>
  )
}
