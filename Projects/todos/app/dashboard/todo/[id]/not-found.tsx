import Link from "next/link"

export default function TodoNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <h2 className="text-xl font-semibold">Todo not found</h2>
      <p className="text-muted-foreground text-center max-w-md">
        This todo doesn&apos;t exist or has been deleted.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
