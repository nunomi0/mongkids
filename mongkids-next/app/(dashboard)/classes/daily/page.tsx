"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, CalendarDays, Users, Check, X } from "lucide-react"
import TimeSlotSection from "../time-slot-section"
import StudentDetailModal from "../../students/detail/index"
import AddClassStudentModal from "../add-class-student-modal"
import {
  fetchClassesByDate,
  upsertAttendance,
  markAllPresent as markAllPresentApi,
  updateAttendanceMemo,
} from "@/lib/queries"
import type {
  ClassItem,
  ClassStudent,
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

function formatDateHeader(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KR[d.getDay()]})`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ── 컴포넌트 ──

export default function DailyPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({})
  const [loading, setLoading] = useState(true)

  // 학생 상세 모달
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // 수업 추가 모달
  const [addTargetClass, setAddTargetClass] = useState<ClassItem | null>(null)

  // 수업 메모 (key: `${classId}-${studentId}`)
  const [memoMap, setMemoMap] = useState<Record<string, string>>({})

  // 데이터 로드
  const loadData = useCallback(async (date: Date) => {
    setLoading(true)
    const dateStr = toDateStr(date)
    const { classes: fetchedClasses, attendanceMap: fetchedMap } = await fetchClassesByDate(dateStr)
    setClasses(fetchedClasses)
    setAttendanceMap(fetchedMap)
    // memo 초기화 (attendance memo에서 가져오기)
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
    loadData(selectedDate)
  }, [selectedDate, loadData])

  const handleStudentClick = useCallback((id: string) => setSelectedStudentId(id), [])
  const handleDetailClose = useCallback(() => setSelectedStudentId(null), [])
  const handleStatusChange = useCallback(() => {}, [])

  const handleAddClick = useCallback((classItem: ClassItem) => {
    setAddTargetClass(classItem)
  }, [])

  const handleStudentAdded = useCallback(() => {
    setAddTargetClass(null)
    loadData(selectedDate)
  }, [selectedDate, loadData])

  // 날짜 이동
  const goPrev = useCallback(() => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1))
  }, [])

  const goNext = useCallback(() => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1))
  }, [])

  const goToday = useCallback(() => setSelectedDate(new Date()), [])

  // 출석 토글
  const toggleAttendance = useCallback((studentId: string, classId: string) => {
    const dateStr = toDateStr(selectedDate)
    const key = `${dateStr}-${classId}-${studentId}`

    setAttendanceMap((prev) => {
      const record = prev[key]
      if (!record) return prev
      const next: AttendanceStatus =
        record.status === "예정" ? "출석" : record.status === "출석" ? "결석" : "예정"
      upsertAttendance({ student_id: studentId, class_id: classId, status: next })
      return { ...prev, [key]: { ...record, status: next } }
    })
  }, [selectedDate])

  // 전체 출석
  const handleMarkAllPresent = useCallback((classId: string) => {
    const dateStr = toDateStr(selectedDate)
    const cls = classes.find((c) => c.id === classId)
    if (!cls) return

    setAttendanceMap((prev) => {
      const next = { ...prev }
      for (const st of cls.students) {
        const key = `${dateStr}-${classId}-${st.id}`
        const record = next[key]
        if (record) {
          next[key] = { ...record, status: "출석" }
        }
      }
      return next
    })

    markAllPresentApi(classId, cls.students.map((s) => s.id))
  }, [selectedDate, classes])

  // 수업 메모 변경
  const handleMemoChange = useCallback((classId: string, studentId: string, value: string) => {
    const key = `${classId}-${studentId}`
    setMemoMap((prev) => ({ ...prev, [key]: value }))
    const dateStr = toDateStr(selectedDate)
    const attKey = `${dateStr}-${classId}-${studentId}`
    const record = attendanceMap[attKey]
    if (record?.id) {
      updateAttendanceMemo(record.id, value)
    }
  }, [selectedDate, attendanceMap])

  // 시간대별 그룹
  const groupedByTime = useMemo(() => {
    const map = new Map<string, ClassItem[]>()
    for (const cls of classes) {
      const list = map.get(cls.time) || []
      list.push(cls)
      map.set(cls.time, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [classes])

  // 오늘 통계
  const stats = useMemo(() => {
    let total = 0, present = 0, absent = 0
    for (const cls of classes) {
      for (const st of cls.students) {
        total++
        const key = `${cls.date}-${cls.id}-${st.id}`
        const r = attendanceMap[key]
        if (r?.status === "출석") present++
        else if (r?.status === "결석") absent++
      }
    }
    return { total, present, absent, pending: total - present - absent }
  }, [classes, attendanceMap])

  const showTodayBtn = !isSameDay(selectedDate, new Date())

  return (
    <>
      <div className="w-full space-y-6 p-6">
        {/* 날짜 네비게이션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-bold tabular-nums">
              {formatDateHeader(selectedDate)}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {showTodayBtn && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              오늘
            </Button>
          )}
        </div>

        {/* 수업 요약 */}
        {!loading && classes.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>전체 <strong className="text-foreground">{stats.total}</strong>명</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" />{stats.present}
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <X className="h-3 w-3" />{stats.absent}
                  </span>
                  <span className="text-muted-foreground">예정 {stats.pending}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 수업 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">해당 날짜에 수업이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByTime.map(([time, items]) => (
              <TimeSlotSection
                key={time}
                time={time}
                classes={items}
                attendanceMap={attendanceMap}
                memoMap={memoMap}
                onToggleAttendance={toggleAttendance}
                onStudentClick={handleStudentClick}
                onAddClick={handleAddClick}
                onMarkAllPresent={handleMarkAllPresent}
                onMemoChange={handleMemoChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* 학생 상세 모달 */}
      <StudentDetailModal
        isOpen={selectedStudentId !== null}
        onClose={handleDetailClose}
        studentId={selectedStudentId}
        student={null}
        onStatusChange={handleStatusChange}
      />

      {/* 수업 추가 모달 */}
      {addTargetClass && (
        <AddClassStudentModal
          isOpen={addTargetClass !== null}
          onClose={() => setAddTargetClass(null)}
          classItem={addTargetClass}
          onStudentAdded={handleStudentAdded}
        />
      )}
    </>
  )
}
