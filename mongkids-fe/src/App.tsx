import React, { useState, useEffect } from "react"
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar"
import { Home, BookOpen, Users, UserPlus, LogOut } from "lucide-react"
import MainDashboard from "./components/MainDashboard"
import ClassManagement from "./components/class/ClassManagement"
import StudentManagement from "./components/student/StudentManagement"
import TrialManagement from "./components/trial/TrialManagement"
import LoginScreen from "./components/LoginScreen"
import { supabase } from "./lib/supabase"
import { Button } from "./components/ui/button"

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
  },
  {
    title: "체험 관리",
    icon: UserPlus,
    id: "trial"
  }
]

export default function App() {
  const [activeMenu, setActiveMenu] = useState("main")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 로컬 스토리지에서 인증 상태 확인
    const checkAuth = async () => {
      try {
        const authStatus = localStorage.getItem('mongkids_auth')
        const authTime = localStorage.getItem('mongkids_auth_time')
        
        if (authStatus === 'true' && authTime) {
          // 24시간 후 자동 로그아웃
          const loginTime = parseInt(authTime)
          const now = Date.now()
          const twentyFourHours = 24 * 60 * 60 * 1000
          
          if (now - loginTime < twentyFourHours) {
            // 유효한 세션, Supabase 익명 로그인
            await initSupabaseAuth()
            setIsAuthenticated(true)
          } else {
            // 세션 만료
            localStorage.removeItem('mongkids_auth')
            localStorage.removeItem('mongkids_auth_time')
            setIsAuthenticated(false)
          }
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const initSupabaseAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // 익명 로그인으로 RLS 정책 우회
        await supabase.auth.signInAnonymously()
      }
    } catch (error) {
      console.error('Supabase auth error:', error)
    }
  }

  const handleLogin = async (success: boolean) => {
    if (success) {
      await initSupabaseAuth()
      setIsAuthenticated(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('mongkids_auth')
    localStorage.removeItem('mongkids_auth_time')
    supabase.auth.signOut()
    setIsAuthenticated(false)
  }

  const renderContent = () => {
    switch (activeMenu) {
      case "main":
        return <MainDashboard />
      case "classes":
        return <ClassManagement />
      case "students":
        return <StudentManagement />
      case "trial":
        return <TrialManagement />
      default:
        return <MainDashboard />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="px-4 py-2">
              <h2>몽키즈클라이밍 고양화정점</h2>
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
            
            {/* 로그아웃 버튼 */}
            <div className="mt-auto p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
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