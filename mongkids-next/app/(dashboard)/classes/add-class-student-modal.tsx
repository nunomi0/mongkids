"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ArrowLeft, Search, UserPlus, RotateCcw, Clock } from "lucide-react"
import LevelBadge from "@/components/level-badge"
import StatusBadge from "@/components/status-badge"
import type { ClassItem, ClassStudent, AttendanceKind, AttendanceStatus, LevelType, Gender, GroupType, StudentSchedule, StudentStatus } from "@/types/student"

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"]

// 이번 달 출석 기록 타입
type MonthlyAttendanceItem = {
  id: number
  date: string
  time: string
  group_type: GroupType
  status: AttendanceStatus
}

// 검색용 확장 학생 타입
type SearchableStudent = ClassStudent & {
  gender: Gender
  className: string
  classTime: string
  phone: string
  status: StudentStatus
}

// 검색용 더미 학생 목록
const SEARCHABLE_STUDENTS: SearchableStudent[] = [
  { id: 1, name: "김민준", grade: "초3", level: "GREEN", gender: "남", className: "어린이 주 3회", classTime: "월수 15:00 / 금 16:00", phone: "010-1234-5678", status: "재원" },
  { id: 2, name: "이서윤", grade: "초4", level: "BLUE", gender: "여", className: "어린이 주 2회", classTime: "화목 16:00", phone: "010-2345-6789", status: "재원" },
  { id: 3, name: "박지호", grade: "초2", level: "YELLOW", gender: "남", className: "어린이 주 2회", classTime: "월 15:00 / 수 16:00", phone: "010-3456-7890", status: "재원" },
  { id: 4, name: "최수아", grade: "초5", level: "RED", gender: "여", className: "어린이 주 3회", classTime: "월수금 16:00", phone: "010-4567-8901", status: "재원" },
  { id: 5, name: "정예준", grade: "초1", level: "WHITE", gender: "남", className: "어린이 주 2회", classTime: "화 15:00 / 목 16:00", phone: "010-5678-9012", status: "재원" },
  { id: 6, name: "강하늘", grade: "초3", level: "GREEN", gender: "여", className: "어린이 주 3회", classTime: "월수금 17:00", phone: "010-6789-0123", status: "재원" },
  { id: 7, name: "윤서진", grade: "초6", level: "BLACK", gender: "여", className: "어린이 주 2회", classTime: "화 17:00 / 목 16:00", phone: "010-7890-1234", status: "휴원" },
  { id: 8, name: "임도윤", grade: "성인", level: "GOLD", gender: "남", className: "성인 주 3회", classTime: "월 19:00 / 수금 20:00", phone: "010-8901-2345", status: "재원" },
]

// 학생별 정규 수업 스케줄 (보강 시 원래 수업 선택용)
const STUDENT_SCHEDULES: Record<number, StudentSchedule[]> = {
  1: [
    { weekday: 1, time: "15:00", group_type: "일반1" },
    { weekday: 3, time: "15:00", group_type: "일반1" },
    { weekday: 5, time: "15:00", group_type: "일반1" },
  ],
  2: [
    { weekday: 2, time: "16:00", group_type: "일반2" },
    { weekday: 4, time: "16:00", group_type: "일반2" },
  ],
  3: [
    { weekday: 1, time: "16:00", group_type: "일반1" },
    { weekday: 3, time: "16:00", group_type: "일반1" },
    { weekday: 5, time: "16:00", group_type: "일반1" },
  ],
  4: [
    { weekday: 2, time: "17:00", group_type: "스페셜" },
    { weekday: 4, time: "17:00", group_type: "스페셜" },
  ],
  5: [
    { weekday: 1, time: "15:00", group_type: "일반2" },
    { weekday: 3, time: "15:00", group_type: "일반2" },
  ],
  6: [
    { weekday: 2, time: "15:00", group_type: "일반1" },
    { weekday: 4, time: "15:00", group_type: "일반1" },
    { weekday: 6, time: "15:00", group_type: "일반1" },
  ],
  7: [
    { weekday: 1, time: "17:00", group_type: "스페셜" },
    { weekday: 3, time: "17:00", group_type: "스페셜" },
    { weekday: 5, time: "17:00", group_type: "스페셜" },
  ],
  8: [
    { weekday: 2, time: "17:00", group_type: "일반2" },
    { weekday: 4, time: "17:00", group_type: "일반2" },
  ],
}

// 시드 기반 난수 (학생 ID + 날짜 기반으로 일관된 결과)
function seededRand(seed: number): number {
  const s = (seed * 1103515245 + 12345) & 0x7fffffff
  return s / 0x7fffffff
}

// 학생의 이번 달 출석 기록 생성
function generateMonthlyAttendance(studentId: number): MonthlyAttendanceItem[] {
  const schedules = STUDENT_SCHEDULES[studentId]
  if (!schedules || schedules.length === 0) return []

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const items: MonthlyAttendanceItem[] = []
  let attId = studentId * 10000

  // 이번 달 1일부터 말일까지
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const weekday = d.getDay()

    for (const schedule of schedules) {
      if (schedule.weekday !== weekday) continue

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      let status: AttendanceStatus

      if (day > today) {
        status = "예정"
      } else {
        // 시드 기반으로 출석/결석 결정 (약 20%가 결석)
        const r = seededRand(studentId * 100 + day * 7 + schedule.weekday)
        status = r < 0.2 ? "결석" : "출석"
      }

      items.push({
        id: attId++,
        date: dateStr,
        time: schedule.time,
        group_type: schedule.group_type,
        status,
      })
    }
  }

  return items
}

type Props = {
  isOpen: boolean
  onClose: () => void
  classItem: ClassItem
  onAddStudent: (student: ClassStudent, kind: AttendanceKind, makeupOfAttendanceId?: number) => void
  classGroupType?: GroupType
}

// 일반 수업 플로우: search → select-kind → (보강 시) select-class
// 체험 수업 플로우: trial-form
type Step = "search" | "select-kind" | "select-class" | "trial-form"

export default function AddClassStudentModal({ isOpen, onClose, classItem, onAddStudent, classGroupType }: Props) {
  const isTrial = classGroupType === "체험"

  const [step, setStep] = useState<Step>(isTrial ? "trial-form" : "search")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null)
  const [selectedKind, setSelectedKind] = useState<"정규" | "보강" | null>(null)

  // 체험 학생 폼
  const [trialName, setTrialName] = useState("")
  const [trialPhone, setTrialPhone] = useState("")
  const [trialGrade, setTrialGrade] = useState("")
  const [trialGender, setTrialGender] = useState<Gender>("남")

  const resetState = () => {
    setStep(isTrial ? "trial-form" : "search")
    setSearchQuery("")
    setSelectedStudent(null)
    setSelectedKind(null)
    setTrialName("")
    setTrialPhone("")
    setTrialGrade("")
    setTrialGender("남")
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleBack = () => {
    if (step === "select-class") {
      setSelectedKind(null)
      setStep("select-kind")
    } else if (step === "select-kind") {
      setSelectedStudent(null)
      setSelectedKind(null)
      setStep("search")
    } else {
      resetState()
    }
  }

  // 학생 선택 → 정규/보강 선택 단계로
  const handleSelectStudent = (student: ClassStudent) => {
    setSelectedStudent(student)
    setStep("select-kind")
  }

  // 정규/보강 선택
  const handleSelectKind = (kind: "정규" | "보강") => {
    setSelectedKind(kind)
    if (!selectedStudent) return

    if (kind === "보강") {
      // 보강 → 원래 수업 선택 단계로
      setStep("select-class")
      return
    }

    const classStudent: ClassStudent = {
      id: selectedStudent.id,
      name: selectedStudent.name,
      grade: selectedStudent.grade,
      level: selectedStudent.level,
    }
    onAddStudent(classStudent, kind)
    handleClose()
  }

  // 보강 시 원래 출석 기록 선택
  const handleSelectSourceAttendance = (attendance: MonthlyAttendanceItem) => {
    if (!selectedStudent) return
    const classStudent: ClassStudent = {
      id: selectedStudent.id,
      name: selectedStudent.name,
      grade: selectedStudent.grade,
      level: selectedStudent.level,
    }
    onAddStudent(classStudent, "보강", attendance.id)
    handleClose()
  }

  // 선택한 학생의 이번 달 출석 기록
  const monthlyAttendance = useMemo(() => {
    if (!selectedStudent) return []
    return generateMonthlyAttendance(selectedStudent.id)
  }, [selectedStudent])

  // 체험 학생 등록
  const handleConfirmTrial = () => {
    if (!trialName.trim()) return
    const classStudent: ClassStudent = {
      id: Date.now(),
      name: trialName.trim(),
      grade: trialGrade || "-",
      level: "",
      isTrial: true,
    }
    onAddStudent(classStudent, "정규")
    handleClose()
  }

  // 검색 필터
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return SEARCHABLE_STUDENTS
    return SEARCHABLE_STUDENTS.filter((s) => s.name.includes(searchQuery.trim()))
  }, [searchQuery])

  const stepTitle = () => {
    if (step === "search") return "학생 추가하기"
    if (step === "select-kind" && selectedStudent) return `${selectedStudent.name} — 유형 선택`
    if (step === "select-class" && selectedStudent) return `${selectedStudent.name} — 보강 수업 선택`
    if (step === "trial-form") return "체험 학생 등록"
    return "학생 추가하기"
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "search" && !isTrial && (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>{stepTitle()}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: 학생 검색 (일반 수업) */}
        {step === "search" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {classItem.time} · {classItem.group_type} 수업에 학생을 추가합니다.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="학생 이름 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  검색 결과가 없습니다
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1.5 px-2 font-medium">이름</th>
                      <th className="text-left py-1.5 px-1 font-medium">성별</th>
                      <th className="text-left py-1.5 px-1 font-medium">학년</th>
                      <th className="text-left py-1.5 px-1 font-medium">레벨</th>
                      <th className="text-left py-1.5 px-1 font-medium">등록반</th>
                      <th className="text-left py-1.5 px-1 font-medium">수업 시간</th>
                      <th className="text-left py-1.5 px-1 font-medium">전화번호</th>
                      <th className="text-left py-1.5 px-1 font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-transparent cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleSelectStudent(student)}
                      >
                        <td className="py-2 px-2">
                          <span className="font-medium text-sm">{student.name}</span>
                        </td>
                        <td className="py-2 px-1">{student.gender}</td>
                        <td className="py-2 px-1">{student.grade}</td>
                        <td className="py-2 px-1">
                          {student.level && <LevelBadge level={student.level as LevelType} size={8} radius={1} />}
                        </td>
                        <td className="py-2 px-1">{student.className}</td>
                        <td className="py-2 px-1 whitespace-nowrap">{student.classTime}</td>
                        <td className="py-2 px-1 whitespace-nowrap">{student.phone}</td>
                        <td className="py-2 px-1">
                          <StatusBadge status={student.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Step 2: 정규/보강 선택 (일반 수업) */}
        {step === "select-kind" && selectedStudent && (
          <div className="grid gap-3 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-muted/50">
              {selectedStudent.level ? (
                <LevelBadge level={selectedStudent.level as LevelType} size={10} radius={2} />
              ) : (
                <span className="w-[10px] h-[10px] rounded-sm bg-gray-200 inline-block" />
              )}
              <span className="text-sm font-medium">{selectedStudent.name}</span>
              <span className="text-xs text-muted-foreground">{selectedStudent.grade}</span>
            </div>
            <p className="text-sm text-muted-foreground">어떤 유형으로 추가할까요?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleSelectKind("정규")}
              >
                <UserPlus className="h-5 w-5" />
                <span className="text-sm">정규</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleSelectKind("보강")}
              >
                <RotateCcw className="h-5 w-5" />
                <span className="text-sm">보강</span>
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 보강 시 이번 달 출석 현황에서 선택 */}
        {step === "select-class" && selectedStudent && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-muted/50">
              {selectedStudent.level ? (
                <LevelBadge level={selectedStudent.level as LevelType} size={10} radius={2} />
              ) : (
                <span className="w-[10px] h-[10px] rounded-sm bg-gray-200 inline-block" />
              )}
              <span className="text-sm font-medium">{selectedStudent.name}</span>
              <span className="text-xs text-muted-foreground">{selectedStudent.grade}</span>
            </div>
            <p className="text-sm text-muted-foreground">어떤 수업의 보강인가요? (이번 달 출석 현황)</p>
            {monthlyAttendance.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                이번 달 출석 기록이 없습니다
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-1">
                {monthlyAttendance.map((att) => {
                  const d = new Date(att.date)
                  const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`
                  const weekdayLabel = WEEKDAY_KR[d.getDay()]
                  const isAbsent = att.status === "결석"
                  const isPresent = att.status === "출석"
                  const isPending = att.status === "예정"

                  return (
                    <div
                      key={att.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded border transition-colors ${
                        isAbsent
                          ? "border-red-200 bg-red-50/50 cursor-pointer hover:bg-red-50 hover:border-red-300"
                          : isPresent
                          ? "border-gray-100 bg-gray-50/50 opacity-50 cursor-not-allowed"
                          : "border-gray-200 bg-white opacity-60 cursor-not-allowed"
                      }`}
                      onClick={isAbsent ? () => handleSelectSourceAttendance(att) : undefined}
                    >
                      <div className={`flex items-center justify-center w-12 h-8 rounded-md text-xs font-semibold ${
                        isAbsent ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {dayLabel}({weekdayLabel})
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{att.time}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-sm">{att.group_type}</span>
                      </div>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        isAbsent
                          ? "bg-red-100 text-red-700"
                          : isPresent
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {att.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 체험 학생 등록 폼 */}
        {step === "trial-form" && (
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="trial-name">이름 *</Label>
              <Input
                id="trial-name"
                value={trialName}
                onChange={(e) => setTrialName(e.target.value)}
                placeholder="학생 이름"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trial-phone">전화번호</Label>
              <Input
                id="trial-phone"
                value={trialPhone}
                onChange={(e) => setTrialPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="trial-grade">학년</Label>
                <Input
                  id="trial-grade"
                  value={trialGrade}
                  onChange={(e) => setTrialGrade(e.target.value)}
                  placeholder="예: 초3"
                />
              </div>
              <div className="grid gap-2">
                <Label>성별</Label>
                <Select value={trialGender} onValueChange={(v) => setTrialGender(v as Gender)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="남">남</SelectItem>
                    <SelectItem value="여">여</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>취소</Button>
              <Button onClick={handleConfirmTrial} disabled={!trialName.trim()}>등록</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
