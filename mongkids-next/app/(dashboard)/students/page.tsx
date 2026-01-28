import StudentsClient from "./students-client"

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { query?: string }
}) {
  const searchQuery = searchParams.query || ""

  const students = [
    { id: 1, name: "민지", grade: 5, phone: "010-1111-2222", status: "재원" },
    { id: 2, name: "서연", grade: 3, phone: "010-3333-4444", status: "휴원" },
    { id: 3, name: "서연", grade: 3, phone: "010-3333-4444", status: "휴원" },
    { id: 4, name: "서연", grade: 3, phone: "010-3333-4444", status: "휴원" },
    { id: 5, name: "서연", grade: 3, phone: "010-3333-4444", status: "휴원" },
    { id: 6, name: "서연", grade: 3, phone: "010-3333-4444", status: "휴원" },
  ]

  return (
    <div className="p-6">
      <StudentsClient students={students} initialQuery={searchQuery} />
    </div>
  )
}