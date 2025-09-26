import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { Checkbox } from "../ui/checkbox"
import { Calendar } from "../ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { CalendarIcon, Search } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { startOfWeek, endOfWeek, startOfMonth } from "date-fns"
import { supabase } from "../../lib/supabase"
import { GroupType } from "../../types/student"
import { Input } from "../ui/input"
import StudentDetailModal from "../student/StudentDetailModal"
import ClassDetailCard from "./ClassDetailCard"
import LevelBadge from "../LevelBadge"
import { getGradeLabel } from "../../utils/grade"
import { getLevelColor, LevelValue } from "../../utils/level"
import TrialDetailModal from "../trial/TrialDetailModal"





export default function ClassManagement() {
  const [activeTab, setActiveTab] = useState("ongoing")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [scheduleWeek, setScheduleWeek] = useState<{start: Date, end: Date}>({
    start: new Date(),
    end: new Date()
  })

  // 학생별 출석 상태 (yyyy-MM-dd => 상태)
  const [attendanceStatus, setAttendanceStatus] = useState<Record<number, Record<string, 'present' | 'absent' | 'makeup' | 'makeup_done'>>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasAttendanceData, setHasAttendanceData] = useState<{daily: boolean, weekly: boolean}>({daily: false, weekly: false})
  const [realSchedule, setRealSchedule] = useState<{
    date: string
    time: string
    group_type: GroupType
    class_id: number
    students: { id: number; name: string; grade?: string; level?: string; isTrial?: boolean }[]
  }[]>([])
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [manageClass, setManageClass] = useState<{ class_id: number; date: string; time: string; group_type: GroupType; students: { id: number; name: string }[] } | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [candidateStudents, setCandidateStudents] = useState<{ id: number; name: string }[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [dailyClasses, setDailyClasses] = useState<{
    class_id: number
    time: string
    group_type: GroupType
    students: { id: number; name: string; grade: string; level: string }[]
  }[]>([])
  // attendance 상세 맵과 정규→보강 링크 맵
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { id: number; student_id: number; class_id: number; date: string; status: '예정'|'출석'|'결석'; kind: '정규'|'보강'; makeup_of_attendance_id: number | null }>>({})
  const [makeupByRegularId, setMakeupByRegularId] = useState<Record<number, { id: number; status: '예정'|'출석'|'결석' }>>({})
  // 컨텍스트 메뉴 상태 (주차별 수업 추가/삭제)
  const [addMenu, setAddMenu] = useState<null | { x: number; y: number; date: string; time: string }>(null)
  const [deleteMenu, setDeleteMenu] = useState<null | { x: number; y: number; classId: number; hasStudents: boolean }>(null)
  
  // 학생 상세 정보 다이얼로그
  const [isStudentDetailOpen, setIsStudentDetailOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  // 체험자 상세 정보 다이얼로그
  const [isTrialDetailOpen, setIsTrialDetailOpen] = useState(false)
  const [selectedTrialId, setSelectedTrialId] = useState<number | null>(null)
  // 주차별 수업 상세
  const [isClassDetailOpen, setIsClassDetailOpen] = useState(false)
  const [selectedClassForDetail, setSelectedClassForDetail] = useState<{ class_id: number; date: string; time: string; group_type: GroupType; students: { id: number; name: string }[] } | null>(null)
  const [selectedClassDate, setSelectedClassDate] = useState<Date | null>(null)
  
  
  // 학생 상세 정보 열기
  const openStudentDetail = (studentId: number) => {
    setSelectedStudentId(studentId)
    setIsStudentDetailOpen(true)
    console.log(selectedStudentId)
  }



  // 특정 주차 출석예정 생성
  const generateAttendanceForWeek = async (start: Date, end: Date) => {
    try {
      setIsGenerating(true)

      // 1) 재원 학생과 스케줄 로드
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id, status')
        .eq('status', '재원')
      if (sErr) throw sErr
      const studentIds = (students || []).map(s => s.id)
      if (studentIds.length === 0) return

      const { data: schedules, error: schErr } = await supabase
        .from('student_schedules')
        .select('*')
        .in('student_id', studentIds)
      if (schErr) throw schErr

      // 2) 해당 주차의 각 날짜에 대해 요일/시간/그룹 기준 class upsert, attendance upsert
      const classUpserts: { date: string; time: string; group_type: GroupType }[] = []
      const attendanceUpserts: { student_id: number; class_id: number; status: string; is_makeup: boolean; memo: string | null }[] = []

      // 날짜 루프
      for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const weekday = (d.getDay() + 6) % 7 // 0:월 ~ 6:일 (DB 규약에 맞춤)
        const daySchedules = (schedules || []).filter(s => s.weekday === weekday)
        if (daySchedules.length === 0) continue

        const dateStr = toDateStr(d)

        // 날짜별 클래스 upsert 수행 (중복 제거)
        const uniqueKey = new Set<string>()
        const classesForDay: { date: string; time: string; group_type: GroupType }[] = []
        daySchedules.forEach(s => {
          const time = s.time
          const group = s.group_type
          // 체험 수업은 자동 생성 대상에서 제외 (실제 예약이 있을 때만 별도 생성/표시)
          if (group === '체험') return
          const key = `${dateStr}_${time}_${group}`
          if (!uniqueKey.has(key)) {
            uniqueKey.add(key)
            classesForDay.push({ date: dateStr, time, group_type: group })
          }
        })

        if (classesForDay.length) {
          // upsert classes
          const { data: upserted, error } = await supabase
            .from('classes')
            .upsert(classesForDay, { onConflict: 'date,time,group_type' })
            .select('id, date, time, group_type')
          if (error) throw error

          // class_id 매핑
          const classIdByKey = new Map<string, number>()
          ;(upserted || []).forEach(c => {
            classIdByKey.set(`${c.date}_${c.time}_${c.group_type}`, c.id)
          })

          // 해당 날짜의 각 스케줄 → attendance 예정 upsert
          for (const s of daySchedules) {
            // 체험 수업은 자동 출석 생성 제외
            if (s.group_type === '체험') continue
            const key = `${dateStr}_${s.time}_${s.group_type}`
            const classId = classIdByKey.get(key)
            if (!classId) continue
            attendanceUpserts.push({ student_id: s.student_id, class_id: classId, status: '예정', is_makeup: false, memo: null })
          }
        }
      }

      // 3) attendance upsert (UNIQUE student_id,class_id) - 최소 컬럼만 사용
      if (attendanceUpserts.length) {
        const minimal = attendanceUpserts.map(a => ({
          student_id: a.student_id,
          class_id: a.class_id,
          status: '예정' as const,
          kind: '정규' as const
        }))
        const { error } = await supabase
          .from('attendance')
          .upsert(minimal, { onConflict: 'student_id,class_id' })
        if (error) throw error
      }

      alert('출석 예정 생성이 완료되었습니다.')
      // 생성 후 실시간 시간표 갱신
      await loadRealSchedule(start, end)
    } catch (e) {
      console.error('출석 예정 생성 오류:', e)
      alert('출석 예정 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 이번 달/다음 달 출석예정 자동 생성
  const generateAttendanceForMonth = async (base: Date) => {
    try {
      setIsGenerating(true)
      // 달의 시작/끝
      const year = base.getFullYear()
      const month = base.getMonth()
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)

      // 1) 재원 학생과 스케줄 로드
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id, status')
        .eq('status', '재원')
      if (sErr) throw sErr
      const studentIds = (students || []).map(s => s.id)
      if (studentIds.length === 0) return

      const { data: schedules, error: schErr } = await supabase
        .from('student_schedules')
        .select('*')
        .in('student_id', studentIds)
      if (schErr) throw schErr

      // 2) 해당 달의 각 날짜에 대해 요일/시간/그룹 기준 class upsert, attendance upsert
      const classUpserts: { date: string; time: string; group_type: GroupType }[] = []
      const attendanceUpserts: { student_id: number; class_id: number; status: string; is_makeup: boolean; memo: string | null }[] = []

      // Helper: YYYY-MM-DD

      // 날짜 루프
      for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const weekday = (d.getDay() + 6) % 7 // 0:월 ~ 6:일 (DB 규약에 맞춤)
        const daySchedules = (schedules || []).filter(s => s.weekday === weekday)
        if (daySchedules.length === 0) continue

        const dateStr = toDateStr(d)

        // 날짜별 클래스 upsert 수행 (중복 제거)
        const uniqueKey = new Set<string>()
        const classesForDay: { date: string; time: string; group_type: GroupType }[] = []
        daySchedules.forEach(s => {
          const time = s.time
          const group = s.group_type
          // 체험 수업은 자동 생성 대상에서 제외 (실제 예약이 있을 때만 별도 생성/표시)
          if (group === '체험') return
          const key = `${dateStr}_${time}_${group}`
          if (!uniqueKey.has(key)) {
            uniqueKey.add(key)
            classesForDay.push({ date: dateStr, time, group_type: group })
          }
        })

        if (classesForDay.length) {
          // upsert classes
          const { data: upserted, error } = await supabase
            .from('classes')
            .upsert(classesForDay, { onConflict: 'date,time,group_type' })
            .select('id, date, time, group_type')
          if (error) throw error

          // class_id 매핑
          const classIdByKey = new Map<string, number>()
          ;(upserted || []).forEach(c => {
            classIdByKey.set(`${c.date}_${c.time}_${c.group_type}`, c.id)
          })

          // 해당 날짜의 각 스케줄 → attendance 예정 upsert
          for (const s of daySchedules) {
            // 체험 수업은 자동 출석 생성 제외
            if (s.group_type === '체험') continue
            const key = `${dateStr}_${s.time}_${s.group_type}`
            const classId = classIdByKey.get(key)
            if (!classId) continue
            attendanceUpserts.push({ student_id: s.student_id, class_id: classId, status: '예정', is_makeup: false, memo: null })
          }
        }
      }

      // 3) attendance upsert (UNIQUE student_id,class_id) - 최소 컬럼만 사용
      if (attendanceUpserts.length) {
        const minimal = attendanceUpserts.map(a => ({
          student_id: a.student_id,
          class_id: a.class_id,
          status: '예정' as const,
          kind: '정규' as const
        }))
        const { error } = await supabase
          .from('attendance')
          .upsert(minimal, { onConflict: 'student_id,class_id' })
        if (error) throw error
      }

      alert('출석 예정 생성이 완료되었습니다.')
      // 생성 후 실시간 시간표 갱신
      await loadRealSchedule(scheduleWeek.start, scheduleWeek.end)
    } catch (e) {
      console.error('출석 예정 생성 오류:', e)
      alert('출석 예정 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 실제 데이터 로드 (선택 주간)
  const loadRealSchedule = async (start: Date, end: Date) => {
    try {
      const startStr = toDateStr(start)
      const endStr = toDateStr(end)

      const { data, error } = await supabase
        .from('classes')
        .select('id, date, time, group_type, attendance:attendance(student_id, status, students:students(id, name, birth_date, current_level))')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .order('group_type', { ascending: true })
      if (error) throw error

      const mapped = await Promise.all((data || []).map(async (c: any) => {
        let students: { id: number; name: string; grade: string; level: string; isTrial: boolean }[] = [];
        
        if (c.group_type === '체험') {
          // 체험자 데이터 로드
          try {
            const { data: trialData, error: trialError } = await supabase
              .from('trial_reservations')
              .select('id, name, grade')
              .eq('class_id', c.id)
              .order('name')
            
            if (trialError) {
              console.error('체험자 데이터 로드 실패:', trialError)
            } else {
              console.log('[ClassManagement] trial weekly list', { classId: c.id, count: (trialData || []).length, trialData })
              students = (trialData || []).map(trial => ({
                id: trial.id,
                name: trial.name,
                grade: trial.grade || '',
                level: 'TRIAL', // 체험자를 나타내는 특별한 레벨
                isTrial: true
              }))
            }
          } catch (e) {
            console.error('체험자 데이터 로드 에러:', e)
          }
        } else {
          // 일반 학생 데이터
          students = ((c.attendance as any[]) || []).map(a => {
            const st = a.students
            if (!st) return null
            // 학년 계산
            const grade = st.birth_date ? getGradeLabel(st.birth_date) : ''
            return { id: st.id, name: st.name, grade, level: st.current_level || 'NONE', isTrial: false }
          }).filter((s): s is { id: number; name: string; grade: string; level: string; isTrial: boolean } => !!s && !!s.id)
        }
        
        return {
          class_id: c.id,
          date: c.date,
          time: c.time,
          group_type: c.group_type,
          students
        }
      }))
      // 콘솔 출력: 주간 수업 원본/매핑 데이터
      console.log('[ClassManagement] weekly raw', data)
      console.log('[ClassManagement] weekly mapped', mapped)
      setRealSchedule(mapped)
      // DB 출석 상태를 로컬 상태에 반영 (주간 전체)
      const nextStatusState: Record<number, Record<string, 'present' | 'absent' | 'makeup' | 'makeup_done'>> = {}
      const mapDbToUi = (s?: string) => (
        s === '출석' ? 'present'
        : s === '결석' ? 'absent'
        : s === '보강예정' ? 'makeup'
        : s === '보강완료' ? 'makeup_done'
        : 'none'
      ) as 'present' | 'absent' | 'makeup' | 'makeup_done' | 'none'
      ;(data || []).forEach((c: any) => {
        const key = c.date as string
        const atts = (c.attendance || []) as any[]
        atts.forEach(a => {
          const sid = a.student_id as number
          const ui = mapDbToUi(a.status)
          if (ui === 'none') return
          if (!nextStatusState[sid]) nextStatusState[sid] = {}
          nextStatusState[sid][key] = ui
        })
      })
      setAttendanceStatus(prev => ({ ...prev, ...nextStatusState }))
      
      // 해당 주차에 출석 데이터가 있는지 확인
      const hasData = mapped.length > 0
      setHasAttendanceData(prev => ({ ...prev, weekly: hasData }))
    } catch (e) {
      console.error('실시간 시간표 로드 오류:', e)
      setRealSchedule([])
      setHasAttendanceData(prev => ({ ...prev, weekly: false }))
    }
  }

  // 일별 수업 데이터 로드
  const loadDailyClasses = async (date: Date) => {
    try {
      const dateStr = toDateStr(date)
      
      // 해당 날짜의 수업과 학생 정보 로드
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id, 
          time, 
          group_type, 
          attendance:attendance(
            id,
            student_id,
            status,
            kind,
            makeup_of_attendance_id,
            note,
            is_test,
            students:students(
              id, 
              name, 
              birth_date,
              current_level
            )
          )
        `)
        .eq('date', dateStr)
        .order('time', { ascending: true })
        .order('group_type', { ascending: true })
      
      if (error) throw error

      const mapped = (data || []).map((c: any) => ({
        class_id: c.id,
        time: c.time,
        group_type: c.group_type,
        students: ((c.attendance as any[]) || [])
          .map(a => {
            const student = a.students
            if (!student) return null
            
            // 학년 계산 통일
            const grade = student.birth_date ? getGradeLabel(student.birth_date) : ''
            
            return {
              id: student.id,
              name: student.name,
              grade,
              level: student.current_level || 'NONE'
            }
          })
          .filter(Boolean)
      }))
      // 콘솔 출력: 일별 수업 원본/매핑 데이터
      console.log('[ClassManagement] daily raw', data)
      console.log('[ClassManagement] daily mapped', mapped)
      setDailyClasses(mapped)
      // attendance 맵 구성 및 정규→보강 링크 수집
      const nextMap: Record<string, { id: number; student_id: number; class_id: number; date: string; status: '예정'|'출석'|'결석'; kind: '정규'|'보강'; makeup_of_attendance_id: number | null; note?: string | null; is_test?: string | null }> = {}
      const regularIds: number[] = []
      ;(data || []).forEach((c: any) => {
        const classId = c.id as number
        const dateKey = dateStr;
        ((c.attendance as any[]) || []).forEach((a: any) => {
          const key = `${dateKey}-${classId}-${a.student_id}`
          nextMap[key] = {
            id: a.id as number,
            student_id: a.student_id as number,
            class_id: classId,
            date: dateKey,
            status: a.status as '예정'|'출석'|'결석',
            kind: (a.kind === '보강' ? '보강' : '정규') as '정규'|'보강',
            makeup_of_attendance_id: a.makeup_of_attendance_id ?? null,
            note: (a as any).note ?? null,
            is_test: (a as any).is_test ?? null,
          }
          if (a.kind !== '보강') {
            regularIds.push(a.id as number)
          }
        })
      })
      setAttendanceMap(nextMap)
      // 연결된 보강 출석 조회 (다른 날짜 포함 가능)
      if (regularIds.length > 0) {
        const { data: mk, error: mkErr } = await supabase
          .from('attendance')
          .select('id, status, makeup_of_attendance_id, note')
          .in('makeup_of_attendance_id', Array.from(new Set(regularIds)))
        if (!mkErr && mk) {
          const linkMap: Record<number, { id: number; status: '예정'|'출석'|'결석' }> = {}
          mk.forEach((m: any) => {
            const rid = m.makeup_of_attendance_id as number
            linkMap[rid] = { id: m.id as number, status: m.status as '예정'|'출석'|'결석' }
          })
          setMakeupByRegularId(linkMap)
        } else {
          setMakeupByRegularId({})
        }
      } else {
        setMakeupByRegularId({})
      }
      // DB 출석 상태를 로컬 상태에 반영 (해당 날짜)
      const nextStatusState: Record<number, Record<string, 'present' | 'absent' | 'makeup' | 'makeup_done'>> = {}
      const mapDbToUi = (s?: string) => (
        s === '출석' ? 'present'
        : s === '결석' ? 'absent'
        : s === '보강예정' ? 'makeup'
        : s === '보강완료' ? 'makeup_done'
        : 'none'
      ) as 'present' | 'absent' | 'makeup' | 'makeup_done' | 'none'
      ;(data || []).forEach((c: any) => {
        const key = dateStr
        const atts = (c.attendance || []) as any[]
        atts.forEach(a => {
          const sid = a.student_id as number
          const ui = mapDbToUi(a.status)
          if (ui === 'none') return
          if (!nextStatusState[sid]) nextStatusState[sid] = {}
          nextStatusState[sid][key] = ui
        })
      })
      setAttendanceStatus(prev => ({ ...prev, ...nextStatusState }))
      
      // 해당 날짜에 출석 데이터가 있는지 확인
      const hasData = mapped.length > 0
      setHasAttendanceData(prev => ({ ...prev, daily: hasData }))
    } catch (e) {
      console.error('일별 수업 로드 오류:', e)
      setDailyClasses([])
      setHasAttendanceData(prev => ({ ...prev, daily: false }))
    }
  }

  // 표시 상태 계산 (정규/보강 + 보강 동기화 반영)
  type DisplayStatus = 'REGULAR_PLANNED'|'REGULAR_PRESENT'|'REGULAR_ABSENT'|'REGULAR_MAKEUP_PLANNED'|'REGULAR_MAKEUP_PRESENT'|'REGULAR_MAKEUP_ABSENT'|'MAKEUP_PLANNED'|'MAKEUP_PRESENT'|'MAKEUP_ABSENT'|'NONE'
  const getDisplayStatus = (studentId: number, date: Date, classId: number): DisplayStatus => {
    const key = `${toDateStr(date)}-${classId}-${studentId}`
    const att = attendanceMap[key]
    if (!att) return 'NONE'
    if (att.kind === '보강') {
      if (att.status === '예정') return 'MAKEUP_PLANNED'
      if (att.status === '출석') return 'MAKEUP_PRESENT'
      if (att.status === '결석') return 'MAKEUP_ABSENT'
      return 'NONE'
    }
    // 정규
    if (att.status === '출석') return 'REGULAR_PRESENT'
    if (att.status === '결석') {
      const mk = makeupByRegularId[att.id]
      if (!mk) return 'REGULAR_ABSENT'
      if (mk.status === '예정') return 'REGULAR_MAKEUP_PLANNED'
      if (mk.status === '출석') return 'REGULAR_MAKEUP_PRESENT'
      if (mk.status === '결석') return 'REGULAR_MAKEUP_ABSENT'
      return 'REGULAR_ABSENT'
    }
    // 예정
    {
      const mk = makeupByRegularId[att.id]
      if (!mk) return 'REGULAR_PLANNED'
      if (mk.status === '예정') return 'REGULAR_MAKEUP_PLANNED'
      if (mk.status === '출석') return 'REGULAR_MAKEUP_PRESENT'
      if (mk.status === '결석') return 'REGULAR_MAKEUP_ABSENT'
      return 'REGULAR_PLANNED'
    }
  }

  // 개별 출석 레코드 조회 및 메모 업데이트
  const getAttendanceRecord = (studentId: number, date: Date, classId: number) => {
    const key = `${toDateStr(date)}-${classId}-${studentId}`
    return attendanceMap[key]
  }

  const updateAttendanceNote = async (attendanceId: number, note: string | null) => {
    try {
      const { error } = await supabase.from('attendance').update({ note: note ?? null }).eq('id', attendanceId)
      if (error) throw error
      await loadDailyClasses(selectedDate)
    } catch (e) {
      console.error('메모 업데이트 실패:', e)
    }
  }

  // 전체 학생 목록 로드
  const loadAllStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          status,
          current_level,
          class_types!inner(
            category,
            sessions_per_week
          )
        `)
        .eq('status', '재원')
        .order('name')

      if (error) throw error
      setAllStudents(data || [])
    } catch (error) {
      console.error('전체 학생 로드 오류:', error)
    }
  }

  // 주간 변경 시 실제 데이터 로드
  useEffect(() => {
    if (scheduleWeek?.start && scheduleWeek?.end) {
      loadRealSchedule(scheduleWeek.start, scheduleWeek.end)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleWeek.start?.getTime?.(), scheduleWeek.end?.getTime?.()])

  // 컴포넌트 마운트 시 전체 학생 로드
  useEffect(() => {
    loadAllStudents()
  }, [])

  const weekDates = (() => {
    const dates: Date[] = []
    const start = scheduleWeek.start
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
    }
    return dates
  })()

  const toDateStr = (d: Date) => `${d.getFullYear()}-${`${d.getMonth()+1}`.padStart(2,'0')}-${`${d.getDate()}`.padStart(2,'0')}`

  const realTimeSlots: string[] = Array.from(new Set<string>(realSchedule
    .filter(r => weekDates.some(d => toDateStr(d) === r.date))
    .map(r => r.time as string))).sort()

  const openManageDialog = async (cls: { class_id: number; date: string; time: string; group_type: GroupType; students: { id: number; name: string }[] }) => {
    setManageClass(cls)
    setIsManageOpen(true)
    setStudentSearch("")
  }

  

  const openClassDetailDialog = (cls: { class_id: number; date: string; time: string; group_type: GroupType; students: { id: number; name: string }[] }) => {
    setSelectedClassForDetail(cls)
    setSelectedClassDate(new Date(cls.date))
    setIsClassDetailOpen(true)
  }

  // 컨텍스트 메뉴: 외부 클릭 시 닫기
  useEffect(() => {
    const onGlobalClick = () => {
      if (addMenu) setAddMenu(null)
      if (deleteMenu) setDeleteMenu(null)
    }
    window.addEventListener('click', onGlobalClick)
    return () => {
      window.removeEventListener('click', onGlobalClick)
    }
  }, [addMenu, deleteMenu])

  // 수업 생성
  const createClass = async (dateStr: string, time: string, group: GroupType) => {
    try {
      const { error } = await supabase
        .from('classes')
        .upsert({ date: dateStr, time, group_type: group }, { onConflict: 'date,time,group_type' })
      if (error) throw error
      await loadRealSchedule(scheduleWeek.start, scheduleWeek.end)
    } catch (e) {
      console.error('수업 생성 실패:', e)
      alert('수업 생성에 실패했습니다.')
    } finally {
      setAddMenu(null)
    }
  }

  // 수업 삭제 (학생이 없을 때만)
  const deleteClass = async (classId: number) => {
    try {
      // 안전 확인: attendance 카운트 조회
      const { count, error: cntErr } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
      if (cntErr) throw cntErr
      if ((count || 0) > 0) {
        alert('학생이 있는 수업은 삭제할 수 없습니다.')
        return
      }
      const { error } = await supabase.from('classes').delete().eq('id', classId)
      if (error) throw error
      await loadRealSchedule(scheduleWeek.start, scheduleWeek.end)
    } catch (e) {
      console.error('수업 삭제 실패:', e)
      alert('수업 삭제에 실패했습니다.')
    } finally {
      setDeleteMenu(null)
    }
  }

  const addStudentToClass = async (studentId: number) => {
    if (!manageClass) return
    const { error } = await supabase
      .from('attendance')
      .upsert({ student_id: studentId, class_id: manageClass.class_id, status: '예정' }, { onConflict: 'student_id,class_id' })
    if (!error) {
      await loadRealSchedule(scheduleWeek.start, scheduleWeek.end)
      const updated = realSchedule.find(r => r.class_id === manageClass.class_id)
      if (updated) setManageClass({ ...manageClass, students: updated.students })
    }
  }

  const removeStudentFromClass = async (studentId: number) => {
    if (!manageClass) return
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('student_id', studentId)
      .eq('class_id', manageClass.class_id)
    if (!error) {
      await loadRealSchedule(scheduleWeek.start, scheduleWeek.end)
      const updated = realSchedule.find(r => r.class_id === manageClass.class_id)
      if (updated) setManageClass({ ...manageClass, students: updated.students })
    }
  }

  // 자동 갱신 제거 (타이머 삭제)

  // 초기 선택값 설정 (마운트 시 1회)
  useEffect(() => {
    const now = new Date()
    const weekRange = getWeekRange(now)
    setScheduleWeek(weekRange)
    setSelectedDate(now)
    loadDailyClasses(now)
  }, [])

  // 학년 우선순위 (높은 숫자가 높은 우선순위)
  const getGradePriority = (grade: string) => {
    if (grade.includes('6세')) return 1
    if (grade.includes('초1')) return 2
    if (grade.includes('초2')) return 3
    if (grade.includes('초3')) return 4
    if (grade.includes('초4')) return 5
    if (grade.includes('초5')) return 6
    if (grade.includes('초6')) return 7
    if (grade.includes('중1')) return 8
    if (grade.includes('중2')) return 9
    if (grade.includes('중3')) return 10
    if (grade.includes('고1')) return 11
    if (grade.includes('고2')) return 12
    if (grade.includes('고3')) return 13
    return 999
  }

  // 레벨 우선순위 (높은 숫자가 높은 우선순위)
  const getLevelPriority = (level: string) => {
    switch (level as LevelValue) {
      case "NONE": return 1
      case "WHITE": return 2
      case "YELLOW": return 3
      case "GREEN": return 4
      case "BLUE": return 5
      case "RED": return 6
      case "BLACK": return 7
      case "GOLD": return 8
      default: return 999
    }
  }

  // 주의 시작일과 끝일 계산
  const getWeekRange = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 }) // 월요일부터 시작
    const end = endOfWeek(date, { weekStartsOn: 1 }) // 일요일까지
    
    return { start, end }
  }

  // 해당 날짜의 (해당 달 기준) 주차 계산 - 월요일 시작
  const getWeekOfMonth = (date: Date) => {
    const firstOfMonth = startOfMonth(date)
    const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn: 1 })
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 })
    const diffMs = currentWeekStart.getTime() - firstWeekStart.getTime()
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
    return week
  }

  // 월과 주차 표시 (교차 월 처리: 7월 4주차 / 8월 1주차 (7/29~8/4))
  const getMonthAndWeekDisplay = (date: Date) => {
    const weekRange = getWeekRange(date)
    const startMonth = weekRange.start.getMonth() + 1
    const endMonth = weekRange.end.getMonth() + 1
    const startDay = weekRange.start.getDate()
    const endDay = weekRange.end.getDate()

    if (startMonth !== endMonth) {
      const startWeek = getWeekOfMonth(weekRange.start)
      const endWeek = getWeekOfMonth(weekRange.end)
      return `${startMonth}월 ${startWeek}주차 / ${endMonth}월 ${endWeek}주차 (${startMonth}/${startDay}~${endMonth}/${endDay})`
    }

    const weekInMonth = getWeekOfMonth(date)
    return `${startMonth}월 ${weekInMonth}주차 (${startMonth}/${startDay}~${endMonth}/${endDay})`
  }

  // yyyy-MM-dd 포맷 키
  const getDateKey = (date: Date) => {
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, '0')
    const d = `${date.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 특정 날짜 출석 상태
  const getStatusOnDate = (studentId: number, date: Date) => {
    const key = getDateKey(date)
    return attendanceStatus[studentId]?.[key] || 'none'
  }
  const isAttendedOnDate = (studentId: number, date: Date) => getStatusOnDate(studentId, date) === 'present'

  // 출석 토글 (일별 수업에서 선택된 날짜 기준)
  const toggleAttendanceForSelectedDate = async (studentId: number, classId?: number) => {
    const key = getDateKey(selectedDate)
    const current = attendanceStatus[studentId]?.[key] || 'none'
    // 상태는 예정/출석/결석 3단계만 사용 (UI: none/present/absent)
    const nextStatus: 'present' | 'absent' | 'none' =
      current === 'none' ? 'present' : current === 'present' ? 'absent' : 'none'
    console.log(studentId, key, nextStatus);
    setAttendanceStatus(prev => {
      const mapForStudent = { ...(prev[studentId] || {}) }
      mapForStudent[key] = nextStatus
      return { ...prev, [studentId]: mapForStudent }
    })
    

    // DB 반영 (optional classId가 전달된 경우만)
    if (classId) {
      // 해당 attendance id를 찾아 직접 업데이트 (정규/보강 공통)
      const aKey = `${toDateStr(selectedDate)}-${classId}-${studentId}`
      const att = attendanceMap[aKey]
      if (att) {
        const nextDb = nextStatus === 'present' ? '출석' : nextStatus === 'absent' ? '결석' : '예정'
        const { error } = await supabase.from('attendance').update({ status: nextDb }).eq('id', att.id)
        if (error) console.error('출석 상태 저장 실패:', error)

        // 보강 출석/결석 시, 연결된 정규 출석 상태도 동일하게 동기화
        if (att.kind === '보강' && att.makeup_of_attendance_id && nextDb !== '예정') {
          const { error: linkErr } = await supabase
            .from('attendance')
            .update({ status: nextDb })
            .eq('id', att.makeup_of_attendance_id)
          if (linkErr) console.error('정규 출석 동기화 실패:', linkErr)
        }

        await loadDailyClasses(selectedDate)
      }
    }
  }

  // 이번 달 출석 합계
  const getMonthlyAttendanceCount = (studentId: number, baseDate: Date) => {
    const y = baseDate.getFullYear()
    const m = baseDate.getMonth() + 1
    const prefix = `${y}-${`${m}`.padStart(2, '0')}-`
    const map = attendanceStatus[studentId] || {}
    return Object.entries(map).filter(([dateKey, status]) => dateKey.startsWith(prefix) && status === 'present').length
  }

  // 월 키와 주 인덱스(0~3)
  const getMonthKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,'0')}`
  const getWeekIndexInMonth = (date: Date) => {
    const firstOfMonth = startOfMonth(date)
    const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn: 1 })
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 })
    const diffMs = currentWeekStart.getTime() - firstWeekStart.getTime()
    const idx = Math.floor(diffMs / (7*24*60*60*1000))
    return Math.max(0, Math.min(3, idx))
  }

  // 특정 월 기준 주차 인덱스의 주 시작/끝
  const getWeekRangeByIndex = (baseDate: Date, index: number) => {
    const firstOfMonth = startOfMonth(baseDate)
    const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn: 1 })
    const start = new Date(firstWeekStart.getTime() + index * 7 * 24 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
    return { start, end }
  }

  // 잔디 셀 호버용: 주차별 상태별 날짜 리스트 반환 (해당 월에 속하는 날짜만)
  const getAttendanceDatesForCellByStatus = (studentId: number, baseDate: Date, index: number) => {
    const { start, end } = getWeekRangeByIndex(baseDate, index)
    const month = baseDate.getMonth()
    const map = attendanceStatus[studentId] || {}
    const collate = (target: 'present' | 'makeup' | 'makeup_done') => Object.entries(map)
      .filter(([k, status]) => status === target)
      .map(([k]) => {
        const [y,m,d] = k.split('-').map(n => parseInt(n, 10))
        return new Date(y, m-1, d)
      })
      .filter(dt => dt >= start && dt <= end && dt.getMonth() === month)
      .map(dt => `${dt.getMonth()+1}/${dt.getDate()}`)
      .sort((a,b) => {
        const [am,ad] = a.split('/').map(n=>parseInt(n,10))
        const [bm,bd] = b.split('/').map(n=>parseInt(n,10))
        if (am !== bm) return am - bm
        return ad - bd
      })
    return {
      present: collate('present'),
      absent: Object.entries(map)
        .filter(([k, status]) => status === 'absent')
        .map(([k]) => {
          const [y,m,d] = k.split('-').map(n => parseInt(n, 10))
          return new Date(y, m-1, d)
        })
        .filter(dt => dt >= start && dt <= end && dt.getMonth() === month)
        .map(dt => `${dt.getMonth()+1}/${dt.getDate()}`)
        .sort((a,b) => {
          const [am,ad] = a.split('/').map(n=>parseInt(n,10))
          const [bm,bd] = b.split('/').map(n=>parseInt(n,10))
          if (am !== bm) return am - bm
          return ad - bd
        }),
      makeup: collate('makeup'),
      makeup_done: collate('makeup_done')
    }
  }

  // 문자열 M/D 배열을 Date 배열로 변환 (연/월은 baseDate 기준)
  const toDateObjectsFromMonthDay = (baseDate: Date, monthDayList: string[]) => {
    const year = baseDate.getFullYear()
    return monthDayList.map(md => {
      const [m, d] = md.split('/').map(n => parseInt(n, 10))
      return new Date(year, m - 1, d)
    })
  }

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()


  // 월간 4칸 상태 가져오기/설정

  return (
    <div className="space-y-6">
      <div>
        <h1>수업 관리</h1>
        <p className="text-muted-foreground">진행 중인 수업과 전체 시간표를 관리합니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ongoing">일별 수업</TabsTrigger>
          <TabsTrigger value="schedule">주차별 수업</TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          <div className="space-y-6">
            {/* 달력 섹션 */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    날짜 선택
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    modifiers={{
                      present: () => false,
                      absent: () => false,
                      makeup: () => false,
                      makeup_done: () => false,
                    }}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date)
                        // 해당 날짜의 수업 데이터 로드
                        loadDailyClasses(date)
                      }
                    }}
                    numberOfMonths={1}
                    defaultMonth={selectedDate}
                    weekStartsOn={0}
                    className="rounded-md border"
                  />
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm font-medium text-primary">선택된 날짜:</p>
                    <p className="text-sm font-semibold text-primary mt-1">
                      {selectedDate && format(selectedDate, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 수업 목록 섹션 */}
            <div className="lg:col-span-2">
              {dailyClasses.length > 0 ? (
                <div className="space-y-4">
                  {dailyClasses
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((classItem, index) => (
                      <ClassDetailCard
                        classItem={classItem}
                        selectedDate={selectedDate}
                        getStatusOnDate={getStatusOnDate}
                        getAttendanceDatesForCellByStatus={getAttendanceDatesForCellByStatus}
                        toggleAttendanceForSelectedDate={toggleAttendanceForSelectedDate}
                        openStudentDetail={openStudentDetail}
                        toDateObjectsFromMonthDay={toDateObjectsFromMonthDay}
                        getDisplayStatus={(studentId) => getDisplayStatus(studentId, selectedDate, classItem.class_id) as any}
                        getDisplayStatusForCell={(studentId, idx) => {
                          const { start } = getWeekRangeByIndex(selectedDate, idx)
                          return getDisplayStatus(studentId, start, classItem.class_id) as any
                        }}
                        getAttendanceRecord={(studentId) => getAttendanceRecord(studentId, selectedDate, classItem.class_id) as any}
                        updateAttendanceNote={updateAttendanceNote as any}
                        onClassUpdated={() => loadDailyClasses(selectedDate)}
                      />
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">선택한 날짜에 진행 중인 수업이 없습니다.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>주차별 수업 시간표</CardTitle>
            </CardHeader>
            <CardContent className="w-full">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <CalendarIcon className="h-4 w-4" /> 주차 선택
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Calendar
                      mode="single"
                      selected={scheduleWeek.start}
                      onSelect={(date) => {
                        if (date) {
                          const weekRange = getWeekRange(date)
                          setScheduleWeek(weekRange)
                        }
                      }}
                      numberOfMonths={1}
                      defaultMonth={scheduleWeek.start}
                      weekStartsOn={1}
                      className="rounded-md border"
                      modifiers={{
                        selected: (date) => {
                          return date >= scheduleWeek.start && date <= scheduleWeek.end
                        }
                      }}
                    />
                  </div>
                  <div className="p-3 bg-primary/5 border rounded-md h-fit">
                    <div className="text-sm text-primary font-semibold mb-1">선택된 주차</div>
                    <div className="text-sm">{getMonthAndWeekDisplay(scheduleWeek.start)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {scheduleWeek.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ~ {scheduleWeek.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
              {realTimeSlots.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">시간</TableHead>
                        {["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"].map((day, index) => {
                          const isWeekend = index >= 5 // 토요일, 일요일
                          return (
                            <TableHead 
                              key={day} 
                              className={`text-center min-w-32 ${isWeekend ? (index === 5 ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-500') : ''}`}
                            >
                              {day}
                            </TableHead>
                          )
                        })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {realTimeSlots.map((timeSlot) => (
                        <TableRow key={timeSlot}>
                          <TableCell>{timeSlot.slice(0, 5)}</TableCell>
                          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((dayKey, colIdx) => {
                            const dateStr = toDateStr(weekDates[colIdx])
                            const classesForCell = realSchedule
                              .filter(r => r.date === dateStr && r.time === timeSlot)
                              .sort((a,b) => (a.group_type as string).toString().localeCompare((b.group_type as string).toString()))
                            return (
                              <TableCell
                                key={dayKey}
                                className={`p-2 ${colIdx >= 5 ? (colIdx === 5 ? 'bg-blue-50' : 'bg-red-50') : ''}`}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  // 카드 자체 우클릭은 카드 핸들러에서 처리되고 여기까지 전파되지 않음
                                  setDeleteMenu(null)
                                  setAddMenu({ x: e.clientX, y: e.clientY, date: dateStr, time: timeSlot })
                                }}
                              >
                                {classesForCell.length > 0 ? (
                                  <div className="space-y-2">
                                    {classesForCell.map((cls) => (
                                      <div
                                        key={cls.class_id}
                                        className="p-2 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 hover:shadow-md transition-all duration-200"
                                        onClick={() => openClassDetailDialog(cls)}
                                        onContextMenu={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setAddMenu(null)
                                          setDeleteMenu({ x: e.clientX, y: e.clientY, classId: cls.class_id, hasStudents: cls.students.length > 0 })
                                        }}
                                      >
                            <div className="space-y-1">
                                          <div className="font-medium text-sm">
                                            <div className="flex items-center gap-2">
                                              <span className="hover:text-primary transition-colors">
                                                {format(new Date(cls.date), 'MM/dd (E)', { locale: ko })}
                                              </span>
                                              <span className="hover:text-primary transition-colors">
                                                {cls.time?.slice(0,5)}
                                              </span>
                                            </div>
                                            <Badge variant="outline" className="text-xs mt-1">
                                              {cls.students.filter(s => {
                                                const sid = s.id
                                                const dateKey = dateStr
                                                const att = attendanceStatus[sid]?.[dateKey]
                                                // '보강 예정'이나 '결석'인 학생 제외
                                                return att !== 'makeup' && att !== 'absent'
                                              }).length}명
                                            </Badge>
                                          </div>
                                          {cls.students.length > 0 ? (
                                            <div className="text-xs flex flex-col gap-1">
                                              {cls.students.map(s => (
                                                <div
                                                  key={s.id}
                                                  className={`flex items-center gap-2 px-1 py-0.5 rounded ${(() => {
                                                    const sid = s.id
                                                    const dateKey = dateStr
                                                    const att = attendanceStatus[sid]?.[dateKey]
                                                    // 보강 예정인 경우 박스 전체 하늘색 배경
                                                    return att === 'makeup' ? 'bg-blue-50' : ''
                                                  })()}`}
                                                >
                                                  {s.isTrial ? (
                                                    <span 
                                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedTrialId(s.id)
                                                        setIsTrialDetailOpen(true)
                                                      }}
                                                    >
                                                      {s.name}
                                                    </span>
                                                  ) : (
                                                    <span className={`font-medium ${(() => {
                                                      const sid = s.id
                                                      const dateKey = dateStr
                                                      const att = attendanceStatus[sid]?.[dateKey]
                                                      // 보강 예정/결석은 취소선 + 흐림
                                                      return (att === 'makeup' || att === 'absent') ? 'text-muted-foreground line-through' : ''
                                                    })()}`}>{s.name}</span>
                                                  )}
                                                  <Badge type="grade">{s.grade || ''}</Badge>
                                                  {s.isTrial ? (
                                                    <Badge type="studenttype" className="text-[10px] px-1 py-0">
                                                      체험
                                                    </Badge>
                                                  ) : (
                                                    <LevelBadge level={s.level as any} size={10} radius={2} />
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-muted-foreground">학생 없음</div>
                                          )}
                                  </div>
                                </div>
                              ))}
                            </div>
                                ) : (
                                  <div
                                    className="text-muted-foreground text-sm select-none"
                                  >
                                    -
                                  </div>
                                )}
                          </TableCell>
                            )
                          })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">선택한 주차에 진행 중인 수업이 없습니다.</p>
                  <Button 
                    onClick={() => generateAttendanceForWeek(scheduleWeek.start, scheduleWeek.end)}
                    disabled={isGenerating}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isGenerating ? "생성 중..." : "출석부 생성"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* 우클릭: 빈 셀 수업 추가 메뉴 */}
      {addMenu && (() => {
        const existing = new Set(realSchedule
          .filter(r => r.date === addMenu.date && r.time === addMenu.time)
          .map(r => r.group_type))
        const options = (['일반1','일반2','스페셜','체험'] as GroupType[]).filter(g => !existing.has(g))
        return (
          <div
            style={{ position: 'fixed', top: addMenu.y, left: addMenu.x, zIndex: 10000 }}
            className="bg-popover text-popover-foreground border rounded-md shadow-md p-2 w-44"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 text-xs text-muted-foreground">수업 추가 ({addMenu.time.slice(0,5)})</div>
            <div className="h-px bg-border my-1" />
            {options.length > 0 ? (
              options.map((g) => (
                <button
                  key={g}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-accent rounded"
                  onClick={() => createClass(addMenu.date, addMenu.time, g)}
                >
                  {g} 추가
                </button>
              ))
            ) : (
              <div className="px-2 py-1 text-xs text-muted-foreground">추가 가능한 그룹이 없습니다</div>
            )}
          </div>
        )
      })()}

      {/* 우클릭: 수업 삭제 메뉴 */}
      {deleteMenu && (
        <div
          style={{ position: 'fixed', top: deleteMenu.y, left: deleteMenu.x, zIndex: 10000 }}
          className="bg-popover text-popover-foreground border rounded-md shadow-md p-2 w-36"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`w-full text-left px-2 py-1 text-sm rounded ${deleteMenu.hasStudents ? 'text-muted-foreground cursor-not-allowed' : 'hover:bg-accent text-destructive'}`}
            onClick={() => {
              if (deleteMenu.hasStudents) return
              deleteClass(deleteMenu.classId)
            }}
            disabled={deleteMenu.hasStudents}
          >
            수업 삭제
          </button>
        </div>
      )}

      {/* 주차별 수업 상세 모달 */}
      <Dialog open={isClassDetailOpen} onOpenChange={setIsClassDetailOpen}>
        <DialogContent type="m">
          {selectedClassForDetail && selectedClassDate && (
            <ClassDetailCard
              classItem={selectedClassForDetail as any}
              selectedDate={selectedClassDate}
              getStatusOnDate={getStatusOnDate as any}
              getAttendanceDatesForCellByStatus={getAttendanceDatesForCellByStatus as any}
              toggleAttendanceForSelectedDate={toggleAttendanceForSelectedDate as any}
              openStudentDetail={openStudentDetail as any}
              toDateObjectsFromMonthDay={toDateObjectsFromMonthDay as any}
              onClassUpdated={() => loadRealSchedule(scheduleWeek.start, scheduleWeek.end)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 수업 학생 관리 다이얼로그 */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent type="m">
          <div className="max-h-[90vh] flex flex-col min-h-0">

          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-m font-bold">수업 학생 관리</DialogTitle>
          </DialogHeader>
          {manageClass && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* 수업 정보 헤더 */}
              <div className="p-4 bg-primary/5 border rounded-lg mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {format(new Date(manageClass.date), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {manageClass.time} • 그룹 {manageClass.group_type}
                    </div>
                  </div>
                </div>
              </div>

              {/* 학생 리스트 */}
              <div className="h-10">
                <div className="space-y-4">
                  {/* 현재 등록된 학생 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">현재 등록된 학생 ({manageClass.students.length}명)</h3>
                    </div>
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y pr-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                      {manageClass.students.length > 0 ? (
                        manageClass.students.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">{s.name.charAt(0)}</span>
                              </div>
                              <span className="font-medium">{s.name}</span>
                              {s.level && (
                                <LevelBadge level={s.level as LevelValue} size={12} radius={2} />
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => removeStudentFromClass(s.id)}
                              className="hover:bg-destructive hover:text-destructive-foreground text-xs px-3 py-1 h-8"
                            >
                              삭제
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                          <div className="text-lg mb-2">📚</div>
                          <div className="text-sm">아직 등록된 학생이 없습니다</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 학생 추가 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">학생 추가</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <Input 
                          placeholder="학생 이름으로 검색..." 
                          value={studentSearch} 
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="pl-10"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="border rounded-lg overflow-y-auto max-h-64">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-3 text-sm font-medium">이름</th>
                                <th className="text-left p-3 text-sm font-medium">등록반</th>
                                <th className="text-left p-3 text-sm font-medium">주당 횟수</th>
                                <th className="text-left p-3 text-sm font-medium">현재 레벨</th>
                                <th className="text-right p-3 text-sm font-medium">액션</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allStudents
                                .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                                .filter(s => !manageClass.students.some(existing => existing.id === s.id))
                                .map(s => (
                                  <tr key={s.id} className="border-b hover:bg-accent/50 transition-colors">
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium text-primary">{s.name.charAt(0)}</span>
                                        </div>
                                        <span className="font-medium">{s.name}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                      {s.class_type?.category || '-'}
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                      주 {s.class_type?.sessions_per_week || 0}회
                                    </td>
                                    <td className="p-3">
                                      {s.current_level && (
                                        <LevelBadge level={s.current_level as LevelValue} size={12} radius={2} />
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => addStudentToClass(s.id)}
                                        className="hover:bg-green-600 hover:text-white text-xs px-3 py-1 h-8"
                                      >
                                        추가
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          {allStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) && !manageClass.students.some(existing => existing.id === s.id)).length === 0 && (
                            <div className="p-6 text-center text-muted-foreground">
                              <div className="text-lg mb-2">🔍</div>
                              <div>추가 가능한 학생이 없습니다</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* 액션 버튼 */}
              <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
                <Button variant="outline" onClick={() => setIsManageOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
            
          )}
           </div>
        </DialogContent>
      </Dialog>

      {/* 학생 상세 정보 모달 */}
      <StudentDetailModal
        isOpen={isStudentDetailOpen}
        onClose={() => setIsStudentDetailOpen(false)}
        studentId={selectedStudentId}
      />

      {/* 체험자 상세 정보 모달 */}
      <TrialDetailModal
        isOpen={isTrialDetailOpen}
        onClose={() => {
          setIsTrialDetailOpen(false)
          setSelectedTrialId(null)
        }}
        reservationId={selectedTrialId}
      />
    </div>
  )
}