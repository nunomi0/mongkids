"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import StudentsTable from "./students-table"
import StudentDetailModal from "./detail/index"
import AddStudentModal from "./add-student-modal"
import type { ClassType, StudentFormData, StudentSchedule } from "@/types/student"

// 임시 더미 데이터 - 나중에 Supabase에서 가져올 예정
const DUMMY_CLASS_TYPES: ClassType[] = [
  { id: 1, category: "성인 주 2회", sessions_per_week: 2 },
  { id: 2, category: "성인 주 3회", sessions_per_week: 3 },
  { id: 3, category: "어린이 주 2회", sessions_per_week: 2 },
  { id: 4, category: "어린이 주 3회", sessions_per_week: 3 },
  { id: 5, category: "체험", sessions_per_week: 1 },
]

export default function StudentsClient({
  students: initialStudents,
  initialQuery = ""
}: {
  students: any[]
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [students, setStudents] = useState(initialStudents)

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(query.toLowerCase()) ||
    s.phone?.includes(query)
  )

  const handleStudentSaved = (formData: StudentFormData, schedules: StudentSchedule[]) => {
    // 임시로 로컬 상태에 추가 (나중에 Supabase 연동 시 수정)
    const newStudent = {
      id: Date.now(), // 임시 ID
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
    console.log("학생 추가됨:", newStudent)
  }

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
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            학생 등록
          </Button>
        </div>

        <StudentsTable
          students={filtered}
          onRowClick={(id) => setSelectedId(id)}
        />
      </div>

      {/* 상세 모달 */}
      <StudentDetailModal
        isOpen={!!selectedId}
        studentId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* 학생 추가 모달 */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={handleStudentSaved}
        classTypes={DUMMY_CLASS_TYPES}
      />
    </>
  )
}