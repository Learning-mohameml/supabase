import { getUser } from "@/lib/auth/queries"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user?.email} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <h1 className="text-sm font-medium">Dashboard</h1>
        </header>
        <div className="flex-1 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
