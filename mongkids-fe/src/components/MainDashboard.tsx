import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { supabase } from "../lib/supabase"
import { getGradeLabel } from "../utils/grade"

type DashboardStudent = {
  id: number
  status?: string
  is_active?: boolean
  birth_date?: string | null
  current_level?: string | null
  created_at?: string | null
}
type DashboardPayment = { payment_date: string; total_amount: number }

export default function MainDashboard() {
  const [students, setStudents] = useState<DashboardStudent[]>([])
  const [payments, setPayments] = useState<DashboardPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [todoText, setTodoText] = useState<string>("")

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [{ data: studentsData, error: sErr }, { data: paymentsData, error: pErr }] = await Promise.all([
        supabase.from('students').select('id, status, is_active, birth_date, current_level, created_at'),
        supabase.from('payments').select('payment_date, total_amount')
      ])
      if (sErr) throw sErr
      if (pErr) throw pErr
      setStudents((studentsData as DashboardStudent[]) || [])
      setPayments((paymentsData as DashboardPayment[]) || [])
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // TODO 텍스트 로컬 저장
  useEffect(() => {
    const t = localStorage.getItem('dashboard_todo_text')
    if (t) setTodoText(t)
  }, [])
  useEffect(() => {
    localStorage.setItem('dashboard_todo_text', todoText)
  }, [todoText])

  const totalStudents = students.length
  const activeStudents = students.filter(s => (s.status ? s.status === '재원' : !!s.is_active)).length
  const newRegisteredThisMonth = useMemo(() => {
    const now = new Date()
    return students.filter(s => {
      if (!s.created_at) return false
      const d = new Date(s.created_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [students])

  // 학년 분포
  const gradeDistribution = useMemo(() => {
    const map = new Map<string, number>()
    students.forEach(s => {
      const label = getGradeLabel(s.birth_date || null)
      if (!label) return
      map.set(label, (map.get(label) || 0) + 1)
    })
    // 보기 좋게 정렬: 유사 학년 순서
    const order = ['6세','초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3','성인']
    const entries = Array.from(map.entries())
    entries.sort((a,b) => (order.indexOf(a[0]) - order.indexOf(b[0])))
    return entries
  }, [students])

  // 레벨 분포
  const levelDistribution = useMemo(() => {
    const map = new Map<string, number>()
    students.forEach(s => {
      const level = s.current_level || 'NONE'
      map.set(level, (map.get(level) || 0) + 1)
    })
    const order = ['NONE','WHITE','YELLOW','GREEN','BLUE','RED','BLACK','GOLD']
    const entries = Array.from(map.entries())
    entries.sort((a,b) => (order.indexOf(a[0]) - order.indexOf(b[0])))
    return entries
  }, [students])
  const thisMonthPayments = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date)
      const now = new Date()
      return paymentDate.getMonth() === now.getMonth() && 
             paymentDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, p) => sum + p.total_amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1>메인 대시보드</h1>
        <p className="text-muted-foreground">학원 관리 시스템에 오신 것을 환영합니다.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>재원생 + 신규 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <p className="text-3xl font-bold">{loading ? '로딩 중...' : activeStudents}명</p>
              <p className="text-muted-foreground">재원</p>
            </div>
            <div className="mt-2 text-sm">
              신규 등록: <span className="font-semibold">{loading ? '로딩 중...' : newRegisteredThisMonth}명</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>학년별 재원생 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {loading ? (
                <span>로딩 중...</span>
              ) : gradeDistribution.length === 0 ? (
                <span className="text-muted-foreground">데이터 없음</span>
              ) : (
                gradeDistribution.map(([grade, count]) => (
                  <div key={grade} className="flex items-center justify-between px-2 py-1 rounded border">
                    <span>{grade}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>레벨 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {loading ? (
                <span>로딩 중...</span>
              ) : levelDistribution.length === 0 ? (
                <span className="text-muted-foreground">데이터 없음</span>
              ) : (
                levelDistribution.map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between px-2 py-1 rounded border">
                    <span>{level}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>TODO</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[120px] rounded border p-3 text-sm"
              placeholder="메모/할일을 적어두세요"
              value={todoText}
              onChange={(e)=> setTodoText(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}