"use client"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {error.message || "Failed to load your todos. Please try again."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
