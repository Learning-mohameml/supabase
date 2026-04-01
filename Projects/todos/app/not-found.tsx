import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Page not found. The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}
