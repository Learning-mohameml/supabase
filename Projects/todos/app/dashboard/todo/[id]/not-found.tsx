import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function TodoNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <h2 className="text-xl font-semibold">Todo not found</h2>
      <p className="text-muted-foreground text-center max-w-md">
        This todo doesn't exist or has been deleted.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  )
}
