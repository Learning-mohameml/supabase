"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CheckSquare,
  FolderOpen,
  Tags,
  UserCircle,
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
  { title: "Profile", href: "/dashboard/profile", icon: UserCircle },
]

export function AppSidebar({ userEmail, displayName }: { userEmail: string | undefined; displayName: string | undefined }) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckSquare className="size-4" />
          </div>
          <div>
            <span className="text-sm font-semibold leading-none">Todos</span>
            <p className="text-[11px] text-muted-foreground leading-none mt-1">Task Manager</p>
          </div>
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
        <div className="px-2">
          {displayName && (
            <p className="truncate text-sm font-medium">{displayName}</p>
          )}
          {userEmail && (
            <p className="truncate text-xs text-muted-foreground">
              {userEmail}
            </p>
          )}
        </div>
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  )
}
