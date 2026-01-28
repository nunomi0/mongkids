"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table"

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

const payments = [
  {
    date: "2025-10-01",
    month: "2025년 10월",
    amount: "155,000원",
    method: "계좌이체",
    discounts: [],
  },
  {
    date: "2025-09-11",
    month: "2025년 9월",
    amount: "0원",
    method: "계좌이체",
    discounts: ["신발 -10,000", "형제자매 -10,000", "추가 -123,123"],
  },
  {
    date: "2025-09-11",
    month: "2025년 9월",
    amount: "856,878원",
    method: "계좌이체",
    discounts: ["신발 -10,000", "형제자매 -10,000", "추가 -123,123"],
  },
  {
    date: "2025-09-08",
    month: "2025년 9월",
    amount: "150,000원",
    method: "카드결제",
    discounts: [],
  },
  {
    date: "2025-08-05",
    month: "2025년 8월",
    amount: "145,000원",
    method: "스포츠바우처",
    discounts: [],
  },
  {
    date: "2025-07-02",
    month: "2025년 7월",
    amount: "140,000원",
    method: "계좌이체",
    discounts: [],
  },
]

export default function PaymentsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>결제 내역</CardTitle>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>결제일</TableHead>
              <TableHead>해당월</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>결제수단</TableHead>
              <TableHead>할인</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {payments.map((p, idx) => (
              <TableRow key={idx}>
                <TableCell>{p.date}</TableCell>
                <TableCell>{p.month}</TableCell>
                <TableCell>{p.amount}</TableCell>
                <TableCell>{p.method}</TableCell>

                <TableCell>
                  {p.discounts.length > 0 ? (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {p.discounts.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-accent rounded-md">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => console.log("수정", p)}>
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log("삭제", p)}>
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>

              </TableRow>
            ))}

            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  결제 기록 없음
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}