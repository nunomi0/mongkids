"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, CalendarDays, Users, Check, X } from "lucide-react"
import TimeSlotSection from "../time-slot-section"
import StudentDetailModal from "../../students/detail/index"
import AddClassStudentModal from "../add-class-student-modal"
import type {
  ClassItem,
  ClassStudent,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceKind,
  GroupType,
  StudentStatus,
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

// ── 더미 학생 데이터 ──

const STUDENT_POOL = [
  { id: 1, name: "김민준", grade: "초3", level: "GREEN" as const, birth_date: "2016-03-15", phone: "010-1234-5678", gender: "남" as const, status: "재원" as StudentStatus, shoe_size: "230", memo: "" },
  { id: 2, name: "이서윤", grade: "초4", level: "BLUE" as const, birth_date: "2015-07-22", phone: "010-2345-6789", gender: "여" as const, status: "재원" as StudentStatus, shoe_size: "235", memo: "" },
  { id: 3, name: "박지호", grade: "초2", level: "YELLOW" as const, birth_date: "2017-11-08", phone: "010-3456-7890", gender: "남" as const, status: "재원" as StudentStatus, shoe_size: "225", memo: "" },
  { id: 4, name: "최수아", grade: "초5", level: "RED" as const, birth_date: "2014-05-30", phone: "010-4567-8901", gender: "여" as const, status: "재원" as StudentStatus, shoe_size: "240", memo: "" },
  { id: 5, name: "정예준", grade: "초1", level: "WHITE" as const, birth_date: "2018-09-12", phone: "010-5678-9012", gender: "남" as const, status: "재원" as StudentStatus, shoe_size: "220", memo: "" },
  { id: 6, name: "강하늘", grade: "초3", level: "GREEN" as const, birth_date: "2016-01-25", phone: "010-6789-0123", gender: "여" as const, status: "재원" as StudentStatus, shoe_size: "230", memo: "" },
  { id: 7, name: "윤서진", grade: "초6", level: "BLACK" as const, birth_date: "2013-12-03", phone: "010-7890-1234", gender: "여" as const, status: "재원" as StudentStatus, shoe_size: "245", memo: "" },
  { id: 8, name: "임도윤", grade: "성인", level: "GOLD" as const, birth_date: "1995-06-18", phone: "010-8901-2345", gender: "남" as const, status: "재원" as StudentStatus, shoe_size: "270", memo: "" },
]

// 시드 기반 난수
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const ALL_GROUP_TYPES: GroupType[] = ["일반1", "일반2", "스페셜", "체험"]

// ── 더미 수업 데이터 ──

function generateDummyClasses(date: Date): ClassItem[] {
  const dateStr = toDateStr(date)
  if (date.getDay() === 0) return []

  const timeSlots = ["15:00", "16:00", "17:00"]
  let classId = 100
  const classes: ClassItem[] = []

  for (const time of timeSlots) {
    // 시간별 1~4개 수업
    const slotSeed = date.getDate() * 3 + timeSlots.indexOf(time) + date.getMonth() * 31
    const rand = seededRandom(slotSeed)
    const numGroups = 1 + Math.floor(rand() * 4)

    for (let g = 0; g < numGroups; g++) {
      const group = ALL_GROUP_TYPES[g]
      const start = (classId * 3) % STUDENT_POOL.length
      const count = 2 + (classId % 3)
      const assigned: ClassStudent[] = Array.from({ length: count }, (_, i) => {
        const s = STUDENT_POOL[(start + i) % STUDENT_POOL.length]
        return { id: s.id, name: s.name, grade: s.grade, level: s.level }
      })
      classes.push({ class_id: classId++, date: dateStr, time, group_type: group, students: assigned })
    }
  }

  return classes
}

function generateDummyAttendance(classes: ClassItem[]): Record<string, AttendanceRecord> {
  const map: Record<string, AttendanceRecord> = {}
  let attId = 1000

  for (const cls of classes) {
    for (const st of cls.students) {
      const key = `${cls.date}-${cls.class_id}-${st.id}`
      map[key] = {
        id: attId++,
        student_id: st.id,
        class_id: cls.class_id,
        date: cls.date,
        status: "예정",
        kind: st.isTrial ? "보강" : "정규",
        makeup_of_attendance_id: null,
        note: null,
      }
    }
  }

  return map
}

// ── 컴포넌트 ──

export default function DailyPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const classes = useMemo(() => generateDummyClasses(selectedDate), [selectedDate])

  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>(() =>
    generateDummyAttendance(classes)
  )

  // 학생 상세 모달
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)

  // 수업 추가 모달
  const [addTargetClass, setAddTargetClass] = useState<ClassItem | null>(null)

  const selectedStudent = useMemo(() => {
    if (selectedStudentId === null) return null
    const s = STUDENT_POOL.find((p) => p.id === selectedStudentId)
    if (!s) return null
    return {
      id: s.id, name: s.name, birth_date: s.birth_date, phone: s.phone,
      class_type_id: 3, gender: s.gender, status: s.status,
      shoe_size: s.shoe_size, memo: s.memo, schedules: [],
    }
  }, [selectedStudentId])

  const handleStudentClick = useCallback((id: number) => setSelectedStudentId(id), [])
  const handleDetailClose = useCallback(() => setSelectedStudentId(null), [])
  const handleStatusChange = useCallback(() => {}, [])

  const handleAddClick = useCallback((classItem: ClassItem) => {
    setAddTargetClass(classItem)
  }, [])

  const handleAddStudent = useCallback(
    (student: ClassStudent, kind: AttendanceKind) => {
      if (!addTargetClass) return
      // 실제로는 API 호출. 여기서는 더미로 처리
      setAddTargetClass(null)
    },
    [addTargetClass],
  )

  // 날짜 이동
  const updateDate = useCallback((d: Date) => {
    setSelectedDate(d)
    setAttendanceMap(generateDummyAttendance(generateDummyClasses(d)))
  }, [])

  const goPrev = useCallback(() => {
    updateDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1))
  }, [selectedDate, updateDate])

  const goNext = useCallback(() => {
    updateDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1))
  }, [selectedDate, updateDate])

  const goToday = useCallback(() => updateDate(new Date()), [updateDate])

  // 출석 토글
  const toggleAttendance = useCallback((studentId: number, classId: number) => {
    const dateStr = toDateStr(selectedDate)
    const key = `${dateStr}-${classId}-${studentId}`

    setAttendanceMap((prev) => {
      const record = prev[key]
      if (!record) return prev
      const next: AttendanceStatus =
        record.status === "예정" ? "출석" : record.status === "출석" ? "결석" : "예정"
      return { ...prev, [key]: { ...record, status: next } }
    })
  }, [selectedDate])

  // 전체 출석
  const markAllPresent = useCallback((classId: number) => {
    const dateStr = toDateStr(selectedDate)
    setAttendanceMap((prev) => {
      const next = { ...prev }
      const cls = classes.find((c) => c.class_id === classId)
      if (!cls) return prev
      for (const st of cls.students) {
        const key = `${dateStr}-${classId}-${st.id}`
        const record = next[key]
        if (record) {
          next[key] = { ...record, status: "출석" }
        } else {
          next[key] = {
            id: Date.now() + st.id,
            student_id: st.id,
            class_id: classId,
            date: dateStr,
            status: "출석",
            kind: "정규",
            makeup_of_attendance_id: null,
            note: null,
          }
        }
      }
      return next
    })
  }, [selectedDate, classes])

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
        const key = `${cls.date}-${cls.class_id}-${st.id}`
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
        {classes.length > 0 && (
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
        {classes.length === 0 ? (
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
                onToggleAttendance={toggleAttendance}
                onStudentClick={handleStudentClick}
                onAddClick={handleAddClick}
                onMarkAllPresent={markAllPresent}
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
        student={selectedStudent}
        onStatusChange={handleStatusChange}
      />

      {/* 수업 추가 모달 */}
      {addTargetClass && (
        <AddClassStudentModal
          isOpen={addTargetClass !== null}
          onClose={() => setAddTargetClass(null)}
          classItem={addTargetClass}
          onAddStudent={handleAddStudent}
        />
      )}
    </>
  )
}
