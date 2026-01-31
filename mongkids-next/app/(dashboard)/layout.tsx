import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import DashboardHeader from "./dashboard-header"

export default function DashBoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <SidebarTrigger />
        <DashboardHeader />
        {children}
      </main>
    </SidebarProvider>
  )
}