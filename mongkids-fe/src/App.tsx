import { useState } from "react"
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar"
import { Home, BookOpen, Users } from "lucide-react"
import MainDashboard from "./components/MainDashboard"
import ClassManagement from "./components/ClassManagement"
import StudentManagement from "./components/StudentManagement"

const menuItems = [
  {
    title: "메인",
    icon: Home,
    id: "main"
  },
  {
    title: "수업 관리",
    icon: BookOpen,
    id: "classes"
  },
  {
    title: "학생 관리",
    icon: Users,
    id: "students"
  }
]

export default function App() {
  const [activeMenu, setActiveMenu] = useState("main")

  const renderContent = () => {
    switch (activeMenu) {
      case "main":
        return <MainDashboard />
      case "classes":
        return <ClassManagement />
      case "students":
        return <StudentManagement />
      default:
        return <MainDashboard />
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="px-4 py-2">
              <h2>학원 관리 시스템</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveMenu(item.id)}
                    isActive={activeMenu === item.id}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 p-6">
          <div className="mb-4">
            <SidebarTrigger />
          </div>
          {renderContent()}
        </main>
      </div>
    </SidebarProvider>
  )
}