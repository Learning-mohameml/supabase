"use client"

import { signOut } from "@/lib/supabase/auth/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { toast } from "sonner"
import { toUserMessage } from "@/lib/errors"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2">
      <LogOut className="size-4" />
      <span>Log out</span>
    </Button>
  )
}
