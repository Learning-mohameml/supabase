"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CheckSquare,
  FolderOpen,
  Tags,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { LogoutButton } from "@/components/logout-button"

const navItems = [
  { title: "Todos", href: "/dashboard", icon: CheckSquare },
  { title: "Categories", href: "/dashboard/categories", icon: FolderOpen },
  { title: "Tags", href: "/dashboard/tags", icon: Tags },
]

export function AppSidebar({ userEmail }: { userEmail: string | undefined }) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <CheckSquare className="size-5" />
          <span className="text-lg font-semibold">Todos</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        {userEmail && (
          <p className="truncate px-2 text-xs text-muted-foreground">
            {userEmail}
          </p>
        )}
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  )
}
