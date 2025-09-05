import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Plus } from "lucide-react"
import { supabase } from "../lib/supabase"

export default function PaymentManagement() {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [months, setMonths] = useState<string[]>([])
  const [payments, setPayments] = useState<Array<{
    id: number
    student_id: number
    name: string
    courseInfo: string
    amount: number
    paymentDate: string
  }>>([])
  const [allStudents, setAllStudents] = useState<Array<{ id: number; name: string; courseInfo: string }>>([])

  // Add payment form state
  const [newStudentId, setNewStudentId] = useState<string>("")
  const [studentSearch, setStudentSearch] = useState<string>("")
  const [newAmount, setNewAmount] = useState<string>("")
  const [newPaymentDate, setNewPaymentDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [climbingExcluded, setClimbingExcluded] = useState<string>("0")
  const [siblingDiscount, setSiblingDiscount] = useState<string>("0")
  const [additionalDiscount, setAdditionalDiscount] = useState<string>("0")

  const monthOf = (dateStr: string) => dateStr.slice(0,7)

  const loadMonths = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_date')
      .order('payment_date', { ascending: false })
    if (error) {
      console.error('월 목록 로드 오류:', error)
      setMonths((m) => m.length ? m : [selectedMonth])
      return
    }
    const list = Array.from(new Set((data || []).map((p: any) => monthOf(p.payment_date)))).sort().reverse()
    if (list.length) {
      setMonths(list)
      if (!list.includes(selectedMonth)) setSelectedMonth(list[0])
    } else {
      setMonths([selectedMonth])
    }
  }

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, class_types:class_types(category, sessions_per_week)')
      .order('name', { ascending: true })
    if (error) {
      console.error('학생 로드 오류:', error)
      setAllStudents([])
      return
    }
    const mapped = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      courseInfo: s.class_types ? `주 ${s.class_types.sessions_per_week}회 ${s.class_types.category}` : '-'
    }))
    setAllStudents(mapped)
  }

  const loadPayments = async () => {
    const start = `${selectedMonth}-01`
    const endDate = new Date(parseInt(selectedMonth.slice(0,4),10), parseInt(selectedMonth.slice(5,7),10), 0)
    const end = `${endDate.getFullYear()}-${`${endDate.getMonth()+1}`.padStart(2,'0')}-${`${endDate.getDate()}`.padStart(2,'0')}`

    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        student_id,
        payment_date,
        total_amount,
        students:students(
          id,
          name,
          class_types:class_types(category, sessions_per_week)
        )
      `)
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date', { ascending: false })
    if (error) {
      console.error('결제 로드 오류:', error)
      setPayments([])
      return
    }
    const mapped = (data || []).map((p: any) => ({
      id: p.id,
      student_id: p.student_id,
      name: p.students?.name ?? '-',
      courseInfo: p.students?.class_types ? `주 ${p.students.class_types.sessions_per_week}회 ${p.students.class_types.category}` : '-',
      amount: p.total_amount,
      paymentDate: p.payment_date
    }))
    setPayments(mapped)
  }

  useEffect(() => {
    loadMonths()
    loadStudents()
  }, [])

  useEffect(() => {
    loadPayments()
  }, [selectedMonth])

  const parseNum = (v: string) => {
    const n = parseInt((v || '').replace(/[^0-9-]/g, ''), 10)
    return isNaN(n) ? 0 : n
  }

  const gross = useMemo(() => parseNum(newAmount), [newAmount])
  const excl = useMemo(() => parseNum(climbingExcluded), [climbingExcluded])
  const sib = useMemo(() => parseNum(siblingDiscount), [siblingDiscount])
  const add = useMemo(() => parseNum(additionalDiscount), [additionalDiscount])
  const net = Math.max(0, gross - excl - sib - add)

  const visibleStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return allStudents
    return allStudents.filter(s => s.name.toLowerCase().includes(q) || s.courseInfo.toLowerCase().includes(q))
  }, [studentSearch, allStudents])

  const handleAddPayment = async () => {
    if (!newStudentId || !newPaymentDate || net <= 0) return
    const { error } = await supabase
      .from('payments')
      .insert({
        student_id: parseInt(newStudentId, 10),
        payment_date: newPaymentDate,
        total_amount: net,
        climbing_excluded: excl,
        sibling_discount: sib,
        additional_discount: add,
      })
    if (error) {
      console.error('결제 추가 오류:', error)
      return
    }
    setNewStudentId("")
    setStudentSearch("")
    setNewAmount("")
    setClimbingExcluded("0")
    setSiblingDiscount("0")
    setAdditionalDiscount("0")
    setNewPaymentDate(new Date().toISOString().slice(0,10))
    await loadMonths()
    await loadPayments()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>결제 관리</h1>
        <p className="text-muted-foreground">학생들의 결제 현황을 관리합니다.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="월 선택" />
            </SelectTrigger>
            <SelectContent>
              {(months.length ? months : [selectedMonth]).map((m) => (
                <SelectItem key={m} value={m}>{m.replace('-', '년 ')}월</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                결제 정보 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>결제 정보 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-search">학생 검색</Label>
                  <Input id="student-search" placeholder="이름/수강정보 검색" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                  <Label htmlFor="student">학생</Label>
                  <Select value={newStudentId} onValueChange={setNewStudentId}>
                    <SelectTrigger id="student">
                      <SelectValue placeholder="학생 선택" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {visibleStudents.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} ({s.courseInfo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">결제 금액(정가)</Label>
                    <Input id="amount" type="number" placeholder="예: 120000" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="payment-date">결제일</Label>
                    <Input id="payment-date" type="date" value={newPaymentDate} onChange={e => setNewPaymentDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="excl">암벽화 제외 금액</Label>
                    <Input id="excl" type="number" placeholder="예: 10000" value={climbingExcluded} onChange={e => setClimbingExcluded(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="sib">형제자매 할인</Label>
                    <Input id="sib" type="number" placeholder="예: 10000" value={siblingDiscount} onChange={e => setSiblingDiscount(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="add">추가 할인</Label>
                    <Input id="add" type="number" placeholder="예: 5000" value={additionalDiscount} onChange={e => setAdditionalDiscount(e.target.value)} />
                  </div>
                </div>
                <div className="p-3 rounded-md border bg-muted/30 text-sm">
                  <div className="flex justify-between"><span>정가</span><span>{isNaN(gross) ? 0 : gross.toLocaleString()}원</span></div>
                  <div className="flex justify-between"><span>암벽화 제외</span><span>- {excl.toLocaleString()}원</span></div>
                  <div className="flex justify-between"><span>형제자매 할인</span><span>- {sib.toLocaleString()}원</span></div>
                  <div className="flex justify-between"><span>추가 할인</span><span>- {add.toLocaleString()}원</span></div>
                  <div className="flex justify-between font-semibold pt-1 border-t mt-2"><span>실 결제액</span><span>{net.toLocaleString()}원</span></div>
                </div>
                <Button className="w-full" disabled={!newStudentId || net <= 0 || !newPaymentDate} onClick={handleAddPayment}>추가</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedMonth} 결제 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>수강정보</TableHead>
                    <TableHead>결제금액</TableHead>
                    <TableHead>결제일</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.name}</TableCell>
                      <TableCell>{payment.courseInfo}</TableCell>
                      <TableCell>{payment.amount.toLocaleString()}원</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell>
                        <Badge variant="default">완료</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {payments.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">해당 월 결제 내역이 없습니다.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
