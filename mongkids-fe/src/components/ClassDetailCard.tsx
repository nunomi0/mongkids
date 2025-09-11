import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabase } from "../lib/supabase"
import LevelBadge from "./LevelBadge"
import MemoEditor from "./MemoEditor"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Plus, MoreHorizontal, Trash2 } from "lucide-react"

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
  toggleAttendanceForSelectedDate: (studentId: number, classId?: number) => void
  openStudentDetail: (studentId: number) => void
  setHoveredCalendarDates: (dates: {present: Date[]; absent: Date[]; makeup: Date[]; makeup_done: Date[]}) => void
  toDateObjectsFromMonthDay: (baseDate: Date, monthDayList: string[]) => Date[]
  onClassUpdated?: () => void
  borderless?: boolean
  getDisplayStatus?: (studentId: number) => 'REGULAR_PLANNED'|'REGULAR_PRESENT'|'REGULAR_ABSENT'|'REGULAR_MAKEUP_PLANNED'|'REGULAR_MAKEUP_PRESENT'|'REGULAR_MAKEUP_ABSENT'|'MAKEUP_PLANNED'|'MAKEUP_PRESENT'|'MAKEUP_ABSENT'|'NONE'
  getDisplayStatusForCell?: (studentId: number, idx: number) => 'REGULAR_PLANNED'|'REGULAR_PRESENT'|'REGULAR_ABSENT'|'REGULAR_MAKEUP_PLANNED'|'REGULAR_MAKEUP_PRESENT'|'REGULAR_MAKEUP_ABSENT'|'MAKEUP_PLANNED'|'MAKEUP_PRESENT'|'MAKEUP_ABSENT'|'NONE'
  getAttendanceRecord?: (studentId: number) => { id: number; note?: string | null } | undefined
  updateAttendanceNote?: (attendanceId: number, note: string | null) => Promise<void>
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
  borderless,
  getDisplayStatus,
  getDisplayStatusForCell,
  getAttendanceRecord,
  updateAttendanceNote
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
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [pendingAddStudentId, setPendingAddStudentId] = useState<number | null>(null)
  const [sourceAttendances, setSourceAttendances] = useState<Array<{ id: number; status: '예정'|'출석'|'결석'; date: string; time: string; group_no: number }>>([])
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [linkMonth, setLinkMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [monthOptions, setMonthOptions] = useState<Array<{ value: string; label: string }>>([])
  const [makeupNote, setMakeupNote] = useState<string>("")
  const [pendingAddStudentName, setPendingAddStudentName] = useState<string>("")
  const [memoOpen, setMemoOpen] = useState(false)
  const [memoStudentId, setMemoStudentId] = useState<number | null>(null)
  const [memoDraft, setMemoDraft] = useState<string>("")

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

  const loadSourceAttendances = async (studentId: number, ym: string) => {
    const [y, m] = ym.split('-').map(n => parseInt(n, 10))
    const from = new Date(y, m - 1, 1)
    const to = new Date(y, m, 0)
    const fromStr = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`
    const toStr = `${to.getFullYear()}-${String(to.getMonth()+1).padStart(2,'0')}-${String(to.getDate()).padStart(2,'0')}`
    const { data, error } = await supabase
      .from('attendance')
      .select('id, status, kind, classes:classes(date, time, group_no)')
      .eq('student_id', studentId)
      .is('makeup_of_attendance_id', null)
      .in('status', ['예정','결석'])
      .gte('classes.date', fromStr)
      .lte('classes.date', toStr)
      .order('date', { ascending: true, foreignTable: 'classes' })
    if (error) throw error
    const list = (data || []).filter((a: any) => a.classes && a.classes.date && a.classes.time).map((a: any) => ({
      id: a.id as number,
      status: a.status as '예정'|'출석'|'결석',
      date: (a.classes!.date as string),
      time: (a.classes!.time as string),
      group_no: ((a.classes!.group_no as number) || 1),
    }))
    setSourceAttendances(list)
  }

  const openLinkModal = async (studentId: number) => {
    setPendingAddStudentId(studentId)
    setSelectedSourceId(null)
    try {
      // 사용 가능한 월 목록(정규 예정/결석) 조회
      const from = new Date(); from.setFullYear(from.getFullYear() - 2) // 최근 2년
      const fromStr = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`
      const { data, error } = await supabase
        .from('attendance')
        .select('id, status, classes:classes(date)')
        .eq('student_id', studentId)
        .is('makeup_of_attendance_id', null)
        .in('status', ['예정','결석'])
        .gte('classes.date', fromStr)
        .order('date', { ascending: false, foreignTable: 'classes' })
      if (error) throw error
      const monthsSet = new Set<string>()
      ;(data || []).forEach((a: any) => {
        const dt = a?.classes?.date as string | undefined
        if (dt && dt.length >= 7) monthsSet.add(dt.slice(0,7))
      })
      const options = Array.from(monthsSet)
        .sort((a,b) => a.localeCompare(b) * -1)
        .map(ym => {
          const [y, m] = ym.split('-').map(n=>parseInt(n,10))
          return { value: ym, label: `${y}년 ${m}월` }
        })
      setMonthOptions(options)
      const initialYm = options.length > 0 ? options[0].value : new Date().toISOString().slice(0,7)
      setLinkMonth(initialYm)
      await loadSourceAttendances(studentId, initialYm)
    } catch (e) {
      console.error('정규 출석 불러오기 실패:', e)
      setSourceAttendances([])
    } finally {
      setIsLinkOpen(true)
    }
  }

  const confirmAddMakeup = async () => {
    if (!pendingAddStudentId || !selectedSourceId) return
    try {
      const payload: any = { student_id: pendingAddStudentId, class_id: classItem.class_id, status: '예정', kind: '보강', makeup_of_attendance_id: selectedSourceId, note: makeupNote || null }
      const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'student_id,class_id' })
      if (error) throw error
      setIsLinkOpen(false)
      setIsAddOpen(false)
      setStudentSearch("")
      setSearchResults([])
      setMakeupNote("")
      // 즉시 반영: 상위 갱신 콜백 호출
      onClassUpdated && onClassUpdated()
    } catch (e) {
      console.error('보강 편성 실패:', e)
    }
  }

  return (
    <>
    <Card className={borderless ? 'border-none shadow-none' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span>{format(selectedDate, 'MM/dd', { locale: ko })}</span>
            <span>{format(selectedDate, '(E)', { locale: ko })}</span>
            <span>{toHm(classItem.time)}</span>
          </div>
          <div className="flex items-center gap-2 relative">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={(e)=>{ e.stopPropagation(); setIsActionsOpen(v=>!v) }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {isActionsOpen && (
              <div className="absolute right-0 top-full mt-1 z-[10000] rounded-md border bg-popover text-popover-foreground shadow-md">
                <div className="flex flex-col p-1 min-w-[140px]">
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 rounded whitespace-nowrap cursor-pointer"
                    onClick={(e)=>{ e.stopPropagation(); setIsActionsOpen(false); setIsAddOpen(true) }}
                  >
                    학생 추가
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-accent/50 rounded whitespace-nowrap cursor-pointer"
                    onClick={(e)=>{ e.stopPropagation(); setIsActionsOpen(false); setIsRemoveOpen(true) }}
                  >
                    학생 삭제
                  </button>
                </div>
              </div>
            )}

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>학생 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    autoFocus
                    placeholder="학생 이름으로 검색"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ marginBottom: '12px' }}
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
                                  <Button size="sm" variant="outline" onClick={() => openLinkModal(s.id)}>보강 편성</Button>
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
            <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>학생 삭제</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {studentsToRender.length > 0 ? studentsToRender.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <Badge variant="outline">{s.grade}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={async ()=>{
                          try {
                            const { error } = await supabase
                              .from('attendance')
                              .delete()
                              .eq('student_id', s.id)
                              .eq('class_id', classItem.class_id)
                            if (error) throw error
                            onClassUpdated && onClassUpdated()
                          } catch (e) {
                            console.error('학생 삭제 실패:', e)
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> 삭제
                      </Button>
                    </div>
                  )) : (
                    <div className="text-sm text-muted-foreground">삭제할 학생이 없습니다.</div>
                  )}
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
              <React.Fragment key={student.id}>
              <div 
                className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleAttendanceForSelectedDate(student.id, classItem.class_id)}
                style={(() => {
                  const disp = getDisplayStatus ? getDisplayStatus(student.id) : undefined
                  let bg = 'transparent'
                  let border = '#e5e7eb'
                  switch (disp) {
                    case 'REGULAR_PLANNED': bg = '#ffffff'; border = '#e5e7eb'; break
                    case 'REGULAR_PRESENT': bg = '#dcfce7'; border = '#22c55e'; break
                    case 'REGULAR_ABSENT': bg = '#fee2e2'; border = '#ef4444'; break
                    case 'REGULAR_MAKEUP_PLANNED': bg = '#e0f2fe'; border = '#38bdf8'; break
                    case 'REGULAR_MAKEUP_PRESENT': bg = '#bbf7d0'; border = '#22c55e'; break
                    case 'REGULAR_MAKEUP_ABSENT': bg = '#fecaca'; border = '#ef4444'; break
                    case 'MAKEUP_PLANNED': bg = '#ffffff'; border = '#e5e7eb'; break
                    case 'MAKEUP_PRESENT': bg = '#dcfce7'; border = '#22c55e'; break
                    case 'MAKEUP_ABSENT': bg = '#fee2e2'; border = '#ef4444'; break
                  }
                  return { backgroundColor: bg, borderColor: border }
                })()}
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
                  <LevelBadge level={student.level as any} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {([0,1,2,3] as const).map((idx) => (
                        <button
                          key={idx}
                          className="h-4 w-4 rounded-sm border cursor-pointer hover:opacity-80 transition-opacity"
                          style={(() => {
                            // 셀 대표 상태를 표시 규칙으로 변환하여 색상 동기화
                            const disp = getDisplayStatusForCell ? getDisplayStatusForCell(student.id, idx) : undefined
                            let bg = 'transparent'
                            switch (disp) {
                              case 'REGULAR_PLANNED':
                              case 'MAKEUP_PLANNED':
                                bg = '#ffffff'; break
                              case 'REGULAR_PRESENT':
                              case 'MAKEUP_PRESENT':
                                bg = '#22c55e'; break
                              case 'REGULAR_ABSENT':
                              case 'MAKEUP_ABSENT':
                                bg = '#ef4444'; break
                              case 'REGULAR_MAKEUP_PLANNED':
                                bg = '#38bdf8'; break
                              case 'REGULAR_MAKEUP_PRESENT':
                                bg = '#86efac'; break
                              case 'REGULAR_MAKEUP_ABSENT':
                                bg = '#fecaca'; break
                            }
                            return { backgroundColor: bg, borderColor: '#d1d5db' }
                          })()}
                          onClick={(e) => { e.stopPropagation(); toggleAttendanceForSelectedDate(student.id, classItem.class_id) }}
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
                    {(() => {
                      const meta = `${format(selectedDate, 'yyyy-MM-dd (E)', { locale: ko })} ${toHm(classItem.time)} - ${student.name} 메모`
                      const rec = getAttendanceRecord ? getAttendanceRecord(student.id) : undefined
                      const note = rec?.note || ''
                      const hasNote = !!note
                      return (
                        <MemoEditor
                          studentId={student.id}
                          classId={classItem.class_id}
                          hasNote={hasNote}
                          note={note}
                          meta={meta}
                          className="ml-2"
                        />
                      )
                    })()}
                  </div>
                </div>
              </div>
              {/* 메모 편집은 MemoEditor로 처리 */}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* 보강 수업 편성 모달 */}
    <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>보강 수업 편성</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">연결할 정규 수업(예정/결석)을 선택하세요</div>
              {monthOptions.length > 0 ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">월 선택</label>
                  <select
                    className="px-2 py-1 text-sm border rounded-md bg-white"
                    value={linkMonth}
                    onChange={async (e) => {
                      const ym = e.target.value
                      setLinkMonth(ym)
                      if (pendingAddStudentId) {
                        try { await loadSourceAttendances(pendingAddStudentId, ym) } catch {}
                      }
                    }}
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div></div>
              )}
            </div>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">날짜</th>
                    <th className="text-left p-2">시간</th>
                    <th className="text-left p-2">그룹</th>
                    <th className="text-left p-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceAttendances.length > 0 ? sourceAttendances.map(a => (
                    <tr key={a.id} className={`border-t cursor-pointer ${selectedSourceId === a.id ? 'bg-gray-100' : 'bg-gray-50'}`} onClick={()=> setSelectedSourceId(a.id)}>
                      <td className="p-2 whitespace-nowrap">{format(new Date(a.date), 'yyyy-MM-dd', { locale: ko })}</td>
                      <td className="p-2 whitespace-nowrap">{a.time?.slice(0,5)}</td>
                      <td className="p-2 whitespace-nowrap">{a.group_no}</td>
                      <td className="p-2 whitespace-nowrap">{a.status}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">선택 가능한 정규 수업이 없습니다</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-sm mt-3">
              {selectedSourceId ? (() => {
                const reg = sourceAttendances.find(x => x.id === selectedSourceId)
                if (!reg) return null
                const src = `${format(new Date(reg.date), 'yyyy-MM-dd (E)', { locale: ko })} ${reg.time?.slice(0,5)}`
                const dst = `${format(selectedDate, 'yyyy-MM-dd (E)', { locale: ko })} ${toHm(classItem.time)}`
                return <div className="p-2">{`${src} 에서 ${dst} 으로 편성합니다.`}</div>
              })() : (
                <div className="text-muted-foreground">편성할 정규 수업을 선택하세요.</div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={confirmAddMakeup} disabled={!selectedSourceId}>보강으로 편성</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
