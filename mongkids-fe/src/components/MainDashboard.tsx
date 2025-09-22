import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { supabase } from "../lib/supabase"
import { getGradeLabel } from "../utils/grade"

type DashboardStudent = {
  id: number
  name: string
  gender: '남' | '여'
  birth_date: string
  phone: string
  registration_date: string
  class_type_id: number | null
  current_level: string | null
  status: '재원' | '퇴원' | '휴원' | '체험'
  created_at: string
}
type DashboardPayment = { payment_date: string; total_amount: number }

// 막대 그래프용 미니 컴포넌트
function BarChartMini({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-14 shrink-0 text-xs text-muted-foreground text-right">{d.label}</div>
          <div className="flex-1 h-3 bg-muted rounded">
            <div
              className="h-3 rounded bg-blue-500"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="w-8 shrink-0 text-xs text-right font-medium">{d.value}</div>
        </div>
      ))}
    </div>
  )
}

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
        supabase.from('students').select('id, name, gender, birth_date, phone, registration_date, class_type_id, current_level, status, created_at'),
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
  const activeStudents = students.filter(s => s.status === '재원').length
  const newRegisteredThisMonth = useMemo(() => {
    const now = new Date()
    return students.filter(s => {
      const d = new Date(s.registration_date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [students])

  // 학년 분포 (재원생만)
  const gradeDistribution = useMemo(() => {
    const map = new Map<string, number>()
    students.filter(s => s.status === '재원').forEach(s => {
      const label = getGradeLabel(s.birth_date || null)
      if (!label) return
      map.set(label, (map.get(label) || 0) + 1)
    })
    const order = ['6세','초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3','성인']
    const entries = Array.from(map.entries())
    entries.sort((a,b) => (order.indexOf(a[0]) - order.indexOf(b[0])))
    return entries
  }, [students])

  // 레벨 분포 (재원생만)
  const levelDistribution = useMemo(() => {
    const map = new Map<string, number>()
    students.filter(s => s.status === '재원').forEach(s => {
      const level = s.current_level || 'NONE'
      map.set(level, (map.get(level) || 0) + 1)
    })
    const order = ['NONE','WHITE','YELLOW','GREEN','BLUE','RED','BLACK','GOLD']
    const entries = Array.from(map.entries())
    entries.sort((a,b) => (order.indexOf(a[0]) - order.indexOf(b[0])))
    return entries
  }, [students])

  const gradeChartData = useMemo(
    () => gradeDistribution.map(([label, value]) => ({ label, value })), 
    [gradeDistribution]
  )
  const levelChartData = useMemo(
    () => levelDistribution.map(([label, value]) => ({ label, value })), 
    [levelDistribution]
  )

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
        <p className="text-muted-foreground">학생 현황, 분포를 확인할 수 있습니다.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>재원생 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <p className="text-muted-foreground">재원</p>
              <p className="text-3xl font-bold">{loading ? '로딩 중...' : activeStudents}명</p>
            </div>
            <div className="flex items-baseline gap-4">
              <p className="text-muted-foreground">신규등록</p>
              <p className="text-3xl font-bold">{loading ? '로딩 중...' : newRegisteredThisMonth}명</p>
            </div>
          </CardContent>
        </Card>

        {/* 학년별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>학년별 재원생 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <span>로딩 중...</span>
            ) : gradeChartData.length === 0 ? (
              <span className="text-muted-foreground">데이터 없음</span>
            ) : (
              <BarChartMini data={gradeChartData} />
            )}
          </CardContent>
        </Card>

        {/* 레벨별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>레벨 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <span>로딩 중...</span>
            ) : levelChartData.length === 0 ? (
              <span className="text-muted-foreground">데이터 없음</span>
            ) : (
              <BarChartMini data={levelChartData} />
            )}
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