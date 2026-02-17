"use client"

import { useState, useCallback, useMemo, useEffect, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react"
import LevelBadge from "@/components/level-badge"
import ClassDetailCard from "../class-detail-card"
import AddClassStudentModal from "../add-class-student-modal"
import AddClassModal from "../add-class-modal"
import {
  fetchClassesByWeek,
  upsertAttendance,
  markAllPresent as markAllPresentApi,
  updateAttendanceMemo,
} from "@/lib/queries"
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
    <div className="w-[260px]">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goCalPrev}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-semibold">{calYear}년 {calMonth + 1}월</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goCalNext}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-1">
        {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
          <div key={d} className={`py-1 ${d === "토" ? "text-blue-500" : d === "일" ? "text-red-500" : ""}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {grid.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} className="py-1.5" />
          const ds = toDateStr(cell)
          const isInWeek = weekDateStrs.has(ds)
          const isToday = ds === todayStr
          const isSat = cell.getDay() === 6
          const isSun = cell.getDay() === 0

          return (
            <div
              key={ds}
              className={`py-1.5 cursor-pointer rounded-md transition-colors ${
                isInWeek
                  ? "bg-blue-500 text-white font-medium"
                  : "hover:bg-muted"
              } ${isToday && !isInWeek ? "ring-1 ring-blue-400 font-medium" : ""} ${
                !isInWeek && isSat ? "text-blue-500" : !isInWeek && isSun ? "text-red-500" : ""
              }`}
              onClick={() => onSelectWeek(getMonday(cell))}
            >
              {cell.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ── 시간대 행 ──

const GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "일반1": { bg: "bg-white", text: "text-gray-700", border: "border-gray-200" },
  "일반2": { bg: "bg-white", text: "text-gray-700", border: "border-gray-200" },
  "스페셜": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "체험": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
}

const TimeSlotRow = memo(function TimeSlotRow({
  time,
  weekDates,
  classesByDateTime,
  onClassClick,
  onAddClassClick,
}: {
  time: string
  weekDates: Date[]
  classesByDateTime: Map<string, ClassItem[]>
  onClassClick: (cls: ClassItem) => void
  onAddClassClick: (date: string, time: string) => void
}) {
  const todayStr = toDateStr(new Date())

  return (
    <tr>
      <td className="border-r border-b border-border/50 px-3 py-2.5 text-xs font-medium text-center align-middle bg-muted/30 whitespace-nowrap">
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
            className={`group/cell border-r border-b border-border/50 p-1.5 align-top text-xs min-w-[140px] ${
              isToday ? "bg-blue-50/40" : isSunday ? "bg-muted/20" : ""
            }`}
          >
            {cellClasses.length === 0 ? (
              <div className="flex items-center justify-center h-10 text-muted-foreground/30">-</div>
            ) : (
              <div className="space-y-1.5">
                {cellClasses.map((cls) => {
                  const color = GROUP_COLORS[cls.group_type] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" }
                  return (
                    <div
                      key={cls.id}
                      className={`rounded-md p-1.5 cursor-pointer transition-all border ${color.border} ${color.bg} hover:shadow-sm`}
                      onClick={() => onClassClick(cls)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-medium ${color.text}`}>
                          {cls.group_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{cls.students.length}명</span>
                      </div>
                      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                        {cls.students.map((st) => (
                          <span key={st.id} className="inline-flex items-center gap-0.5">
                            {st.level && <LevelBadge level={st.level as LevelType} size={7} radius={1} />}
                            <span className="text-[11px]">{st.name}</span>
                            <span className="text-[10px] text-muted-foreground">{st.grade}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div
              className="mt-1 rounded-md h-5 flex items-center justify-center cursor-pointer opacity-0 group-hover/cell:opacity-100 transition-all text-muted-foreground/40 hover:bg-blue-50 hover:text-blue-500"
              onClick={() => onAddClassClick(ds, time)}
            >
              <Plus className="h-3 w-3" />
            </div>
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
  const [localClasses, setLocalClasses] = useState<ClassItem[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({})
  const [loading, setLoading] = useState(true)

  // 데이터 로드
  const loadData = useCallback(async (mon: Date) => {
    setLoading(true)
    const start = toDateStr(mon)
    const end = toDateStr(getSunday(mon))
    const { classes, attendanceMap: fetchedMap } = await fetchClassesByWeek(start, end)
    setLocalClasses(classes)
    setAttendanceMap(fetchedMap)
    // memo 초기화
    const memos: Record<string, string> = {}
    for (const record of Object.values(fetchedMap)) {
      if (record.memo) {
        const key = `${record.class_id}-${record.student_id}`
        memos[key] = record.memo
      }
    }
    setMemoMap(memos)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData(monday)
  }, [monday, loadData])

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [modalClass, setModalClass] = useState<ClassItem | null>(null)
  const [addTargetClass, setAddTargetClass] = useState<ClassItem | null>(null)
  const [addClassTarget, setAddClassTarget] = useState<{ date: string; time: string } | null>(null)
  const [memoMap, setMemoMap] = useState<Record<string, string>>({})

  // 날짜+시간별 인덱싱
  const classesByDateTime = useMemo(() => {
    const map = new Map<string, ClassItem[]>()
    for (const cls of localClasses) {
      const key = `${cls.date}-${cls.time}`
      const list = map.get(key) || []
      list.push(cls)
      map.set(key, list)
    }
    return map
  }, [localClasses])

  const uniqueTimes = useMemo(() => {
    const set = new Set<string>()
    for (const cls of localClasses) set.add(cls.time)
    return Array.from(set).sort()
  }, [localClasses])

  // 모달용 attendance map
  const modalAttendanceMap = useMemo(() => {
    if (!modalClass) return {}
    const result: Record<string, AttendanceRecord> = {}
    for (const st of modalClass.students) {
      const key = `${modalClass.date}-${modalClass.id}-${st.id}`
      const record = attendanceMap[key]
      if (record) result[key] = record
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
    setCalendarOpen(false)
  }, [])

  const handleClassClick = useCallback((cls: ClassItem) => {
    setModalClass(cls)
  }, [])

  // 출석 토글
  const handleToggleAttendance = useCallback((studentId: string, classId: string) => {
    setAttendanceMap((prev) => {
      // date가 포함된 키 찾기
      const matchKey = Object.keys(prev).find((k) => k.endsWith(`-${classId}-${studentId}`))
      if (matchKey) {
        const record = prev[matchKey]
        const cycle: AttendanceStatus[] = ["예정", "출석", "결석"]
        const idx = cycle.indexOf(record.status)
        const next = cycle[(idx + 1) % cycle.length]
        upsertAttendance({ student_id: studentId, class_id: classId, status: next })
        return { ...prev, [matchKey]: { ...record, status: next } }
      }
      return prev
    })
  }, [])

  const handleAddClick = useCallback(() => {
    if (modalClass) setAddTargetClass(modalClass)
  }, [modalClass])

  const handleStudentAdded = useCallback(() => {
    setAddTargetClass(null)
    loadData(monday)
  }, [monday, loadData])

  // 전체 출석
  const handleMarkAllPresent = useCallback((classId: string) => {
    if (!modalClass) return

    setAttendanceMap((prev) => {
      const next = { ...prev }
      for (const st of modalClass.students) {
        const key = `${modalClass.date}-${classId}-${st.id}`
        const record = next[key]
        if (record) {
          next[key] = { ...record, status: "출석" }
        }
      }
      return next
    })

    markAllPresentApi(classId, modalClass.students.map((s) => s.id))
  }, [modalClass])

  // 수업 메모 변경
  const handleMemoChange = useCallback((classId: string, studentId: string, value: string) => {
    const key = `${classId}-${studentId}`
    setMemoMap((prev) => ({ ...prev, [key]: value }))
    // attendance record 찾아서 업데이트
    const attKey = Object.keys(attendanceMap).find((k) => k.endsWith(`-${classId}-${studentId}`))
    const record = attKey ? attendanceMap[attKey] : null
    if (record?.id) {
      updateAttendanceMemo(record.id, value)
    }
  }, [attendanceMap])

  const handleAddClassClick = useCallback((date: string, time: string) => {
    setAddClassTarget({ date, time })
  }, [])

  const handleAddClass = useCallback((newClass: ClassItem) => {
    setLocalClasses((prev) => [...prev, newClass])
    setAddClassTarget(null)
  }, [])

  const { month: headerMonth, week: headerWeek } = getWeekOfMonth(monday)

  return (
    <>
      <div className="w-full space-y-4 p-6">
        {/* 주 네비게이션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {formatWeekHeader(monday, sunday)}
            </h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {headerMonth}월 {headerWeek}주차
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goThisWeek}>
              이번 주
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={calendarOpen ? "secondary" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-4">
                <MiniCalendar currentMonday={monday} onSelectWeek={handleSelectWeek} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : (
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-r border-b border-border/50 px-3 py-2.5 text-[11px] text-muted-foreground bg-muted/40 w-16 font-medium">
                      시간
                    </th>
                    {weekDates.map((date) => {
                      const ds = toDateStr(date)
                      const isToday = ds === toDateStr(new Date())
                      const isSat = date.getDay() === 6
                      const isSun = date.getDay() === 0

                      return (
                        <th
                          key={ds}
                          className={`border-r border-b border-border/50 px-2 py-2.5 text-xs font-medium min-w-[140px] ${
                            isToday ? "bg-blue-50/60" : "bg-muted/40"
                          }`}
                        >
                          <div className={`${isToday ? "text-blue-600" : isSat ? "text-blue-500" : isSun ? "text-red-500" : ""}`}>
                            <span className="text-sm">{date.getDate()}</span>
                            <span className="text-[11px] ml-0.5">({WEEKDAY_KR[date.getDay()]})</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {uniqueTimes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground py-20">
                        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">이번 주에 수업이 없습니다</p>
                      </td>
                    </tr>
                  ) : (
                    uniqueTimes.map((time) => (
                      <TimeSlotRow
                        key={time}
                        time={time}
                        weekDates={weekDates}
                        classesByDateTime={classesByDateTime}
                        onClassClick={handleClassClick}
                        onAddClassClick={handleAddClassClick}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
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
              memoMap={memoMap}
              onToggleAttendance={handleToggleAttendance}
              onAddClick={handleAddClick}
              onMarkAllPresent={handleMarkAllPresent}
              onMemoChange={handleMemoChange}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 학생 추가 모달 */}
      {addTargetClass && (
        <AddClassStudentModal
          isOpen={addTargetClass !== null}
          onClose={() => setAddTargetClass(null)}
          classItem={addTargetClass}
          onStudentAdded={handleStudentAdded}
          classGroupType={addTargetClass.group_type}
        />
      )}

      {/* 수업 추가 모달 */}
      {addClassTarget && (
        <AddClassModal
          isOpen={addClassTarget !== null}
          onClose={() => setAddClassTarget(null)}
          date={addClassTarget.date}
          time={addClassTarget.time}
          onAddClass={handleAddClass}
          existingGroupTypes={
            (classesByDateTime.get(`${addClassTarget.date}-${addClassTarget.time}`) || [])
              .map((cls) => cls.group_type)
          }
        />
      )}
    </>
  )
}
