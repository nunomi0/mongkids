import { memo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import StatusBadge from "@/components/status-badge"
import type { StudentStatus } from "@/types/student"

const columns = [
  { key: "name", label: "이름", className: "w-20" },
  { key: "gender", label: "성별", className: "w-14" },
  { key: "grade", label: "학년", className: "w-14" },
  { key: "level", label: "레벨", className: "w-16" },
  { key: "className", label: "등록반", className: "" },
  { key: "classTime", label: "수업 시간", className: "" },
  { key: "phone", label: "전화번호", className: "w-32 whitespace-nowrap" },
  { key: "lastPayment", label: "최근 결제", className: "" },
  { key: "paymentAmount", label: "결제금액", className: "" },
  { key: "status", label: "상태", className: "w-16" },
]

function StudentsTable({ students, onRowClick }: { students: any[], onRowClick: (id: number) => void }) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-full">
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {students.map((s) => (
            <TableRow
              key={s.id}
              className="cursor-pointer"
              onClick={() => onRowClick(s.id)}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={col.key === "phone" ? "whitespace-nowrap" : col.key === "name" ? "font-medium" : ""}
                >
                  {col.key === "status" && s.status ? (
                    <StatusBadge status={s.status as StudentStatus} />
                  ) : (
                    s[col.key]
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}

          {students.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-6">
                학생이 없습니다
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default memo(StudentsTable)
