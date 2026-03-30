import { getTagsWithTodoCount } from "@/lib/supabase/tags/queries"
import { addTag, updateTag, deleteTag } from "@/lib/supabase/tags/actions"
import { TagList } from "@/components/tags/tag-list"

export default async function TagsPage() {
  const tags = await getTagsWithTodoCount()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tags</h2>
        <p className="text-sm text-muted-foreground">Label your todos with tags for quick filtering.</p>
      </div>

      <TagList
        tags={tags}
        onAdd={addTag}
        onUpdate={updateTag}
        onDelete={deleteTag}
      />
    </div>
  )
}
