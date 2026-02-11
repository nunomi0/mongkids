import { memo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, CheckCheck } from "lucide-react"
import LevelBadge from "@/components/level-badge"
import type {
  ClassItem,
  ClassStudent,
  AttendanceRecord,
  AttendanceStatus,
  LevelType,
} from "@/types/student"

// 출석 상태 스타일
const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; border: string }> = {
  예정: { bg: "bg-white", text: "text-gray-500", border: "border-gray-200" },
  출석: { bg: "bg-green-50", text: "text-green-700", border: "border-green-300" },
  결석: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
}

function StudentRow({
  student,
  status,
  onToggle,
  onNameClick,
}: {
  student: ClassStudent
  status: AttendanceStatus
  onToggle: () => void
  onNameClick?: (studentId: number) => void
}) {
  const style = STATUS_STYLES[status]

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded border cursor-pointer transition-colors ${style.bg} ${style.border}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 min-w-0">
        {student.level ? (
          <LevelBadge level={student.level as LevelType} size={10} radius={2} />
        ) : (
          <span className="w-[10px] h-[10px] rounded-sm bg-gray-200 inline-block shrink-0" />
        )}
        {onNameClick ? (
          <button
            type="button"
            className="text-sm font-medium hover:underline underline-offset-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onNameClick(student.id)
            }}
          >
            {student.name}
          </button>
        ) : (
          <span className="text-sm font-medium shrink-0">{student.name}</span>
        )}
        <span className="text-xs text-muted-foreground shrink-0">{student.grade}</span>
        {student.isTrial && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
            체험
          </Badge>
        )}
      </div>
      <span className={`text-xs font-medium shrink-0 ${style.text}`}>{status}</span>
    </div>
  )
}

type Props = {
  classItem: ClassItem
  attendanceMap: Record<string, AttendanceRecord>
  onToggleAttendance: (studentId: number, classId: number) => void
  onStudentClick?: (studentId: number) => void
  onAddClick?: () => void
  onMarkAllPresent?: (classId: number) => void
}

function ClassDetailCard({ classItem, attendanceMap, onToggleAttendance, onStudentClick, onAddClick, onMarkAllPresent }: Props) {
  const { class_id, date, time, group_type, students } = classItem

  // 출석 통계
  let present = 0
  let absent = 0
  for (const st of students) {
    const key = `${date}-${class_id}-${st.id}`
    const record = attendanceMap[key]
    if (record?.status === "출석") present++
    else if (record?.status === "결석") absent++
  }

  return (
    <Card className="group/card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {time} · {group_type}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{students.length}명</span>
            {present > 0 && <span className="text-green-600">출석 {present}</span>}
            {absent > 0 && <span className="text-red-600">결석 {absent}</span>}
            {onMarkAllPresent && students.length > 0 && present < students.length && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAllPresent(class_id)
                }}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                전체 출석
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {students.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            배정된 학생이 없습니다
          </div>
        ) : (
          students.map((st) => {
            const key = `${date}-${class_id}-${st.id}`
            const record = attendanceMap[key]
            const status: AttendanceStatus = record?.status ?? "예정"

            return (
              <StudentRow
                key={st.id}
                student={st}
                status={status}
                onToggle={() => onToggleAttendance(st.id, class_id)}
                onNameClick={onStudentClick}
              />
            )
          })
        )}
        {onAddClick && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground hover:text-foreground opacity-0 group-hover/card:opacity-100 transition-opacity"
            onClick={onAddClick}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            학생 추가하기
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(ClassDetailCard)
