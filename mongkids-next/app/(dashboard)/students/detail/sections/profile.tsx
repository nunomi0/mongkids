import { memo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Student } from "@/types/student"

type Props = {
  className?: string
  student: Student
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

function calculateAge(birthDate: string): string {
  if (!birthDate) return ""
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 20 ? "성인" : `${age}세`
}

function formatSchedules(student: Student): string {
  if (!student.schedules || student.schedules.length === 0) return "-"

  return student.schedules
    .map((s) => `${WEEKDAYS[s.weekday]}${s.time}(${s.group_type})`)
    .join(", ")
}

function ProfileSection({ className, student }: Props) {
  const age = calculateAge(student.birth_date)
  const scheduleText = formatSchedules(student)

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
      </CardHeader>

      <CardContent className="space-y-1 text-sm">
        <div className="font-semibold text-base">{student.name}</div>

        <div className="text-muted-foreground">
          {student.birth_date} ({age}) · {student.gender}
        </div>
        <div className="text-muted-foreground">
          {scheduleText}
        </div>
        <div>신발 사이즈: {student.shoe_size || "-"}</div>
        <div>전화번호: {student.phone}</div>
        <div>메모: {student.memo || "-"}</div>
      </CardContent>
    </Card>
  )
}

export default memo(ProfileSection)
