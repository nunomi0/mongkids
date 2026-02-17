"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { MessageSquare } from "lucide-react"
import {
  fetchStudentAttendance,
  updateAttendanceStatus,
  updateAttendanceMemo,
} from "@/lib/queries"
import type { AttendanceStatus } from "@/types/student"

type AttendanceItem = {
  id: string
  date: string
  time: string
  group_type: string
  status: AttendanceStatus
  memo: string
}

function getMonthOptions(): string[] {
  const now = new Date()
  const months: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    months.push(`${y}-${m}`)
  }
  return months
}

export default function AttendanceSection({ studentId }: { studentId: string }) {
  const months = useMemo(() => getMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [attendance, setAttendance] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(false)

  const STATUS_OPTIONS: AttendanceStatus[] = ["예정", "출석", "결석"]

  useEffect(() => {
    if (!studentId || !selectedMonth) return
    setLoading(true)
    fetchStudentAttendance(studentId, selectedMonth).then((data) => {
      setAttendance(data)
      setLoading(false)
    })
  }, [studentId, selectedMonth])

  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const saved = localStorage.getItem("mongkids:memos:attendance")
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
      localStorage.setItem("mongkids:memos:attendance", JSON.stringify([...next]))
      return next
    })
  }, [])

  const changeStatus = async (id: string, next: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: next } : item))
    )
    await updateAttendanceStatus(id, next)
  }

  const changeNote = useCallback(async (id: string, value: string) => {
    setAttendance((prev) =>
      prev.map((item) => (item.id === id ? { ...item, memo: value } : item))
    )
    await updateAttendanceMemo(id, value)
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>출석 현황</CardTitle>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>요일</TableHead>
              <TableHead>시간</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-[40px]">메모</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {attendance.map((item) => {
              const dateObj = new Date(item.date)
              const weekday = dateObj.toLocaleDateString("ko-KR", { weekday: "short" })
              const hasMemo = !!item.memo.trim()
              const isExpanded = expandedMemos.has(item.id)

              return (
                <>
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{weekday}</TableCell>
                    <TableCell>{item.time}</TableCell>
                    <TableCell>{item.group_type}</TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(v) => changeStatus(item.id, v as AttendanceStatus)}
                      >
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className={`relative p-1 rounded transition-colors ${
                          hasMemo
                            ? "text-blue-500 hover:bg-blue-50"
                            : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
                        }`}
                        onClick={() => toggleMemo(item.id)}
                        title="수업 메모"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {hasMemo && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`memo-${item.id}`}>
                      <TableCell colSpan={6} className="py-2 px-4 bg-muted/20">
                        <Textarea
                          value={item.memo}
                          onChange={(e) => changeNote(item.id, e.target.value)}
                          placeholder="수업 메모를 입력하세요..."
                          className="min-h-[60px] text-xs resize-none bg-white"
                          rows={2}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}

            {attendance.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  {loading ? "불러오는 중..." : "기록 없음"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
