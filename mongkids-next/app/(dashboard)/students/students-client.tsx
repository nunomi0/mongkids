"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import StudentsTable from "./students-table"
import StudentDetailModal from "./detail/index"

export default function StudentsClient({ students }: { students: any[] }) {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(query.toLowerCase()) ||
    s.phone?.includes(query)
  )

  return (
    <>
      <div className="w-full space-y-4">
        <Input
          placeholder="이름 / 전화번호 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

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
    </>
  )
}