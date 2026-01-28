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
import type { ClassType, StudentFormData, StudentSchedule, StudentStatus } from "@/types/student"

// 임시 더미 데이터 - 나중에 Supabase에서 가져올 예정
const DUMMY_CLASS_TYPES: ClassType[] = [
  { id: 1, category: "성인 주 2회", sessions_per_week: 2 },
  { id: 2, category: "성인 주 3회", sessions_per_week: 3 },
  { id: 3, category: "어린이 주 2회", sessions_per_week: 2 },
  { id: 4, category: "어린이 주 3회", sessions_per_week: 3 },
  { id: 5, category: "체험", sessions_per_week: 1 },
]

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
  students: any[]
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [students, setStudents] = useState(initialStudents)

  // 필터링 결과 메모이제이션
  const filtered = useMemo(() => {
    return students.filter(s => {
      // 검색어 필터
      const matchesQuery =
        s.name?.toLowerCase().includes(query.toLowerCase()) ||
        s.phone?.includes(query)

      // 상태 필터
      const matchesStatus = statusFilter === "all" || s.status === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [students, query, statusFilter])

  // 콜백 메모이제이션
  const handleRowClick = useCallback((id: number) => {
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

  const handleStudentSaved = useCallback((formData: StudentFormData, schedules: StudentSchedule[]) => {
    const newStudent = {
      id: Date.now(),
      name: formData.name,
      phone: formData.phone,
      status: formData.status,
      birth_date: formData.birth_date,
      gender: formData.gender,
      shoe_size: formData.shoe_size,
      class_type_id: parseInt(formData.class_type_id),
      schedules,
    }
    setStudents((prev) => [newStudent, ...prev])
  }, [])

  // 학생 상태 변경 핸들러
  const handleStudentStatusChange = useCallback((studentId: number, newStatus: StudentStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    )
  }, [])

  const isDetailOpen = selectedId !== null

  // 현재 선택된 학생 정보
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
        classTypes={DUMMY_CLASS_TYPES}
      />
    </>
  )
}
