"use client"

import { useState, useCallback, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import LevelBadge from "@/components/level-badge"
import ClassDetailCard from "../class-detail-card"
import type {
  ClassItem,
  ClassStudent,
  GroupType,
  LevelType,
  AttendanceRecord,
  AttendanceStatus,
} from "@/types/student"

// ── 유틸 ──

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"]

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getSunday(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  return d
}

function formatWeekHeader(monday: Date, sunday: Date): string {
  return `${monday.getFullYear()}년 ${monday.getMonth() + 1}월 ${monday.getDate()}일 ~ ${sunday.getMonth() + 1}월 ${sunday.getDate()}일`
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getWeekOfMonth(d: Date): { month: number; week: number } {
  return { month: d.getMonth() + 1, week: Math.ceil(d.getDate() / 7) }
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

// ── 미니 달력 ──

function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startDow = firstDay.getDay()
  const offset = startDow === 0 ? 6 : startDow - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const MiniCalendar = memo(function MiniCalendar({
  currentMonday,
  onSelectWeek,
}: {
  currentMonday: Date
  onSelectWeek: (monday: Date) => void
}) {
  const thursday = new Date(currentMonday)
  thursday.setDate(thursday.getDate() + 3)
  const [calYear, setCalYear] = useState(thursday.getFullYear())
  const [calMonth, setCalMonth] = useState(thursday.getMonth())

  const grid = useMemo(() => getCalendarGrid(calYear, calMonth), [calYear, calMonth])
  const todayStr = toDateStr(new Date())
  const weekDateStrs = useMemo(() => new Set(getWeekDates(currentMonday).map(toDateStr)), [currentMonday])

  const goCalPrev = useCallback(() => {
    setCalMonth((prev) => { if (prev === 0) { setCalYear((y) => y - 1); return 11 } return prev - 1 })
  }, [])
  const goCalNext = useCallback(() => {
    setCalMonth((prev) => { if (prev === 11) { setCalYear((y) => y + 1); return 0 } return prev + 1 })
  }, [])

  return (
    <Card className="p-4 w-fit">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goCalPrev}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-medium">{calYear}년 {calMonth + 1}월</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goCalNext}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-1">
        {["월", "화", "수", "목", "금", "토", "일"].map((d) => <div key={d} className="py-0.5 w-8">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {grid.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} className="py-1 w-8" />
          const ds = toDateStr(cell)
          return (
            <div
              key={ds}
              className={`py-1 w-8 cursor-pointer rounded transition-colors ${
                weekDateStrs.has(ds) ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-muted"
              } ${ds === todayStr ? "ring-1 ring-blue-400" : ""}`}
              onClick={() => onSelectWeek(getMonday(cell))}
            >
              {cell.getDate()}
            </div>
          )
        })}
      </div>
    </Card>
  )
})

// ── 더미 데이터 ──

const DUMMY_STUDENTS: ClassStudent[] = [
  { id: 1, name: "김민준", grade: "초3", level: "GREEN" },
  { id: 2, name: "이서윤", grade: "초4", level: "BLUE" },
  { id: 3, name: "박지호", grade: "초2", level: "YELLOW" },
  { id: 4, name: "최수아", grade: "초5", level: "RED" },
  { id: 5, name: "정예준", grade: "초1", level: "WHITE" },
  { id: 6, name: "강하늘", grade: "초3", level: "GREEN" },
  { id: 7, name: "윤서진", grade: "초6", level: "BLACK" },
  { id: 8, name: "임도윤", grade: "성인", level: "GOLD" },
]

const ALL_GROUP_TYPES: GroupType[] = ["일반1", "일반2", "스페셜", "체험"]

function generateWeekClasses(monday: Date): ClassItem[] {
  const dates = getWeekDates(monday)
  const timeSlots = ["15:00", "16:00", "17:00"]
  const weekSeed = monday.getFullYear() * 100 + Math.floor((monday.getTime() / 604800000) % 100)
  let classId = weekSeed * 10
  const classes: ClassItem[] = []

  for (const date of dates) {
    const dateStr = toDateStr(date)
    for (const time of timeSlots) {
      const slotSeed = (weekSeed * 7 + date.getDay()) * 3 + timeSlots.indexOf(time)
      const rand = seededRandom(slotSeed)
      const numGroups = 1 + Math.floor(rand() * 4)

      for (let g = 0; g < numGroups; g++) {
        const group = ALL_GROUP_TYPES[g]
        const studentSeed = classId + weekSeed
        const start = (studentSeed * 3) % DUMMY_STUDENTS.length
        const count = 2 + (studentSeed % 3)
        const assigned = Array.from({ length: count }, (_, i) =>
          DUMMY_STUDENTS[(start + i) % DUMMY_STUDENTS.length],
        )
        classes.push({ class_id: classId++, date: dateStr, time, group_type: group, students: assigned })
      }
    }
  }
  return classes
}

// ── 시간대 행 ──

const TimeSlotRow = memo(function TimeSlotRow({
  time,
  weekDates,
  classesByDateTime,
  onClassClick,
}: {
  time: string
  weekDates: Date[]
  classesByDateTime: Map<string, ClassItem[]>
  onClassClick: (cls: ClassItem) => void
}) {
  const todayStr = toDateStr(new Date())

  return (
    <tr>
      <td className="border-r border-b p-2 text-xs font-medium text-center align-middle bg-muted/30 whitespace-nowrap">
        {time}
      </td>
      {weekDates.map((date) => {
        const ds = toDateStr(date)
        const key = `${ds}-${time}`
        const cellClasses = classesByDateTime.get(key) || []
        const isToday = ds === todayStr
        const isSunday = date.getDay() === 0

        return (
          <td
            key={ds}
            className={`border-r border-b p-1.5 align-top text-xs ${
              isToday ? "bg-blue-50/50" : isSunday ? "bg-muted/30" : ""
            }`}
          >
            {cellClasses.length === 0 ? (
              <span className="text-muted-foreground/40">-</span>
            ) : (
              <div className="space-y-1">
                {cellClasses.map((cls) => (
                  <div
                    key={cls.class_id}
                    className="rounded p-1 cursor-pointer transition-colors hover:bg-blue-50 hover:ring-1 hover:ring-blue-200"
                    onClick={() => onClassClick(cls)}
                  >
                    <Badge variant="outline" className="text-[9px] px-1 py-0 mb-0.5">
                      {cls.group_type}
                    </Badge>
                    <div className="space-y-0.5">
                      {cls.students.map((st) => (
                        <div key={st.id} className="inline-flex items-center gap-1 mr-1.5">
                          {st.level && <LevelBadge level={st.level as LevelType} size={8} radius={1} />}
                          <span>{st.name}</span>
                          <span className="text-muted-foreground">{st.grade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        )
      })}
    </tr>
  )
})

// ── 메인 ──

export default function WeeklyPage() {
  const [monday, setMonday] = useState<Date>(() => getMonday(new Date()))
  const sunday = useMemo(() => getSunday(monday), [monday])
  const weekDates = useMemo(() => getWeekDates(monday), [monday])
  const classes = useMemo(() => generateWeekClasses(monday), [monday])

  const [showCalendar, setShowCalendar] = useState(false)
  const [modalClass, setModalClass] = useState<ClassItem | null>(null)
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({})

  // 날짜+시간별 인덱싱
  const classesByDateTime = useMemo(() => {
    const map = new Map<string, ClassItem[]>()
    for (const cls of classes) {
      const key = `${cls.date}-${cls.time}`
      const list = map.get(key) || []
      list.push(cls)
      map.set(key, list)
    }
    return map
  }, [classes])

  const uniqueTimes = useMemo(() => {
    const set = new Set<string>()
    for (const cls of classes) set.add(cls.time)
    return Array.from(set).sort()
  }, [classes])

  // 모달용 attendance map
  const modalAttendanceMap = useMemo(() => {
    if (!modalClass) return {}
    const result: Record<string, AttendanceRecord> = {}
    for (const st of modalClass.students) {
      const detailKey = `${modalClass.date}-${modalClass.class_id}-${st.id}`
      const simpleKey = `${modalClass.class_id}-${st.id}`
      const record = attendanceMap[detailKey] || attendanceMap[simpleKey]
      if (record) result[detailKey] = { ...record, date: modalClass.date }
    }
    return result
  }, [attendanceMap, modalClass])

  const goPrevWeek = useCallback(() => {
    setMonday((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
  }, [])

  const goNextWeek = useCallback(() => {
    setMonday((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
  }, [])

  const goThisWeek = useCallback(() => {
    setMonday(getMonday(new Date()))
  }, [])

  const handleSelectWeek = useCallback((newMonday: Date) => {
    setMonday(newMonday)
    setShowCalendar(false)
  }, [])

  const handleClassClick = useCallback((cls: ClassItem) => {
    setModalClass(cls)
  }, [])

  const handleToggleAttendance = useCallback(
    (studentId: number, classId: number) => {
      const simpleKey = `${classId}-${studentId}`
      const cycle: AttendanceStatus[] = ["예정", "출석", "결석"]
      setAttendanceMap((prev) => {
        const existing = prev[simpleKey]
        if (existing) {
          const idx = cycle.indexOf(existing.status)
          return { ...prev, [simpleKey]: { ...existing, status: cycle[(idx + 1) % cycle.length] } }
        }
        return {
          ...prev,
          [simpleKey]: {
            id: Date.now(), student_id: studentId, class_id: classId,
            date: modalClass?.date ?? "", status: "출석", kind: "정규",
            makeup_of_attendance_id: null, note: null,
          },
        }
      })
    },
    [modalClass],
  )

  return (
    <>
      <div className="w-full space-y-6 p-6">
        {/* 주 네비게이션 */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[300px] text-center">
            {formatWeekHeader(monday, sunday)}
          </h2>
          <Button variant="outline" size="icon" onClick={goNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goThisWeek}>
            이번 주
          </Button>
          <Button
            variant={showCalendar ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowCalendar((v) => !v)}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            달력
          </Button>
        </div>

        {/* 달력 (토글) */}
        {showCalendar && (
          <MiniCalendar currentMonday={monday} onSelectWeek={handleSelectWeek} />
        )}

        {/* 테이블 */}
        <Card className="min-w-0">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-r border-b p-2 text-xs text-muted-foreground bg-muted/50 w-16">
                    시간
                  </th>
                  {weekDates.map((date) => {
                    const ds = toDateStr(date)
                    const isToday = ds === toDateStr(new Date())
                    const { month, week } = getWeekOfMonth(date)

                    return (
                      <th
                        key={ds}
                        className={`border-r border-b p-2 text-xs font-medium ${
                          isToday ? "bg-blue-50/50 text-blue-600" : "bg-muted/50"
                        }`}
                      >
                        {date.getMonth() + 1}/{date.getDate()}
                        <br />
                        ({WEEKDAY_KR[date.getDay()]})
                        <br />
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {month}월 {week}주차
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {uniqueTimes.map((time) => (
                  <TimeSlotRow
                    key={time}
                    time={time}
                    weekDates={weekDates}
                    classesByDateTime={classesByDateTime}
                    onClassClick={handleClassClick}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ClassDetailCard 모달 */}
      <Dialog open={modalClass !== null} onOpenChange={(open) => !open && setModalClass(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {modalClass?.time} · {modalClass?.group_type}
            </DialogTitle>
          </DialogHeader>
          {modalClass && (
            <ClassDetailCard
              classItem={modalClass}
              attendanceMap={modalAttendanceMap}
              onToggleAttendance={handleToggleAttendance}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
