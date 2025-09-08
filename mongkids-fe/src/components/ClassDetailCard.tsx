import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabase } from "../lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Plus } from "lucide-react"

interface Student {
  id: number
  name: string
  grade: string
  level: string
}

interface DailyClassCardProps {
  classItem: {
    class_id: number
    time: string
    group_no: number
    students: Student[]
  }
  selectedDate: Date
  getStatusOnDate: (studentId: number, date: Date) => string
  getWeeklyCells: (studentId: number, date: Date) => ("present"|"absent"|"makeup"|"none")[]
  getAttendanceDatesForCellByStatus: (studentId: number, baseDate: Date, index: number) => {
    present: string[]
    absent: string[]
    makeup: string[]
    makeup_done: string[]
  }
  // getMonthlyAttendanceCount 제거 (사용 안 함)
  toggleAttendanceForSelectedDate: (studentId: number) => void
  openStudentDetail: (studentId: number) => void
  setHoveredCalendarDates: (dates: {present: Date[]; absent: Date[]; makeup: Date[]; makeup_done: Date[]}) => void
  toDateObjectsFromMonthDay: (baseDate: Date, monthDayList: string[]) => Date[]
  onClassUpdated?: () => void
  borderless?: boolean
}

export default function DailyClassCard({
  classItem,
  selectedDate,
  getStatusOnDate,
  getWeeklyCells,
  getAttendanceDatesForCellByStatus,
  toggleAttendanceForSelectedDate,
  openStudentDetail,
  setHoveredCalendarDates,
  toDateObjectsFromMonthDay,
  onClassUpdated,
  borderless
}: DailyClassCardProps) {
  const toHm = (t?: string) => (t && t.length >= 5 ? t.slice(0,5) : t || "")
  const [enriched, setEnriched] = useState<Student[] | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [searchResults, setSearchResults] = useState<{
    id: number
    name: string
    gender: string
    birth_date: string
    current_level: string | null
    class_type?: { category: string | null; sessions_per_week: number | null } | null
    schedules: { weekday: number; time: string; group_no: number }[]
  }[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)

  useEffect(() => {
    // 주차별 모달에서 넘어온 학생 데이터에 grade/level이 없을 수 있어 보강
    const needEnrich = classItem.students.some(s => !s.grade || !s.level)
    const enrich = async () => {
      const ids = classItem.students.map(s => s.id)
      if (ids.length === 0) { setEnriched([]); return }
      const { data, error } = await supabase
        .from('students')
        .select('id, name, birth_date, current_level')
        .in('id', ids)
      if (error) { console.error(error); return }
      const computeGrade = (birthDate: string) => {
        const birth = new Date(birthDate)
        const today = new Date()
        const age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (age < 6) return `${age}세`
        if (age === 6) return monthDiff >= 0 ? '초1' : '6세'
        if (age <= 12) return `초${age - 5}`
        if (age <= 15) return `중${age - 12}`
        if (age <= 18) return `고${age - 15}`
        return '성인'
      }
      const map = new Map<number, Student>()
      ;(data || []).forEach((st: any) => {
        map.set(st.id, {
          id: st.id,
          name: st.name,
          grade: st.birth_date ? computeGrade(st.birth_date) : '',
          level: st.current_level || 'NONE'
        })
      })
      const merged = classItem.students.map(s => map.get(s.id) || s)
      setEnriched(merged)
    }
    if (needEnrich) {
      enrich()
    } else {
      setEnriched(classItem.students)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classItem.class_id, classItem.students])

  const studentsToRender = enriched || classItem.students

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!studentSearch.trim()) { setSearchResults([]); return }
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          gender,
          birth_date,
          current_level,
          status,
          class_types:class_types(category, sessions_per_week),
          student_schedules:student_schedules(weekday, time, group_no)
        `)
        .ilike('name', `%${studentSearch}%`)
        .eq('status', '재원')
        .order('name')
      if (error) { console.error(error); return }
      const existingIds = new Set(classItem.students.map(s => s.id))
      const filtered = (data || []).filter((s: any) => !existingIds.has(s.id)).map((s: any) => ({
        id: s.id,
        name: s.name,
        gender: s.gender,
        birth_date: s.birth_date,
        current_level: s.current_level,
        class_type: s.class_types ? { category: s.class_types.category, sessions_per_week: s.class_types.sessions_per_week } : undefined,
        schedules: (s.student_schedules || []).map((sch: any) => ({ weekday: sch.weekday, time: sch.time, group_no: sch.group_no }))
      }))
      if (!cancelled) setSearchResults(filtered)
    }
    run()
    return () => { cancelled = true }
  }, [studentSearch, classItem.students])

  const addStudentToThisClass = async (studentId: number) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({ student_id: studentId, class_id: classItem.class_id, status: '예정' }, { onConflict: 'student_id,class_id' })
      if (error) throw error
      setStudentSearch("")
      setSearchResults([])
      onClassUpdated && onClassUpdated()
    } catch (e) {
      console.error('학생 추가 실패:', e)
    }
  }

  return (
    <Card className={borderless ? 'border-none shadow-none' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span>{format(selectedDate, 'MM/dd', { locale: ko })}</span>
            <span>{format(selectedDate, '(E)', { locale: ko })}</span>
            <span>{toHm(classItem.time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 px-2">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>학생 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    autoFocus
                    placeholder="학생 이름으로 검색..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <div className="border rounded-md max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">이름</th>
                          <th className="text-left p-2">성별</th>
                          <th className="text-left p-2">학년</th>
                          <th className="text-left p-2">현재 레벨</th>
                          <th className="text-left p-2">등록 반</th>
                          <th className="text-left p-2">수업 시간</th>
                          <th className="text-right p-2">추가</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentSearch ? (
                          searchResults.length > 0 ? (
                            searchResults.map(s => (
                              <tr key={s.id} className="border-t hover:bg-accent/40">
                                <td className="p-2 whitespace-nowrap">{s.name}</td>
                                <td className="p-2 whitespace-nowrap">{s.gender}</td>
                                <td className="p-2 whitespace-nowrap">{(() => {
                                  const birth = new Date(s.birth_date)
                                  const today = new Date()
                                  const age = today.getFullYear() - birth.getFullYear()
                                  const monthDiff = today.getMonth() - birth.getMonth()
                                  if (age < 6) return `${age}세`
                                  if (age === 6) return monthDiff >= 0 ? '초1' : '6세'
                                  if (age <= 12) return `초${age - 5}`
                                  if (age <= 15) return `중${age - 12}`
                                  if (age <= 18) return `고${age - 15}`
                                  return '성인'
                                })()}</td>
                                <td className="p-2 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      style={{
                                        backgroundColor: 
                                          !s.current_level ? '#e5e7eb' :
                                          s.current_level === 'WHITE' ? '#ffffff' :
                                          s.current_level === 'YELLOW' ? '#fde047' :
                                          s.current_level === 'GREEN' ? '#86efac' :
                                          s.current_level === 'BLUE' ? '#93c5fd' :
                                          s.current_level === 'RED' ? '#fca5a5' :
                                          s.current_level === 'BLACK' ? '#374151' :
                                          s.current_level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                                        border: s.current_level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '2px',
                                        display: 'inline-block'
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground">{s.current_level || '-'}</span>
                                  </div>
                                </td>
                                <td className="p-2 whitespace-nowrap">{s.class_type?.category ? `${s.class_type.category} (주 ${s.class_type.sessions_per_week || 0}회)` : '-'}</td>
                                <td className="p-2">
                                  <div className="flex flex-wrap gap-1">
                                    {s.schedules.length > 0 ? s.schedules.map((sch, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded border bg-background text-xs">
                                        {['월','화','수','목','금','토','일'][sch.weekday === 0 ? 6 : sch.weekday - 1]} {toHm(sch.time)} (그룹 {sch.group_no})
                                      </span>
                                    )) : <span className="text-muted-foreground">스케줄 없음</span>}
                                  </div>
                                </td>
                                <td className="p-2 text-right">
                                  <Button size="sm" variant="outline" onClick={async () => { await addStudentToThisClass(s.id); onClassUpdated && onClassUpdated() }}>추가</Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-muted-foreground">검색 결과 없음</td>
                            </tr>
                          )
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-muted-foreground">이름을 입력해 검색하세요</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>그룹 {classItem.group_no}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium">참여 학생 ({classItem.students.length}명)</p>
          </div>
          <div className="space-y-3">
            {studentsToRender.map((student) => (
              <div 
                key={student.id} 
                className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleAttendanceForSelectedDate(student.id)}
                style={{
                  backgroundColor: (() => {
                    const s = getStatusOnDate(student.id, selectedDate)
                    if (s === 'present') return '#dcfce7' // 연한 초록
                    if (s === 'absent') return '#f3f4f6' // 연한 회색
                    if (s === 'makeup') return '#fefce8' // 연한 노랑
                    if (s === 'makeup_done') return '#dcfce7' // present와 동일
                    return 'transparent'
                  })(),
                  borderColor: (() => {
                    const s = getStatusOnDate(student.id, selectedDate)
                    if (s === 'present') return '#22c55e' // 초록
                    if (s === 'absent') return '#9ca3af' // 회색
                    if (s === 'makeup') return '#eab308' // 노랑
                    if (s === 'makeup_done') return '#22c55e' // present와 동일
                    return '#e5e7eb'
                  })()
                }}
              >
                <div className="flex items-center gap-3">
                  <span 
                    role="button"
                    tabIndex={0}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); openStudentDetail(student.id) }}
                  >
                    {student.name}
                  </span>
                  <Badge variant="outline">{student.grade}</Badge>
                  <div 
                    style={{
                      backgroundColor: 
                        student.level === 'NONE' ? '#e5e7eb' :
                        student.level === 'WHITE' ? '#ffffff' :
                        student.level === 'YELLOW' ? '#fde047' :
                        student.level === 'GREEN' ? '#86efac' :
                        student.level === 'BLUE' ? '#93c5fd' :
                        student.level === 'RED' ? '#fca5a5' :
                        student.level === 'BLACK' ? '#374151' :
                        student.level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                      border: student.level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      display: 'inline-block'
                    }}
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {([0,1,2,3] as const).map((idx) => (
                        <button
                          key={idx}
                          className="h-4 w-4 rounded-sm border cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: (() => {
                              const state = getWeeklyCells(student.id, selectedDate)[idx]
                              if (state === 'present') return '#22c55e' // 초록
                              if (state === 'absent') return '#9ca3af' // 회색
                              if (state === 'makeup') return '#eab308' // 노랑
                              return 'transparent' // 표시 안 함은 투명
                            })(),
                            borderColor: '#d1d5db'
                          }}
                          onClick={(e) => { e.stopPropagation(); toggleAttendanceForSelectedDate(student.id) }}
                          onMouseEnter={() => {
                            const { present, absent, makeup, makeup_done } = getAttendanceDatesForCellByStatus(student.id, selectedDate, idx)
                            setHoveredCalendarDates({
                              present: toDateObjectsFromMonthDay(selectedDate, present),
                              absent: toDateObjectsFromMonthDay(selectedDate, absent),
                              makeup: toDateObjectsFromMonthDay(selectedDate, makeup),
                              makeup_done: toDateObjectsFromMonthDay(selectedDate, makeup_done),
                            })
                          }}
                          onMouseLeave={() => setHoveredCalendarDates({ present: [], absent: [], makeup: [], makeup_done: [] })}
                          title={(() => {
                            const { present, absent, makeup, makeup_done } = getAttendanceDatesForCellByStatus(student.id, selectedDate, idx)
                            const parts = [] as string[]
                            if (present.length) parts.push(`출석: ${present.join(', ')}`)
                            if (absent.length) parts.push(`결석: ${absent.join(', ')}`)
                            if (makeup.length) parts.push(`보강예정: ${makeup.join(', ')}`)
                            if (makeup_done.length) parts.push(`보강완료: ${makeup_done.join(', ')}`)
                            return parts.length ? parts.join(' | ') : '기록 없음'
                          })()}
                          aria-label={`week-${idx+1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
