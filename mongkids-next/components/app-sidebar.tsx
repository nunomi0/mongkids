import { Home, BookOpen, Users, UserPlus } from "lucide-react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "메인",
    url: "/",
    icon: Home,
  },
  {
    title: "수업 관리",
    icon: BookOpen,
    children: [
      {
        title: "일별 수업",
        url: "/classes/daily",
      },
      {
        title: "주차별 수업",
        url: "/classes/weekly",
      },
    ],
  },
  {
    title: "학생 관리",
    url: "/students",
    icon: Users,
  },
  {
    title: "체험 관리",
    url: "/trials",
    icon: UserPlus,
  }
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>몽키즈클라이밍</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  
                  {/* 상위 메뉴 */}
                  <SidebarMenuButton asChild>
                    {item.url ? (
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </div>
                    )}
                  </SidebarMenuButton>

                  {/* 서브 메뉴 */}
                  {item.children && (
                    <SidebarMenuSub>
                      {item.children.map((sub) => (
                        <SidebarMenuSubItem key={sub.title}>
                          <SidebarMenuSubButton asChild>
                            <Link href={sub.url}>
                              <span>{sub.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}

                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>

        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}