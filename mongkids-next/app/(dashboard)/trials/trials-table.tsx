import { memo, useState, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare } from "lucide-react"
import TrialStatusBadge from "@/components/trial-status-badge"
import type { TrialReservation } from "@/types/student"

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"]

function getWeekday(dateStr: string): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "-"
  return WEEKDAY_KR[d.getDay()]
}

const columns = [
  { key: "name", label: "이름", className: "w-20" },
  { key: "gender", label: "성별", className: "w-14" },
  { key: "grade", label: "학년", className: "w-14" },
  { key: "phone", label: "전화번호", className: "w-32 whitespace-nowrap" },
  { key: "trial_date", label: "예약일", className: "w-28" },
  { key: "weekday", label: "요일", className: "w-14" },
  { key: "trial_time", label: "수업 시간", className: "w-20" },
  { key: "status", label: "상태", className: "w-16" },
  { key: "memo", label: "메모", className: "w-[40px]" },
]

function TrialsTable({
  trials,
  onRowClick,
  onNoteChange,
}: {
  trials: TrialReservation[]
  onRowClick: (id: string) => void
  onNoteChange: (id: string, note: string) => void
}) {
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const saved = localStorage.getItem("mongkids:memos:trials")
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const toggleMemo = useCallback((id: string) => {
    setExpandedMemos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem("mongkids:memos:trials", JSON.stringify([...next]))
      return next
    })
  }, [])

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
          {trials.map((t) => {
            const hasMemo = !!t.note.trim()
            const isExpanded = expandedMemos.has(t.id)

            return (
              <>
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
                  <TableCell>{getWeekday(t.trial_date)}</TableCell>
                  <TableCell>{t.trial_time ? t.trial_time.slice(0, 5) : "-"}</TableCell>
                  <TableCell>
                    <TrialStatusBadge status={t.status} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className={`relative p-1 rounded transition-colors ${
                        hasMemo
                          ? "text-blue-500 hover:bg-blue-50"
                          : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleMemo(t.id)
                      }}
                      title="메모"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {hasMemo && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`memo-${t.id}`}>
                    <TableCell colSpan={columns.length} className="py-2 px-4 bg-muted/20">
                      <Textarea
                        value={t.note}
                        onChange={(e) => onNoteChange(t.id, e.target.value)}
                        placeholder="메모를 입력하세요..."
                        className="min-h-[60px] text-xs resize-none bg-white"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </>
            )
          })}

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
