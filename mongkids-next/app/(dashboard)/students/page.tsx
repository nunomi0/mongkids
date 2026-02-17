import StudentsClient from "./students-client"
import { fetchStudentsList } from "@/lib/queries"

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { query?: string }
}) {
  const searchQuery = searchParams.query || ""
  const students = await fetchStudentsList()

  return (
    <div className="p-6">
      <StudentsClient students={students} initialQuery={searchQuery} />
    </div>
  )
}
