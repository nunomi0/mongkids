import { memo } from "react"
import ClassDetailCard from "./class-detail-card"
import type { ClassItem, AttendanceRecord } from "@/types/student"

type Props = {
  time: string
  classes: ClassItem[]
  attendanceMap: Record<string, AttendanceRecord>
  memoMap?: Record<string, string>
  onToggleAttendance: (studentId: number, classId: number) => void
  onStudentClick?: (studentId: number) => void
  onAddClick?: (classItem: ClassItem) => void
  onMarkAllPresent?: (classId: number) => void
  onMemoChange?: (classId: number, studentId: number, value: string) => void
}

function TimeSlotSection({ time, classes, attendanceMap, memoMap, onToggleAttendance, onStudentClick, onAddClick, onMarkAllPresent, onMemoChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{time}</span>
        <span className="text-xs text-muted-foreground">{classes.length}개 수업</span>
        <div className="flex-1 border-t border-dashed" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {classes.map((cls) => (
          <ClassDetailCard
            key={cls.class_id}
            classItem={cls}
            attendanceMap={attendanceMap}
            memoMap={memoMap}
            onToggleAttendance={onToggleAttendance}
            onStudentClick={onStudentClick}
            onAddClick={onAddClick ? () => onAddClick(cls) : undefined}
            onMarkAllPresent={onMarkAllPresent}
            onMemoChange={onMemoChange}
          />
        ))}
      </div>
    </div>
  )
}

export default memo(TimeSlotSection)
