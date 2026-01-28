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
import type { Payment } from "@/types/student"

type Props = {
  payments: Payment[]
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
}

function formatMonth(value: string) {
  if (!value) return ""
  const [year, month] = value.split("-")
  return `${year}년 ${parseInt(month)}월`
}

function formatCurrency(value: number) {
  return value.toLocaleString("ko-KR") + "원"
}

export default function PaymentsSection({ payments, onEdit, onDelete }: Props) {
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
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.payment_date}</TableCell>
                <TableCell>{formatMonth(p.target_month)}</TableCell>
                <TableCell>{formatCurrency(p.amount)}</TableCell>
                <TableCell>{p.method}</TableCell>

                <TableCell>
                  {p.discounts.length > 0 ? (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {p.discounts.map((d, i) => (
                        <li key={i}>{d.type} -{formatCurrency(d.amount)}</li>
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
                      <DropdownMenuItem onClick={() => onEdit(p)}>
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(p)}
                        className="text-red-600"
                      >
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
