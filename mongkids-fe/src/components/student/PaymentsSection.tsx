import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { PaymentItem, Student } from "../../types/student"

export default function PaymentsSection({ payments, student, onReload }: { payments: PaymentItem[]; student: Student; onReload: () => void }) {
  return (
    <Card className="shrink-0">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">결제 내역</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs p-1">결제일</TableHead>
                  <TableHead className="text-xs p-1">해당월</TableHead>
                  <TableHead className="text-xs p-1">금액</TableHead>
                  <TableHead className="text-xs p-1">결제수단</TableHead>
                  <TableHead className="text-xs p-1">할인</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  let yearMonth = ''
                  if (payment.payment_month) {
                    const [y, m] = payment.payment_month.split('-')
                    yearMonth = `${y}년 ${parseInt(m)}월`
                  } else {
                    const d = new Date(payment.payment_date)
                    yearMonth = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
                  }
                  const methodText = payment.payment_method === 'account' ? '계좌이체' : payment.payment_method === 'card' ? '카드결제' : payment.payment_method === 'voucher' ? '스포츠바우처' : '미지정'
                  const shoe = payment.shoe_discount || 0
                  const sibling = payment.sibling_discount || 0
                  const add = payment.additional_discount || 0
                  const discountSum = shoe + sibling + add
                  const gross = payment.total_amount + discountSum
                  const keywordBadges: string[] = []
                  if (shoe > 0) keywordBadges.push('신발')
                  if (sibling > 0) keywordBadges.push('형제자매')
                  if (add > 0) keywordBadges.push('추가')
                  return (
                    <TableRow key={payment.id} className="text-xs">
                      <TableCell className="py-1 px-1">{payment.payment_date}</TableCell>
                      <TableCell className="py-1 px-1 font-medium text-blue-600">{yearMonth}</TableCell>
                      <TableCell className="py-1 px-1 font-medium">
                        {payment.total_amount.toLocaleString()}원
                      </TableCell>
                      <TableCell className="py-1 px-1">{methodText}</TableCell>
                      <TableCell className="py-1 px-1">
                        {keywordBadges.length === 0 ? (
                          <div className="text-gray-400">-</div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-[11px] text-gray-600">
                              {shoe > 0 && <span>신발 -{shoe.toLocaleString()} </span>}
                              {sibling > 0 && <span>형제자매 -{sibling.toLocaleString()} </span>}
                              {add > 0 && <span>추가 -{add.toLocaleString()}</span>}
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <div className="text-2xl mb-1">📄</div>
            <div className="text-xs">결제 내역이 없습니다.</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


