"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import StudentsTable from "./students-table"

export default function StudentsClient({ students }: { students: any[] }) {
  const [query, setQuery] = useState("")

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(query.toLowerCase()) ||
    s.phone?.includes(query)
  )

  return (
    <div className="w-full">
      <Input
        placeholder="이름 / 전화번호 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <StudentsTable students={filtered} />
    </div>
  )
}