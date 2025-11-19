import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const columns = [
  { key: "name", label: "이름" },
  { key: "gender", label: "성별" },
  { key: "grade", label: "학년" },
  { key: "level", label: "레벨" },
  { key: "className", label: "등록반" },
  { key: "classTime", label: "수업 시간" },
  { key: "phone", label: "전화번호" },
  { key: "lastPayment", label: "최근 결제" },
  { key: "paymentAmount", label: "결제금액" },
  { key: "status", label: "상태" },
]

export default function StudentsTable({ students }) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-full table-fixed">
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {students.map((s) => (
            <TableRow key={s.id}>
              {columns.map((col) => (
                <TableCell key={col.key}>{s[col.key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}