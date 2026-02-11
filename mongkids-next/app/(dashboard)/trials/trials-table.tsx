import { memo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import TrialStatusBadge from "@/components/trial-status-badge"
import type { TrialReservation } from "@/types/student"

const columns = [
  { key: "name", label: "이름", className: "w-20" },
  { key: "gender", label: "성별", className: "w-14" },
  { key: "grade", label: "학년", className: "w-14" },
  { key: "phone", label: "전화번호", className: "w-32 whitespace-nowrap" },
  { key: "trial_date", label: "예약일", className: "w-28" },
  { key: "trial_time", label: "수업 시간", className: "w-20" },
  { key: "status", label: "상태", className: "w-16" },
]

function TrialsTable({ trials, onRowClick }: { trials: TrialReservation[]; onRowClick: (id: number) => void }) {
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
          {trials.map((t) => (
            <TableRow
              key={t.id}
              className="cursor-pointer"
              onClick={() => onRowClick(t.id)}
            >
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>{t.gender || "-"}</TableCell>
              <TableCell>{t.grade || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{t.phone}</TableCell>
              <TableCell>{t.trial_date || "-"}</TableCell>
              <TableCell>{t.trial_time ? t.trial_time.slice(0, 5) : "-"}</TableCell>
              <TableCell>
                <TrialStatusBadge status={t.status} />
              </TableCell>
            </TableRow>
          ))}

          {trials.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-6">
                체험 예약이 없습니다
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default memo(TrialsTable)
