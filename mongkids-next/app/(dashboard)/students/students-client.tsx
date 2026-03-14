"use client"

import { useState, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import StudentsTable from "./students-table"
import StudentDetailModal from "./detail/index"
import AddStudentModal from "./add-student-modal"
import { createStudent as createStudentApi, updateStudentStatus } from "@/lib/queries"
import { CATEGORY_OPTIONS } from "@/lib/constants"
import { calculateGrade, formatClassName, formatClassTime } from "@/lib/utils/student"
import type { StudentFormData, StudentSchedule, StudentStatus, StudentListItem } from "@/types/student"

const STATUS_OPTIONS: { value: StudentStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "재원", label: "재원" },
  { value: "휴원", label: "휴원" },
  { value: "퇴원", label: "퇴원" },
  { value: "체험", label: "체험" },
]

export default function StudentsClient({
  students: initialStudents,
  initialQuery = ""
}: {
  students: StudentListItem[]
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [students, setStudents] = useState(initialStudents)

  // 필터링 결과 메모이제이션
  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchesQuery =
        s.name?.toLowerCase().includes(query.toLowerCase()) ||
        s.phone?.includes(query)
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [students, query, statusFilter])

  const handleRowClick = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleDetailClose = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleAddModalOpen = useCallback(() => {
    setIsAddModalOpen(true)
  }, [])

  const handleAddModalClose = useCallback(() => {
    setIsAddModalOpen(false)
  }, [])

  const handleStudentSaved = useCallback(async (formData: StudentFormData, schedules: StudentSchedule[]) => {
    const created = await createStudentApi(formData, schedules)
    if (!created) return false

    const newListItem: StudentListItem = {
      id: created.id,
      name: created.name,
      gender: created.gender,
      grade: calculateGrade(created.birth_date),
      level: created.current_level || '',
      className: formatClassName(created.category, created.sessions_per_week),
      classTime: formatClassTime(created.schedules),
      phone: created.phone,
      lastPayment: '',
      paymentAmount: '',
      status: created.status,
    }
    setStudents((prev) => [newListItem, ...prev])
    return true
  }, [])

  // 학생 상태 변경 핸들러
  const handleStudentStatusChange = useCallback(async (studentId: string, newStatus: StudentStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    )
    await updateStudentStatus(studentId, newStatus)
  }, [])

  const isDetailOpen = selectedId !== null

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedId) || null
  }, [students, selectedId])

  return (
    <>
      <div className="w-full space-y-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder="이름 / 전화번호 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StudentStatus | "all")}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddModalOpen}>
            <Plus className="h-4 w-4 mr-1" />
            학생 등록
          </Button>
        </div>

        <StudentsTable
          students={filtered}
          onRowClick={handleRowClick}
        />
      </div>

      {/* 상세 모달 */}
      <StudentDetailModal
        isOpen={isDetailOpen}
        studentId={selectedId}
        student={selectedStudent}
        onClose={handleDetailClose}
        onStatusChange={handleStudentStatusChange}
      />

      {/* 학생 추가 모달 */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSaved={handleStudentSaved}
      />
    </>
  )
}
