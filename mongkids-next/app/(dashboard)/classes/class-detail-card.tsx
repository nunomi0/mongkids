import { memo, useState, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, CheckCheck, MessageSquare } from "lucide-react"
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
  memo: memoText,
  isExpanded,
  onToggle,
  onNameClick,
  onMemoToggle,
  onMemoChange,
}: {
  student: ClassStudent
  status: AttendanceStatus
  memo: string
  isExpanded: boolean
  onToggle: () => void
  onNameClick?: (studentId: number) => void
  onMemoToggle: () => void
  onMemoChange: (value: string) => void
}) {
  const style = STATUS_STYLES[status]
  const hasMemo = !!memoText.trim()

  return (
    <div>
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t border cursor-pointer transition-colors ${style.bg} ${style.border} ${!isExpanded ? "rounded-b" : "border-b-0"}`}
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
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            className={`relative p-1 rounded transition-colors ${
              hasMemo
                ? "text-blue-500 hover:bg-blue-50"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onMemoToggle()
            }}
            title="수업 메모"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {hasMemo && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
          </button>
          <span className={`text-xs font-medium ${style.text}`}>{status}</span>
        </div>
      </div>
      {isExpanded && (
        <div className={`px-3 py-2 border border-t-0 rounded-b ${style.border} bg-muted/20`}>
          <Textarea
            value={memoText}
            onChange={(e) => onMemoChange(e.target.value)}
            placeholder="수업 메모를 입력하세요..."
            className="min-h-[60px] text-xs resize-none bg-white"
            rows={2}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

type Props = {
  classItem: ClassItem
  attendanceMap: Record<string, AttendanceRecord>
  memoMap?: Record<string, string>
  onToggleAttendance: (studentId: number, classId: number) => void
  onStudentClick?: (studentId: number) => void
  onAddClick?: () => void
  onMarkAllPresent?: (classId: number) => void
  onMemoChange?: (classId: number, studentId: number, value: string) => void
}

function ClassDetailCard({ classItem, attendanceMap, memoMap = {}, onToggleAttendance, onStudentClick, onAddClick, onMarkAllPresent, onMemoChange }: Props) {
  const { class_id, date, time, group_type, students } = classItem

  // 메모 확장 상태 (로컬)
  const [expandedMemos, setExpandedMemos] = useState<Set<number>>(new Set())

  const toggleMemoExpanded = useCallback((studentId: number) => {
    setExpandedMemos((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }, [])

  // 출석 통계
  let present = 0
  let absent = 0
  for (const st of students) {
    const key = `${date}-${class_id}-${st.id}`
    const record = attendanceMap[key]
    if (record?.status === "출석") present++
    else if (record?.status === "결석") absent++
  }

  // 메모 있는 학생 수
  let memoCount = 0
  for (const st of students) {
    const memoKey = `${class_id}-${st.id}`
    if (memoMap[memoKey]?.trim()) memoCount++
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
            {memoCount > 0 && (
              <span className="flex items-center gap-0.5 text-blue-500">
                <MessageSquare className="h-3 w-3" />{memoCount}
              </span>
            )}
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
            const memoKey = `${class_id}-${st.id}`

            return (
              <StudentRow
                key={st.id}
                student={st}
                status={status}
                memo={memoMap[memoKey] ?? ""}
                isExpanded={expandedMemos.has(st.id)}
                onToggle={() => onToggleAttendance(st.id, class_id)}
                onNameClick={onStudentClick}
                onMemoToggle={() => toggleMemoExpanded(st.id)}
                onMemoChange={(value) => onMemoChange?.(class_id, st.id, value)}
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
