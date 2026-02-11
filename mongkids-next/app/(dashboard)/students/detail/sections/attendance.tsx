"use client"

import { useState, useCallback } from "react"
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

type AttendanceItem = {
  id: number
  date: string
  time: string
  type: string
  status: string
  note: string
}

export default function AttendanceSection() {
  const months = ["2024-12", "2024-11", "2024-10"]

  const STATUS_OPTIONS = ["예정", "출석", "결석"]

  const [attendance, setAttendance] = useState<AttendanceItem[]>([
    { id: 1, date: "2024-12-01", time: "17:00", type: "정규", status: "출석", note: "" },
    { id: 2, date: "2024-12-03", time: "17:00", type: "정규", status: "결석", note: "" },
    { id: 3, date: "2024-12-05", time: "16:00", type: "보강", status: "출석", note: "지각" },
  ])

  // 인라인 메모 확장 상태 (열면 닫히지 않음)
  const [expandedMemos, setExpandedMemos] = useState<Set<number>>(new Set())

  const openMemo = useCallback((id: number) => {
    setExpandedMemos((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const changeStatus = (id: number, next: string) => {
    setAttendance((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: next } : item))
    )
  }

  const changeNote = useCallback((id: number, value: string) => {
    setAttendance((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note: value } : item))
    )
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>출석 현황</CardTitle>

        <select className="border rounded px-2 py-1 text-sm">
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
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
              const hasMemo = !!item.note.trim()
              const isExpanded = expandedMemos.has(item.id)

              return (
                <>
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{weekday}</TableCell>
                    <TableCell>{item.time}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(v) => changeStatus(item.id, v)}
                      >
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
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
                        onClick={() => openMemo(item.id)}
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
                          value={item.note}
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
                  기록 없음
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
