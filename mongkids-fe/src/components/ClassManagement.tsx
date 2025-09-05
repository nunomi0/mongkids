import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Checkbox } from "./ui/checkbox"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon, Search } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { startOfWeek, endOfWeek, startOfMonth } from "date-fns"
import { supabase } from "../lib/supabase"
import { Input } from "./ui/input"





export default function ClassManagement() {
  const [activeTab, setActiveTab] = useState("ongoing")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [scheduleWeek, setScheduleWeek] = useState<{start: Date, end: Date}>({
    start: new Date(),
    end: new Date()
  })

  // 학생별 출석 상태 (yyyy-MM-dd => 상태)
  const [attendanceStatus, setAttendanceStatus] = useState<Record<number, Record<string, 'present' | 'absent' | 'makeup' | 'makeup_done'>>>({})
  // 깃허브 잔디형 월간 4칸 출결 상태 (present/absent/makeup/none)
  const [attendanceGrid, setAttendanceGrid] = useState<Record<number, Record<string, ("present"|"absent"|"makeup"|"none")[]>>>({})
  // 캘린더 하이라이트(호버)용 상태
  const [hoveredCalendarDates, setHoveredCalendarDates] = useState<{present: Date[]; absent: Date[]; makeup: Date[]; makeup_done: Date[]}>({ present: [], absent: [], makeup: [], makeup_done: [] })
  const [isGenerating, setIsGenerating] = useState(false)
  const [realSchedule, setRealSchedule] = useState<{
    date: string
    time: string
    group_no: number
    class_id: number
    students: { id: number; name: string }[]
  }[]>([])
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [manageClass, setManageClass] = useState<{ class_id: number; date: string; time: string; group_no: number; students: { id: number; name: string }[] } | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [candidateStudents, setCandidateStudents] = useState<{ id: number; name: string }[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [dailyClasses, setDailyClasses] = useState<{
    class_id: number
    time: string
    group_no: number
    students: { id: number; name: string; grade: string; level: string }[]
  }[]>([])


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
      const classUpserts: { date: string; time: string; group_no: number }[] = []
      const attendanceUpserts: { student_id: number; class_id: number; status: string; is_makeup: boolean; memo: string | null }[] = []

      // Helper: YYYY-MM-DD
      const toDateStr = (d: Date) => `${d.getFullYear()}-${`${d.getMonth()+1}`.padStart(2,'0')}-${`${d.getDate()}`.padStart(2,'0')}`

      // 날짜 루프
      for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const weekday = (d.getDay() + 6) % 7 // 0:월 ~ 6:일 (DB 규약에 맞춤)
        const daySchedules = (schedules || []).filter(s => s.weekday === weekday)
        if (daySchedules.length === 0) continue

        const dateStr = toDateStr(d)

        // 날짜별 클래스 upsert 수행 (중복 제거)
        const uniqueKey = new Set<string>()
        const classesForDay: { date: string; time: string; group_no: number }[] = []
        daySchedules.forEach(s => {
          const time = s.time
          const group = s.group_no
          const key = `${dateStr}_${time}_${group}`
          if (!uniqueKey.has(key)) {
            uniqueKey.add(key)
            classesForDay.push({ date: dateStr, time, group_no: group })
          }
        })

        if (classesForDay.length) {
          // upsert classes
          const { data: upserted, error } = await supabase
            .from('classes')
            .upsert(classesForDay, { onConflict: 'date,time,group_no' })
            .select('id, date, time, group_no')
          if (error) throw error

          // class_id 매핑
          const classIdByKey = new Map<string, number>()
          ;(upserted || []).forEach(c => {
            classIdByKey.set(`${c.date}_${c.time}_${c.group_no}`, c.id)
          })

          // 해당 날짜의 각 스케줄 → attendance 예정 upsert
          for (const s of daySchedules) {
            const key = `${dateStr}_${s.time}_${s.group_no}`
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
          status: '예정' as const
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
      const toDateStr = (d: Date) => `${d.getFullYear()}-${`${d.getMonth()+1}`.padStart(2,'0')}-${`${d.getDate()}`.padStart(2,'0')}`
      const startStr = toDateStr(start)
      const endStr = toDateStr(end)

      const { data, error } = await supabase
        .from('classes')
        .select('id, date, time, group_no, attendance:attendance(student_id, students:students(id, name))')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .order('group_no', { ascending: true })
      if (error) throw error

      const mapped = (data || []).map((c: any) => ({
        class_id: c.id,
        date: c.date,
        time: c.time,
        group_no: c.group_no,
        students: ((c.attendance as any[]) || []).map(a => ({ id: a.students?.id, name: a.students?.name })).filter(s => !!s && !!s.id)
      }))
      setRealSchedule(mapped)
    } catch (e) {
      console.error('실시간 시간표 로드 오류:', e)
      setRealSchedule([])
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
          group_no, 
          attendance:attendance(
            student_id, 
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
        .order('group_no', { ascending: true })
      
      if (error) throw error

      const mapped = (data || []).map((c: any) => ({
        class_id: c.id,
        time: c.time,
        group_no: c.group_no,
        students: ((c.attendance as any[]) || [])
          .map(a => {
            const student = a.students
            if (!student) return null
            
            // 한국 나이/학년 계산
            const birthDate = new Date(student.birth_date)
            const today = new Date()
            const age = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()
            
            let grade = ''
            if (age < 6) {
              grade = `${age}세`
            } else if (age === 6) {
              grade = monthDiff >= 0 ? '초1' : '6세'
            } else if (age <= 12) {
              grade = `초${age - 5}`
            } else if (age <= 15) {
              grade = `중${age - 12}`
            } else if (age <= 18) {
              grade = `고${age - 15}`
            } else {
              grade = '성인'
            }
            
            return {
              id: student.id,
              name: student.name,
              grade,
              level: student.current_level || 'NONE'
            }
          })
          .filter(Boolean)
      }))

      setDailyClasses(mapped)
    } catch (e) {
      console.error('일별 수업 로드 오류:', e)
      setDailyClasses([])
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

  const realTimeSlots = Array.from(new Set(realSchedule
    .filter(r => weekDates.some(d => toDateStr(d) === r.date))
    .map(r => r.time))).sort()

  const openManageDialog = async (cls: { class_id: number; date: string; time: string; group_no: number; students: { id: number; name: string }[] }) => {
    setManageClass(cls)
    setIsManageOpen(true)
    setStudentSearch("")
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

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 1분마다 업데이트

    return () => clearInterval(timer)
  }, [])

  // 초기 선택값 설정 (현재 요일과 시간)
  useEffect(() => {
    const currentDay = currentTime.getDay()
    const currentHour = currentTime.getHours()
    

    
    // 현재 주차 설정 (전체 수업 시간표용)
    const weekRange = getWeekRange(currentTime)
    setScheduleWeek(weekRange)
    setSelectedDate(currentTime)
    
    // 초기 일별 수업 로드
    loadDailyClasses(currentTime)
  }, [currentTime])

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
    switch (level) {
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
    const start = startOfWeek(date, { weekStartsOn: 0 }) // 일요일부터 시작
    const end = endOfWeek(date, { weekStartsOn: 0 }) // 토요일까지
    
    return { start, end }
  }

  // 해당 날짜의 (해당 달 기준) 주차 계산 - 일요일 시작
  const getWeekOfMonth = (date: Date) => {
    const firstOfMonth = startOfMonth(date)
    const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 })
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 })
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case "RED":
        return "bg-red-100 text-red-800"
      case "WHITE":
        return "bg-gray-100 text-gray-800"
      case "YELLOW":
        return "bg-yellow-100 text-yellow-800"
      case "GREEN":
        return "bg-green-100 text-green-800"
      case "BLUE":
        return "bg-blue-100 text-blue-800"
      case "BLACK":
        return "bg-black text-white"
      case "ADVANCED":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
  const toggleAttendanceForSelectedDate = (studentId: number) => {
    const key = getDateKey(selectedDate)
    setAttendanceStatus(prev => {
      const mapForStudent = { ...(prev[studentId] || {}) }
      const current = mapForStudent[key] || 'none'
      const next = current === 'none' ? 'present' : current === 'present' ? 'absent' : current === 'absent' ? 'makeup' : current === 'makeup' ? 'makeup_done' : 'present'
      mapForStudent[key] = next
      return { ...prev, [studentId]: mapForStudent }
    })
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
    const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 })
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
  const getWeeklyCells = (studentId: number, date: Date) => {
    const monthKey = getMonthKey(date)
    const existing = attendanceGrid[studentId]?.[monthKey]
    if (existing) return existing
    return ["none","none","none","none"] as ("present"|"absent"|"makeup"|"none")[]
  }

  const setWeeklyCell = (studentId: number, date: Date, index: number, value: "present"|"absent"|"makeup"|"none") => {
    const monthKey = getMonthKey(date)
    setAttendanceGrid(prev => {
      const studentMap = { ...(prev[studentId] || {}) }
      const cells = [...(studentMap[monthKey] || ["none","none","none","none"] as const)] as ("present"|"absent"|"makeup"|"none")[]
      cells[index] = value
      return { ...prev, [studentId]: { ...studentMap, [monthKey]: cells } }
    })
  }

  // 셀 클릭 시 상태 순환
  const cycleWeeklyCell = (studentId: number, date: Date, index: number) => {
    const cells = getWeeklyCells(studentId, date)
    const current = cells[index]
    const next = current === "none" ? "present" : current === "present" ? "absent" : current === "absent" ? "makeup" : "none"
    setWeeklyCell(studentId, date, index, next)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>수업 관리</h1>
        <p className="text-muted-foreground">진행 중인 수업과 전체 시간표를 관리합니다.</p>
        <p className="text-sm text-muted-foreground">
          현재 시간: {currentTime.toLocaleString('ko-KR')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ongoing">일별 수업</TabsTrigger>
          <TabsTrigger value="schedule">전체 수업 시간표</TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      present: (date) => hoveredCalendarDates.present.some(d => isSameDay(d, date)),
                      absent: (date) => hoveredCalendarDates.absent.some(d => isSameDay(d, date)),
                      makeup: (date) => hoveredCalendarDates.makeup.some(d => isSameDay(d, date)),
                      makeup_done: (date) => hoveredCalendarDates.makeup_done.some(d => isSameDay(d, date)),
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
                    modifiersStyles={{
                      present: {
                        backgroundColor: '#22c55e',
                        color: 'white'
                      },
                      absent: {
                        backgroundColor: '#ef4444',
                        color: 'white'
                      },
                      makeup: {
                        backgroundColor: '#eab308',
                        color: '#111827'
                      },
                      makeup_done: {
                        backgroundColor: '#38bdf8',
                        color: '#0b1324'
                      },
                      hover: {
                        backgroundColor: 'hsl(var(--accent))',
                        color: 'hsl(var(--accent-foreground))',
                        cursor: 'pointer'
                      }
                    }}
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
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{format(selectedDate, 'MM.dd', { locale: ko })}</span>
                            <span>•</span>
                            <span>{format(selectedDate, 'EEEE', { locale: ko })}</span>
                            <span>•</span>
                            <span>{classItem.time}</span>
                          </div>
                          <Badge variant="outline">{classItem.students.length}명</Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>그룹 {classItem.group_no}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">참여 학생 ({classItem.students.length}명)</p>
                            <span className="text-xs text-muted-foreground">{format(selectedDate, 'yyyy.MM.dd')} 기준</span>
                          </div>
                          <div className="space-y-3">
                            {classItem.students.map((student) => (
                              <div key={student.id} className="flex items-center justify-between p-2 rounded border">
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant={(() => {
                                      const s = getStatusOnDate(student.id, selectedDate)
                                      if (s === 'present') return 'default'
                                      if (s === 'absent') return 'destructive'
                                      if (s === 'makeup') return 'secondary'
                                      if (s === 'makeup_done') return 'secondary'
                                      return 'outline'
                                    })()}
                                    size="sm"
                                    onClick={() => toggleAttendanceForSelectedDate(student.id)}
                                    className="h-7 px-3"
                                    style={(() => {
                                      const s = getStatusOnDate(student.id, selectedDate)
                                      if (s === 'makeup') return { backgroundColor: '#eab308', color: '#111827', borderColor: '#d1d5db' }
                                      if (s === 'makeup_done') return { backgroundColor: '#38bdf8', color: '#0b1324', borderColor: '#38bdf8' }
                                      return {}
                                    })()}
                                  >
                                    {(() => {
                                      const s = getStatusOnDate(student.id, selectedDate)
                                      if (s === 'present') return '출석'
                                      if (s === 'absent') return '결석'
                                      if (s === 'makeup') return '보강예정'
                                      if (s === 'makeup_done') return '보강완료'
                                      return '출석'
                                    })()}
                                  </Button>
                                  <span className="font-medium">{student.name}</span>
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
                                  <div className="flex gap-1">
                                    {([0,1,2,3] as const).map((idx) => (
                                      <button
                                        key={idx}
                                        className="h-4 w-4 rounded-sm border"
                                        style={{
                                          backgroundColor: (() => {
                                            const state = getWeeklyCells(student.id, selectedDate)[idx]
                                            if (state === 'present') return '#22c55e' // 초록
                                            if (state === 'absent') return '#ef4444' // 빨강
                                            if (state === 'makeup') return '#eab308' // 노랑
                                            if (state === 'makeup_done') return '#38bdf8' // 하늘색
                                            return '#e5e7eb' // 회색
                                          })(),
                                          borderColor: '#d1d5db'
                                        }}
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
                                  <div className="flex items-center gap-2">
                                    <div className="text-[10px] text-muted-foreground">이번 달 출석 {getMonthlyAttendanceCount(student.id, selectedDate)}회</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>주차별 수업 시간표</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={isGenerating} onClick={() => generateAttendanceForMonth(new Date())}>
                    이번 달 출석예정 생성
                  </Button>
                  <Button variant="default" size="sm" disabled={isGenerating} onClick={() => {
                    const now = new Date()
                    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
                    generateAttendanceForMonth(next)
                  }}>
                    다음 달 출석예정 생성
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                      weekStartsOn={0}
                      className="rounded-md border"
                      modifiers={{
                        selected: (date) => {
                          return date >= scheduleWeek.start && date <= scheduleWeek.end
                        }
                      }}
                                              modifiersStyles={{
                          selected: {
                            backgroundColor: 'hsl(var(--primary))',
                            color: 'hsl(var(--primary-foreground))',
                            fontWeight: 'bold'
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">시간</TableHead>
                      {["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"].map((day) => (
                        <TableHead key={day} className="text-center min-w-32">
                          {day}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {realTimeSlots.map((timeSlot) => (
                      <TableRow key={timeSlot}>
                        <TableCell>{timeSlot}</TableCell>
                        {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((dayKey, colIdx) => {
                          const dateStr = toDateStr(weekDates[colIdx])
                          const classesForCell = realSchedule
                            .filter(r => r.date === dateStr && r.time === timeSlot)
                            .sort((a,b) => a.group_no - b.group_no)
                          return (
                            <TableCell key={dayKey} className="p-2">
                              {classesForCell.length > 0 ? (
                                <div className="space-y-2">
                                  {classesForCell.map((cls) => (
                                    <div key={cls.class_id} className="p-2 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 hover:shadow-md transition-all duration-200" onClick={() => openManageDialog(cls)}>
                                      <div className="space-y-1">
                                        <div className="font-medium text-sm flex items-center gap-2">
                                          <div className="flex items-center gap-1">
                                            <span className="hover:text-primary transition-colors">
                                              {format(new Date(cls.date), 'MM.dd', { locale: ko })}
                                            </span>
                                            <span>•</span>
                                            <span className="hover:text-primary transition-colors">
                                              {format(new Date(cls.date), 'EEEE', { locale: ko })}
                                            </span>
                                            <span>•</span>
                                            <span className="hover:text-primary transition-colors">
                                              {cls.time}
                                            </span>
                                          </div>
                                          <Badge variant="outline" className="text-xs">{cls.students.length}명</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          그룹 {cls.group_no}
                                        </div>
                                        {cls.students.length > 0 ? (
                                          <div className="text-xs flex flex-wrap gap-x-2 gap-y-1">
                                            {cls.students.map(s => (
                                              <span key={s.id} className="inline-flex items-center gap-1">{s.name}</span>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-muted-foreground">학생 없음</div>
                                        )}
                                        <div className="text-xs text-muted-foreground opacity-0 hover:opacity-100 transition-opacity duration-200">
                                          클릭하여 학생 관리
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-sm">-</div>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 수업 학생 관리 다이얼로그 */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
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
                      {manageClass.time} • 그룹 {manageClass.group_no}
                    </div>
                  </div>
                </div>
              </div>

              {/* 학생 리스트 */}
              <div className="flex-1 overflow-y-auto">
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
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs px-2 py-0 ${
                                    s.level === 'WHITE' ? 'bg-white text-gray-800 border border-gray-300' :
                                    s.level === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                                    s.level === 'GREEN' ? 'bg-green-100 text-green-800' :
                                    s.level === 'BLUE' ? 'bg-blue-100 text-blue-800' :
                                    s.level === 'RED' ? 'bg-red-100 text-red-800' :
                                    s.level === 'BLACK' ? 'bg-gray-800 text-white' :
                                    s.level === 'GOLD' ? 'bg-yellow-500 text-white' :
                                    'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {s.level}
                                </Badge>
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
                                        <Badge 
                                          variant="secondary" 
                                          className={`text-xs px-2 py-0 ${
                                            s.current_level === 'WHITE' ? 'bg-white text-gray-800 border border-gray-300' :
                                            s.current_level === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                                            s.current_level === 'GREEN' ? 'bg-green-100 text-green-800' :
                                            s.current_level === 'BLUE' ? 'bg-blue-100 text-blue-800' :
                                            s.current_level === 'RED' ? 'bg-red-100 text-red-800' :
                                            s.current_level === 'BLACK' ? 'bg-gray-800 text-white' :
                                            s.current_level === 'GOLD' ? 'bg-yellow-500 text-white' :
                                            'bg-gray-100 text-gray-800'
                                          }`}
                                        >
                                          {s.current_level}
                                        </Badge>
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
    </div>
  )
}