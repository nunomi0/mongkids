"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { MoreHorizontal } from "lucide-react"

export default function AttendanceSection() {
  const months = ["2024-12", "2024-11", "2024-10"]

  const STATUS_OPTIONS = ["예정", "출석", "결석", "보강"]

  const attendance = [
    { id: 1, date: "2024-12-01", time: "17:00", type: "정규", status: "출석", note: "" },
    { id: 2, date: "2024-12-03", time: "17:00", type: "정규", status: "결석", note: "" },
    { id: 3, date: "2024-12-05", time: "16:00", type: "보강", status: "출석", note: "지각" },
  ]

  const changeStatus = (id: number, next: string) => {
    console.log("상태 변경:", { id, next })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>출석 현황</CardTitle>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            정규 수업 추가
          </Button>

          <select className="border rounded px-2 py-1 text-sm">
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
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
              <TableHead>메모</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {attendance.map((item) => {
              const dateObj = new Date(item.date)
              const weekday = dateObj.toLocaleDateString("ko-KR", { weekday: "short" })

              return (
                <TableRow key={item.id}>
                  {/* 날짜 */}
                  <TableCell>{item.date}</TableCell>

                  {/* 요일 */}
                  <TableCell>{weekday}</TableCell>

                  {/* 시간 */}
                  <TableCell>{item.time}</TableCell>

                  {/* 정규 / 보강 */}
                  <TableCell>{item.type}</TableCell>

                  {/* 출석 상태 드롭다운 */}
                  <TableCell>
                    <Select
                      defaultValue={item.status}
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

                  {/* 메모 */}
                  <TableCell className="flex items-center justify-between">
                    {item.note || "-"}

                    {/* 액션 버튼 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>보강 편성</DropdownMenuItem>
                        <DropdownMenuItem>메모 수정</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
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