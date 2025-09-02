import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { supabase } from "../lib/supabase"

type DashboardStudent = { status?: string; is_active?: boolean }
type DashboardPayment = { payment_date: string; total_amount: number }

export default function MainDashboard() {
  const [students, setStudents] = useState<DashboardStudent[]>([])
  const [payments, setPayments] = useState<DashboardPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [{ data: studentsData, error: sErr }, { data: paymentsData, error: pErr }] = await Promise.all([
        supabase.from('students').select('status, is_active'),
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

  const totalStudents = students.length
  const activeStudents = students.filter(s => (s.status ? s.status === '재원' : !!s.is_active)).length
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
            <CardTitle>전체 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '로딩 중...' : totalStudents}명</p>
            <p className="text-muted-foreground">
              활성 학생 {loading ? '로딩 중...' : activeStudents}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>이번 달 결제</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? '로딩 중...' : thisMonthPayments.toLocaleString()}원
            </p>
            <p className="text-muted-foreground">
              총 결제 금액
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>결제 건수</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '로딩 중...' : payments.length}건</p>
            <p className="text-muted-foreground">
              전체 결제 내역
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}