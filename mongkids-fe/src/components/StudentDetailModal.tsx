import React, { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Plus } from "lucide-react"
import { supabase } from "../lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import MemoEditor from "./MemoEditor"
import { format } from "date-fns"
import LevelBadge from "./LevelBadge"
import { getGradeLabel } from "../utils/grade"
import { ko } from "date-fns/locale"

type StudentStatus = '재원' | '휴원' | '퇴원'

type StudentSchedule = { weekday: number; time: string; group_no: number }

type Student = {
  id: number
  name: string
  gender: '남' | '여'
  birth_date: string
  shoe_size?: string | null
  phone: string
  registration_date: string
  class_type_id: number | null
  current_level: '' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD' | 'NONE' | null
  status: StudentStatus
  schedules: StudentSchedule[]
}

type ClassType = {
  id: number
  category: string
  sessions_per_week: number
}

type LevelHistory = { level: string; acquired_date: string }

type AttendanceItem = { id: number; status: '예정'|'출석'|'결석'; kind?: '정규'|'보강'; note?: string | null; classes?: { date?: string, time?: string } }

type PaymentItem = {
  id: number
  payment_date: string
  payment_month?: string | null
  total_amount: number
  payment_method?: string | null
  shoe_discount: number
  sibling_discount: number
  additional_discount: number
}

interface StudentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: number | null
}

const weekdayNames = ['월', '화', '수', '목', '금', '토', '일']

function getGrade(birthDate: string) { return getGradeLabel(birthDate) }

function getClassTypeName(classTypeId: number | null, classTypes: ClassType[]) {
  if (!classTypeId) return '-'
  const ct = classTypes.find(c => c.id === classTypeId)
  return ct ? `${ct.category} 주 ${ct.sessions_per_week}회` : '-'
}

function getClassScheduleText(schedules: StudentSchedule[]) {
  if (!schedules || schedules.length === 0) return '-'
  return schedules
    .slice()
    .sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time))
    .map(s => `${weekdayNames[s.weekday]}${s.time}`)
    .join(', ')
}

export default function StudentDetailModal({ isOpen, onClose, studentId }: StudentDetailModalProps) {
  const [student, setStudent] = useState<Student | null>(null)
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [levelHistories, setLevelHistories] = useState<LevelHistory[]>([])
  const [attendance, setAttendance] = useState<AttendanceItem[]>([])
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [attnYearMonth, setAttnYearMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [loading, setLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<{ name: string; birth_date: string; phone: string; shoe_size: string; status: StudentStatus; class_type_id: string; current_level: '' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD' | 'NONE' } | null>(null)
  const [newPayment, setNewPayment] = useState<{ payment_date: string; payment_month: string; total_amount: string; payment_method: string; shoe_discount: string; sibling_discount: string; additional_discount: string }>({
    payment_date: new Date().toISOString().slice(0, 10),
    payment_month: new Date().toISOString().slice(0, 7),
    total_amount: "",
    payment_method: "account",
    shoe_discount: "0",
    sibling_discount: "0",
    additional_discount: "0",
  })

  const getStatusColor = (status: StudentStatus) => {
    if (status === '재원') return 'bg-green-100 text-green-800 border-green-300'
    if (status === '휴원') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const loadData = async (id: number) => {
    try {
      setLoading(true)
      // 학생 + 스케줄 + 레벨
      const { data: studentData, error: sErr } = await supabase
        .from('students')
        .select(`
          *,
          student_schedules ( weekday, time, group_no ),
          student_levels ( level, created_at )
        `)
        .eq('id', id)
        .single()
      if (sErr) throw sErr
      const schedules = (studentData?.student_schedules || []).map((s: any) => ({
        weekday: s.weekday,
        time: s.time,
        group_no: s.group_no,
      })) as StudentSchedule[]
      setStudent({
        id: studentData.id,
        name: studentData.name,
        gender: studentData.gender,
        birth_date: studentData.birth_date,
        shoe_size: studentData.shoe_size,
        phone: studentData.phone,
        registration_date: studentData.registration_date,
        class_type_id: studentData.class_type_id,
        current_level: studentData.current_level,
        status: studentData.status,
        schedules,
      })
      setLevelHistories((studentData?.student_levels || []).map((l: any) => ({ level: l.level, acquired_date: l.created_at })))

      // 초기 편집값 설정
      setEditStudent({
        name: studentData.name,
        birth_date: studentData.birth_date,
        phone: studentData.phone,
        shoe_size: studentData.shoe_size || "",
        status: studentData.status,
        class_type_id: studentData.class_type_id ? String(studentData.class_type_id) : "",
        current_level: (studentData.current_level || '') as any,
      })

      // 클래스 타입
      const { data: classTypeData } = await supabase.from('class_types').select('*')
      setClassTypes(classTypeData as ClassType[] || [])

      // 결제
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', id)
        .order('payment_date', { ascending: false })
      setPayments((payData as PaymentItem[]) || [])

      // 출석 (없으면 빈 배열)
      const { data: attData } = await supabase
        .from('attendance')
        .select('id, status, kind, note, classes:classes(date, time)')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
      setAttendance((attData as AttendanceItem[]) || [])
      // 초기 출석 월 설정 (가장 최근 기록 기준)
      const recent = (attData as AttendanceItem[] | null) || []
      if (recent.length > 0) {
        const d = recent.find(a => a.classes?.date)?.classes?.date
        if (d) setAttnYearMonth(d.slice(0,7))
      }
    } catch (e) {
      console.error('Error loading student detail modal:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && studentId) {
      loadData(studentId)
    } else {
      setStudent(null)
      setLevelHistories([])
      setAttendance([])
      setPayments([])
    }
  }, [isOpen, studentId])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] p-0 overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">학생 상세 정보</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>
        ) : student ? (
          <div className="flex flex-col">
            <div className="p-4 space-y-4">
              <div className="flex-shrink-0 flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <div>
                  <div className="text-xl font-bold text-gray-900">{student.name}</div>
                  <div className="text-sm text-gray-600">{student.birth_date} ({getGradeLabel(student.birth_date)})</div>
                  <div className="text-sm text-gray-600">{getClassTypeName(student.class_type_id, classTypes)} ({getClassScheduleText(student.schedules)})</div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">전화번호:</span>{' '}
                    {student.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">신발 사이즈:</span>{' '}
                    {student.shoe_size || '-'}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">등록일:</span>{' '}
                    {student.registration_date}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {student.current_level && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">현재 레벨:</span>
                      <LevelBadge level={student.current_level as any} size={18} radius={3} />
                    </div>
                  )}
                  <Badge className={`text-sm px-3 py-1 ${getStatusColor(student.status)}`}>{student.status}</Badge>
                  <div className="flex items-center gap-2 ml-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>정보 수정</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsPaymentOpen(true)}>결제 추가</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setDeleteConfirmName(""); setIsDeleteOpen(true) }}>학생 삭제</Button>
                  </div>
                </div>
              </div>

              <Card className="shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">레벨 이력</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-center gap-4">
                    {['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD'].map((level) => {
                      const levelHistory = levelHistories.find(l => l.level === level)
                      return (
                        <div key={level} className="flex flex-col items-center">
                          <LevelBadge level={level as any} size={16} radius={3} />
                          <span className="text-xs text-gray-600 mt-1 font-medium">{level}</span>
                          <span className="text-xs text-gray-500 mt-1 text-center">
                            {levelHistory ? levelHistory.acquired_date : '미취득'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="shrink-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">출석 현황</CardTitle>
                    {attendance.length > 0 && (
                      <div className="w-40">
                        <Select value={attnYearMonth} onValueChange={setAttnYearMonth}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="연-월 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...new Set(attendance
                              .filter(a => a.classes?.date)
                              .map(a => (a.classes!.date as string).slice(0,7))
                            )].sort().reverse().map(ym => (
                              <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">날짜</th>
                          <th className="text-left p-2">시간</th>
                          <th className="text-left p-2">구분</th>
                          <th className="text-left p-2">상태</th>
                          <th className="text-left p-2">메모</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance
                          .filter(a => a.classes?.date && (a.classes!.date as string).startsWith(attnYearMonth))
                          .sort((a,b) => ((a.classes!.date as string)+(a.classes!.time||'' )).localeCompare((b.classes!.date as string)+(b.classes!.time||'')))
                          .map((a) => (
                            <tr key={a.id} className="border-t">
                              <td className="p-2 whitespace-nowrap">{a.classes?.date ? format(new Date(a.classes.date), 'MM/dd (E)', { locale: ko }) : '-'}</td>
                              <td className="p-2 whitespace-nowrap">{a.classes?.time ? (a.classes.time as string).slice(0,5) : '-'}</td>
                              <td className="p-2 whitespace-nowrap">{a.kind || ((a as any).makeup_of_attendance_id ? '보강' : '정규')}</td>
                              <td className="p-2 whitespace-nowrap">
                                <select
                                  className="border rounded px-2 py-1 cursor-pointer hover:bg-accent/30"
                                  value={a.status}
                                  onChange={(e)=> setAttendance(prev => prev.map(x => x.id === a.id ? { ...x, status: e.target.value as any } : x))}
                                >
                                  {['예정','출석','결석'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <div className="text-ellipsis overflow-hidden whitespace-nowrap max-w-[180px]" title={a.note || ''}>
                                    {a.note || <span className="text-muted-foreground">-</span>}
                                  </div>
                                  <MemoEditor
                                    hasNote={!!a.note}
                                    note={a.note || ''}
                                    label={`${student?.name || ''} 메모`}
                                    meta={`${a.classes?.date ? format(new Date(a.classes.date), 'yyyy-MM-dd (E)', { locale: ko }) : ''}${a.classes?.time ? ' ' + (a.classes.time as string).slice(0,5) : ''}`}
                                    onSave={async (next) => {
                                      try {
                                        await supabase.from('attendance').update({ note: next }).eq('id', a.id)
                                        setAttendance(prev => prev.map(x => x.id === a.id ? { ...x, note: next || null } : x))
                                      } catch (e) {
                                        console.error('메모 업데이트 실패:', e)
                                      }
                                    }}
                                  />
                                </div>
                              </td>
                              
                            </tr>
                          ))}
                        {attendance.filter(a => a.classes?.date && (a.classes!.date as string).startsWith(attnYearMonth)).length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">기록 없음</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shrink-0">
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">결제 내역</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setIsPaymentOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> 결제 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {payments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs p-1">결제일</TableHead>
                            <TableHead className="text-xs p-1">해당월</TableHead>
                            <TableHead className="text-xs p-1">금액</TableHead>
                            <TableHead className="text-xs p-1">결제수단</TableHead>
                            <TableHead className="text-xs p-1">할인</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => {
                            let yearMonth = ''
                            if (payment.payment_month) {
                              const [y, m] = payment.payment_month.split('-')
                              yearMonth = `${y}년 ${parseInt(m)}월`
                            } else {
                              const d = new Date(payment.payment_date)
                              yearMonth = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
                            }
                            const methodText = payment.payment_method === 'account' ? '계좌이체' :
                              payment.payment_method === 'card' ? '카드결제' :
                              payment.payment_method === 'voucher' ? '스포츠바우처' : '미지정'
                            return (
                              <TableRow key={payment.id} className="text-xs">
                                <TableCell className="py-1 px-1">{payment.payment_date}</TableCell>
                                <TableCell className="py-1 px-1 font-medium text-blue-600">{yearMonth}</TableCell>
                                <TableCell className="py-1 px-1 font-medium">{payment.total_amount.toLocaleString()}원</TableCell>
                                <TableCell className="py-1 px-1">
                                  <Badge variant="outline" className="text-xs">{methodText}</Badge>
                                </TableCell>
                                <TableCell className="py-1 px-1">
                                  <div className="space-y-1">
                                    {payment.shoe_discount > 0 && (
                                      <div className="text-red-600 text-xs">신발할인: {payment.shoe_discount.toLocaleString()}원</div>
                                    )}
                                    {payment.sibling_discount > 0 && (
                                      <div className="text-blue-600 text-xs">형제할인: {payment.sibling_discount.toLocaleString()}원</div>
                                    )}
                                    {payment.additional_discount > 0 && (
                                      <div className="text-green-600 text-xs">추가할인: {payment.additional_discount.toLocaleString()}원</div>
                                    )}
                                    {payment.shoe_discount === 0 && payment.sibling_discount === 0 && payment.additional_discount === 0 && (
                                      <div className="text-gray-500 text-xs">할인 없음</div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <div className="text-2xl mb-1">📄</div>
                      <div className="text-xs">결제 내역이 없습니다.</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">학생 정보를 찾을 수 없습니다.</div>
        )}
      </DialogContent>

      {/* 정보 수정 다이얼로그 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>학생 정보 수정</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">이름</label>
                <Input value={editStudent.name} onChange={(e)=>setEditStudent(s=>s?{...s, name:e.target.value}:s)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">생년월일</label>
                <Input type="date" value={editStudent.birth_date} onChange={(e)=>setEditStudent(s=>s?{...s, birth_date:e.target.value}:s)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">전화번호</label>
                <Input value={editStudent.phone} onChange={(e)=>setEditStudent(s=>s?{...s, phone:e.target.value}:s)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">신발 사이즈</label>
                <Input value={editStudent.shoe_size} onChange={(e)=>setEditStudent(s=>s?{...s, shoe_size:e.target.value}:s)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">상태</label>
                <select className="w-full p-2 border rounded" value={editStudent.status} onChange={(e)=>setEditStudent(s=>s?{...s, status:e.target.value as StudentStatus}:s)}>
                  <option value="재원">재원</option>
                  <option value="휴원">휴원</option>
                  <option value="퇴원">퇴원</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">현재 레벨</label>
                <select className="w-full p-2 border rounded" value={editStudent.current_level} onChange={(e)=>setEditStudent(s=>s?{...s, current_level:e.target.value as any}:s)}>
                  {['', 'WHITE','YELLOW','GREEN','BLUE','RED','BLACK','GOLD','NONE'].map(l=> (
                    <option key={l} value={l}>{l || '선택 없음'}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">등록반</label>
                <select className="w-full p-2 border rounded" value={editStudent.class_type_id} onChange={(e)=>setEditStudent(s=>s?{...s, class_type_id:e.target.value}:s)}>
                  <option value="">선택</option>
                  {classTypes.map(ct=> (
                    <option key={ct.id} value={ct.id}>{ct.category} 주 {ct.sessions_per_week}회</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setIsEditOpen(false)}>취소</Button>
            <Button onClick={async()=>{
              if (!student || !editStudent) return
              try {
                await supabase.from('students').update({
                  name: editStudent.name,
                  birth_date: editStudent.birth_date,
                  phone: editStudent.phone,
                  shoe_size: editStudent.shoe_size || null,
                  status: editStudent.status,
                  current_level: editStudent.current_level || null,
                  class_type_id: editStudent.class_type_id ? parseInt(editStudent.class_type_id) : null,
                }).eq('id', student.id)
                setIsEditOpen(false)
                if (studentId) await loadData(studentId)
              } catch (e) {
                console.error('Error update student:', e)
              }
            }}>수정</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 결제 추가 다이얼로그 */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>결제 추가</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">결제일</label>
              <Input type="date" value={newPayment.payment_date} onChange={(e)=>setNewPayment(p=>({...p, payment_date:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">해당월</label>
              <Input type="month" value={newPayment.payment_month} onChange={(e)=>setNewPayment(p=>({...p, payment_month:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">정가</label>
              <Input type="number" value={newPayment.total_amount} onChange={(e)=>setNewPayment(p=>({...p, total_amount:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">결제수단</label>
              <select className="w-full p-2 border rounded" value={newPayment.payment_method} onChange={(e)=>setNewPayment(p=>({...p, payment_method:e.target.value}))}>
                <option value="account">계좌이체</option>
                <option value="card">카드결제</option>
                <option value="voucher">스포츠바우처</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">신발 할인</label>
              <Input type="number" value={newPayment.shoe_discount} onChange={(e)=>setNewPayment(p=>({...p, shoe_discount:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">형제자매 할인</label>
              <Input type="number" value={newPayment.sibling_discount} onChange={(e)=>setNewPayment(p=>({...p, sibling_discount:e.target.value}))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">추가 할인</label>
              <Input type="number" value={newPayment.additional_discount} onChange={(e)=>setNewPayment(p=>({...p, additional_discount:e.target.value}))} />
            </div>
          </div>
          <div className="p-3 rounded-md border bg-muted/30 text-sm">
            <div className="flex justify-between"><span>정가</span><span>{parseInt(newPayment.total_amount||'0')||0}원</span></div>
            <div className="flex justify-between"><span>신발 할인</span><span>- {parseInt(newPayment.shoe_discount||'0')||0}원</span></div>
            <div className="flex justify-between"><span>형제자매 할인</span><span>- {parseInt(newPayment.sibling_discount||'0')||0}원</span></div>
            <div className="flex justify-between"><span>추가 할인</span><span>- {parseInt(newPayment.additional_discount||'0')||0}원</span></div>
            <div className="flex justify-between font-semibold pt-1 border-t mt-2">
              <span>실 결제액</span>
              <span>{Math.max(0,(parseInt(newPayment.total_amount||'0')||0)-(parseInt(newPayment.shoe_discount||'0')||0)-(parseInt(newPayment.sibling_discount||'0')||0)-(parseInt(newPayment.additional_discount||'0')||0))}원</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setIsPaymentOpen(false)}>취소</Button>
            <Button onClick={async()=>{
              if (!student) return
              try {
                const total = parseInt(newPayment.total_amount||'0')||0
                const shoe = parseInt(newPayment.shoe_discount||'0')||0
                const sibling = parseInt(newPayment.sibling_discount||'0')||0
                const add = parseInt(newPayment.additional_discount||'0')||0
                const net = Math.max(0, total - shoe - sibling - add)
                await supabase.from('payments').insert({
                  student_id: student.id,
                  payment_date: newPayment.payment_date,
                  payment_month: newPayment.payment_month,
                  total_amount: net,
                  shoe_discount: shoe,
                  sibling_discount: sibling,
                  additional_discount: add,
                  payment_method: newPayment.payment_method,
                })
                setIsPaymentOpen(false)
                if (studentId) await loadData(studentId)
              } catch (e) {
                console.error('Error add payment:', e)
              }
            }}>추가</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>학생 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">정말로 <strong>{student?.name}</strong> 학생을 삭제(퇴원 처리)하시겠습니까?</p>
            <p className="text-sm text-muted-foreground">확인을 위해 학생 이름을 입력하세요.</p>
            <Input value={deleteConfirmName} onChange={(e)=>setDeleteConfirmName(e.target.value)} placeholder="학생 이름" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>{setIsDeleteOpen(false); setDeleteConfirmName("")}}>취소</Button>
              <Button variant="destructive" disabled={deleteConfirmName !== student?.name} onClick={async()=>{
                if (!student) return
                try {
                  await supabase.from('students').update({ status: '퇴원' }).eq('id', student.id)
                  setIsDeleteOpen(false); setDeleteConfirmName("")
                  if (studentId) await loadData(studentId)
                } catch (e) {
                  console.error('Error delete student:', e)
                }
              }}>삭제</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

// 하단: 모달 내부 다이얼로그들 (정보 수정, 결제 추가, 삭제 확인)
// 정보 수정
// 간단 버전: 핵심 필드만 업데이트
export function StudentDetailModalDialogs() { return null }



