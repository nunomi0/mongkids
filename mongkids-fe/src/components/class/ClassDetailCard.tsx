import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabase } from "../../lib/supabase"
import { GroupType } from "../../types/student"
import LevelBadge from "../LevelBadge"
import { getGradeLabel } from "../../utils/grade"
import { getLevelColor } from "../../utils/level"
import MemoEditor from "../MemoEditor"
import { getDisplayStyle, canToggleStatus } from "../../utils/attendanceStatus"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { Plus, MoreHorizontal, Trash2 } from "lucide-react"
import TrialDetailModal from "../trial/TrialDetailModal"

interface Student {
  id: number
  name: string
  grade: string
  level: string
}

interface TrialReservation {
  id: number
  name: string
  grade: string
}

interface DailyClassCardProps {
  classItem: {
    class_id: number
    time: string
    group_type: GroupType
    students: Student[]
  }
  selectedDate: Date
  getStatusOnDate: (studentId: number, date: Date) => string
  getAttendanceDatesForCellByStatus: (studentId: number, baseDate: Date, index: number) => {
    present: string[]
    absent: string[]
    makeup: string[]
    makeup_done: string[]
  }
  // getMonthlyAttendanceCount 제거 (사용 안 함)
  toggleAttendanceForSelectedDate: (studentId: number, classId?: number) => void
  openStudentDetail: (studentId: number) => void
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
  getAttendanceDatesForCellByStatus,
  toggleAttendanceForSelectedDate,
  openStudentDetail,
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
    schedules: { weekday: number; time: string; group_type: GroupType }[]
  }[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [pendingAddStudentId, setPendingAddStudentId] = useState<number | null>(null)
  const [regularConfirmOpen, setRegularConfirmOpen] = useState(false)
  const [regularPending, setRegularPending] = useState<{ id: number; name: string } | null>(null)
  const [sourceAttendances, setSourceAttendances] = useState<Array<{ id: number; status: '예정'|'출석'|'결석'; date: string; time: string; group_type: GroupType }>>([])
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [linkMonth, setLinkMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [monthOptions, setMonthOptions] = useState<Array<{ value: string; label: string }>>([])
  const [makeupNote, setMakeupNote] = useState<string>("")
  const [pendingAddStudentName, setPendingAddStudentName] = useState<string>("")
  const [memoOpen, setMemoOpen] = useState(false)
  const [memoStudentId, setMemoStudentId] = useState<number | null>(null)
  const [memoDraft, setMemoDraft] = useState<string>("")
  const [monthlyAttendance, setMonthlyAttendance] = useState<Record<number, Array<{
    id: number
    student_id: number
    class_id: number
    date: string
    time: string
    kind: '정규'|'보강'
    status: '예정'|'출석'|'결석'
    makeup_of_attendance_id: number | null
    weekday: number
  }>>>({})
  const [trialReservations, setTrialReservations] = useState<TrialReservation[]>([])  // 체험자 목록
  const [isTrialDetailOpen, setIsTrialDetailOpen] = useState(false)
  const [selectedTrialId, setSelectedTrialId] = useState<number | null>(null)

  // 체험자 목록 로드 (group_type이 '체험'인 경우)
  useEffect(() => {
    if (classItem.group_type === '체험') {
      loadTrialReservations()
    }
  }, [classItem.class_id, classItem.group_type])

  const loadTrialReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_reservations')
        .select('id, name, grade')
        .eq('class_id', classItem.class_id)
        .order('name')
      
      if (error) throw error
      setTrialReservations(data || [])
    } catch (error) {
      console.error('체험자 목록 로드 실패:', error)
      setTrialReservations([])
    }
  }

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
      const computeGrade = (birthDate: string) => getGradeLabel(birthDate)
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

  // 월별 출석 데이터 로드 (이 카드의 학생들 대상, selectedDate의 월 기준)
  useEffect(() => {
    const run = async () => {
      try {
        const ids = studentsToRender.map(s => s.id)
        if (ids.length === 0) { setMonthlyAttendance({}); return }
        const y = selectedDate.getFullYear()
        const m = selectedDate.getMonth()
        const from = new Date(y, m, 1)
        const to = new Date(y, m + 1, 0)
        const fromStr = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`
        const toStr = `${to.getFullYear()}-${String(to.getMonth()+1).padStart(2,'0')}-${String(to.getDate()).padStart(2,'0')}`

        const { data, error } = await supabase
          .from('attendance')
          .select('id, student_id, status, kind, makeup_of_attendance_id, classes:classes(id, date, time)')
          .in('student_id', ids)
          .gte('classes.date', fromStr)
          .lte('classes.date', toStr)
        if (error) throw error

        const map: Record<number, Array<any>> = {}
        ;(data || []).forEach((a: any) => {
          const date = a?.classes?.date as string | undefined
          const time = a?.classes?.time as string | undefined
          if (!date || !time) return
          const d = new Date(date)
          const weekday = d.getDay() // 0:일 ~ 6:토
          const rec = {
            id: a.id as number,
            student_id: a.student_id as number,
            class_id: a.classes?.id as number,
            date,
            time,
            kind: (a.kind === '보강' ? '보강' : '정규') as '정규'|'보강',
            status: (a.status as '예정'|'출석'|'결석'),
            makeup_of_attendance_id: a.makeup_of_attendance_id ? (a.makeup_of_attendance_id as number) : null,
            weekday,
          }
          if (!map[rec.student_id]) map[rec.student_id] = []
          map[rec.student_id].push(rec)
        })

        // 정렬: 날짜/시간 오름차순, 같은 슬롯은 정규 먼저, 보강은 뒤 (정규 아래에 위치)
        Object.keys(map).forEach(k => {
          const arr = map[Number(k)]
          arr.sort((a, b) => {
            const ad = a.date.localeCompare(b.date)
            if (ad !== 0) return ad
            const at = a.time.localeCompare(b.time)
            if (at !== 0) return at
            if (a.kind !== b.kind) return a.kind === '정규' ? -1 : 1
            return a.id - b.id
          })
        })

        setMonthlyAttendance(map)
      } catch (e) {
        console.error('월별 출석 로드 실패:', e)
        setMonthlyAttendance({})
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate.getFullYear(), selectedDate.getMonth(), studentsToRender.map(s=>s.id).join(',')])

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
          student_schedules:student_schedules(weekday, time, group_type)
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
        schedules: (s.student_schedules || []).map((sch: any) => ({ weekday: sch.weekday, time: sch.time, group_type: sch.group_type }))
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
      .select('id, status, kind, classes:classes(date, time, group_type)')
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
      group_type: ((a.classes!.group_type as GroupType) || '일반1'),
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

  const addRegular = async (studentId: number) => {
    try {
      const payload: any = { student_id: studentId, class_id: classItem.class_id, status: '예정', kind: '정규', makeup_of_attendance_id: null }
      const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'student_id,class_id' })
      if (error) throw error
      // 검색 결과에서 제거하여 중복 추가 방지
      setSearchResults(prev => prev.filter(r => r.id !== studentId))
      onClassUpdated && onClassUpdated()
    } catch (e) {
      console.error('정규 추가 실패:', e)
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
              <DialogContent type="m">
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
                                <td className="p-2 whitespace-nowrap">{getGradeLabel(s.birth_date)}</td>
                                <td className="p-2 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      style={{
                                        backgroundColor: getLevelColor((s.current_level as any) || 'NONE'),
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
                                        {['월','화','수','목','금','토','일'][sch.weekday === 0 ? 6 : sch.weekday - 1]} {toHm(sch.time)} ({sch.group_type})
                                      </span>
                                    )) : <span className="text-muted-foreground">스케줄 없음</span>}
                                  </div>
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => { setRegularPending({ id: s.id, name: s.name }); setRegularConfirmOpen(true) }}>정규</Button>
                                    <Button size="sm" variant="outline" onClick={() => openLinkModal(s.id)}>보강</Button>
                                  </div>
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
              <DialogContent type="s">
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
                            // 1) 해당 학생-수업 출석 레코드 조회 (id 획득)
                            const { data: targetRows, error: findErr } = await supabase
                              .from('attendance')
                              .select('id')
                              .eq('student_id', s.id)
                              .eq('class_id', classItem.class_id)
                              .limit(1)
                              .maybeSingle()
                            if (findErr) throw findErr
                            const targetId = targetRows?.id as number | undefined

                            // 2) 보강 레코드가 이 출석을 참조 중이면 링크 해제
                            if (targetId) {
                              const { error: unlinkErr } = await supabase
                                .from('attendance')
                                .update({ makeup_of_attendance_id: null })
                                .eq('makeup_of_attendance_id', targetId)
                              if (unlinkErr) throw unlinkErr
                            }

                            // 3) 해당 출석 레코드 삭제
                            const { error: delErr } = await supabase
                              .from('attendance')
                              .delete()
                              .eq('student_id', s.id)
                              .eq('class_id', classItem.class_id)
                            if (delErr) throw delErr

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
          <span>{classItem.group_type}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium">
              {classItem.group_type === '체험' ? `체험자 (${trialReservations.length}명)` : `참여 학생 (${classItem.students.length}명)`}
            </p>
          </div>
          <div className="space-y-3">
            {/* 체험자 목록 (group_type이 '체험'인 경우) */}
            {classItem.group_type === '체험' ? (
              trialReservations.map((trial) => (
                <div 
                  key={trial.id}
                  className="flex items-center justify-between p-2 rounded border transition-colors bg-blue-50 border-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      role="button"
                      tabIndex={0}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={() => {
                        setSelectedTrialId(trial.id)
                        setIsTrialDetailOpen(true)
                      }}
                    >
                      {trial.name}
                    </span>
                    <Badge variant="outline">{trial.grade}</Badge>
                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                      체험
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              studentsToRender.map((student) => (
                <React.Fragment key={student.id}>
              <div 
                className="flex items-center justify-between p-2 rounded border transition-colors"
                onClick={() => {
                  const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                  const kind = (rec?.kind || '정규') as '정규'|'보강'
                  const status = (rec?.status || '예정') as '예정'|'출석'|'결석'
                  const hasLinked = kind === '정규' && !!rec?.makeup_of_attendance_id
                  if (!canToggleStatus(kind, hasLinked)) return
                  toggleAttendanceForSelectedDate(student.id, classItem.class_id)
                }}
                style={(() => {
                  const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                  const kind = (rec?.kind || '정규') as '정규'|'보강'
                  const status = (rec?.status || '예정') as '예정'|'출석'|'결석'
                  const hasLinked = kind === '정규' && !!rec?.makeup_of_attendance_id
                  const { bg, border } = getDisplayStyle(kind, status, hasLinked)
                  return { backgroundColor: bg, borderColor: border, cursor: canToggleStatus(kind, hasLinked) ? 'pointer' : 'default' }
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
                  {(() => {
                    const disp = getDisplayStatus ? getDisplayStatus(student.id) : undefined
                    const isMakeup = disp?.startsWith('MAKEUP_') || disp?.startsWith('REGULAR_MAKEUP_')
                    if (!isMakeup) return null
                    return (
                      <Badge variant="secondary" className={'bg-blue-50 text-blue-700 border-blue-200'}>
                        보강
                      </Badge>
                    )
                  })()}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {/* 1) 보강/예정 텍스트 먼저 */}
                    {(() => {
                      const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                      const disp = getDisplayStatus ? getDisplayStatus(student.id) : undefined
                      if (rec?.kind === '정규' && disp === 'REGULAR_MAKEUP_PLANNED') {
                        return (
                          <span className="text-xs text-blue-700">
                            {`${format(selectedDate, 'MM/dd', { locale: ko })} ${toHm(classItem.time)} 보강 예정`}
                          </span>
                        )
                      }
                      if (rec?.kind === '보강') {
                        return (
                          <span className="text-xs text-blue-700">
                            {`${format(selectedDate, 'MM/dd', { locale: ko })} ${toHm(classItem.time)} 수업 보강`}
                          </span>
                        )
                      }
                      return null
                    })()}

{/* 2) 깃허브 출석부: 해당 요일만 가로 스트립으로 표시, 보강 있으면 2행 */}
<div className="flex items-start gap-4 overflow-visible">
  {([0,1,2,3,4,5,6] as const)
    .map((weekday) => {
      const dayItems = (monthlyAttendance[student.id] || [])
        .filter(r => r.weekday === weekday)

      const regulars = dayItems.filter(r => r.kind === '정규')
      const makeups  = dayItems.filter(r => r.kind === '보강')

      // 해당 요일에 아무 것도 없으면 스킵
      if (regulars.length === 0 && makeups.length === 0) return null

      // 보강이 하나라도 있으면 2행 노출
      const showMakeupRow = makeups.length > 0

      const WEEK_LABEL = ['일','월','화','수','목','금','토']

      const Dot: React.FC<{ rec: any; highlightLinked?: boolean }> = ({ rec, highlightLinked }) => {
        const hasLinked =
          rec.kind === '정규' &&
          (monthlyAttendance[student.id] || []).some(x => x.makeup_of_attendance_id === rec.id)

        const { bg, border } = getDisplayStyle(rec.kind, rec.status, hasLinked)
        const color = highlightLinked && hasLinked && rec.kind === '정규' ? '#e0f2fe' : bg
        const title = `${format(new Date(rec.date), 'M월 d일', { locale: ko })} ${rec.time?.slice(0,5)} 수업`

        return (
          <div className="relative">
            <button
              type="button"
              className="peer block h-4 w-4 rounded-sm border"
              style={{ backgroundColor: color, borderColor: border }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={title}
            />
            <span
              className="
                pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                whitespace-nowrap rounded-md border bg-popover text-popover-foreground shadow
                px-2 py-1 text-xs
                opacity-0 invisible
                peer-hover:opacity-100 peer-hover:visible
                peer-focus:opacity-100 peer-focus:visible
                transition-opacity duration-150
                z-[9999]
              "
            >
              {title}
            </span>
          </div>
        )
      }

      return (
        <div key={weekday} className="flex flex-col gap-1 overflow-visible">
          {/* 요일 라벨 (한 글자) */}
          <div className="text-[11px] leading-none text-muted-foreground">
            {WEEK_LABEL[weekday]}
          </div>

          {/* 정규 1행 */}
          <div className="flex items-center gap-1">
            {regulars.map((rec) => (
              <Dot key={`r-${rec.id}`} rec={rec} highlightLinked />
            ))}
          </div>

          {/* 보강 2행: 정규와 같은 열 정렬 유지 (연결 없으면 투명 스페이서) */}
          {showMakeupRow && (
            <div className="flex items-center gap-1">
              {regulars.map((reg) => {
                const linked = makeups.filter(m => m.makeup_of_attendance_id === reg.id)
                if (linked.length === 0) {
                  return <div key={`msp-${reg.id}`} className="h-4 w-4 opacity-0" />
                }
                return linked.map(m => <Dot key={`m-${m.id}`} rec={m} />)
              })}
            </div>
          )}
        </div>
      )
    })}
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
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* 체험자 상세 모달 */}
    <TrialDetailModal
      isOpen={isTrialDetailOpen}
      onClose={() => {
        setIsTrialDetailOpen(false)
        setSelectedTrialId(null)
        loadTrialReservations() // 데이터 새로고침
      }}
      reservationId={selectedTrialId}
    />

    {/* 보강 수업 편성 모달 */}
    <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
      <DialogContent type="m">
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
                      <td className="p-2 whitespace-nowrap">{a.group_type}</td>
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
    {/* 정규 추가 확인 모달 */}
    <Dialog open={regularConfirmOpen} onOpenChange={setRegularConfirmOpen}>
      <DialogContent type="s">
        <DialogHeader>
          <DialogTitle>정규 수업에 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            {regularPending ? (
              <div className="p-2 rounded border bg-muted/40">
                {`${format(selectedDate, 'yyyy-MM-dd (E)', { locale: ko })} ${toHm(classItem.time)} 수업에 ${regularPending.name} 학생을 정규로 추가합니다.`}
              </div>
            ) : (
              <div className="text-muted-foreground">학생을 선택하세요.</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=> setRegularConfirmOpen(false)}>취소</Button>
            <Button onClick={async ()=>{
              if (!regularPending) return
              await addRegular(regularPending.id)
              setRegularConfirmOpen(false)
            }}>확인</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
