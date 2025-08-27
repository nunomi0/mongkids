import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Plus, AlertTriangle } from "lucide-react"

// Mock 데이터
const paymentData = [
  {
    id: 1,
    name: "김민지",
    courseInfo: "주 2회 키즈",
    amount: 120000,
    paymentDate: "2024-08-05",
    status: "완료"
  },
  {
    id: 2,
    name: "박서연",
    courseInfo: "주 1회 키즈",
    amount: 80000,
    paymentDate: "2024-08-03",
    status: "완료"
  },
  {
    id: 3,
    name: "최수빈",
    courseInfo: "주 3회 청소년",
    amount: 180000,
    paymentDate: "2024-07-28",
    status: "미납"
  },
  {
    id: 4,
    name: "정하영",
    courseInfo: "주 2회 청소년",
    amount: 140000,
    paymentDate: "2024-08-01",
    status: "완료"
  },
  {
    id: 5,
    name: "김도현",
    courseInfo: "주 1회 스페셜",
    amount: 100000,
    paymentDate: "2024-07-25",
    status: "미납"
  }
]

export default function PaymentManagement() {
  const [selectedMonth, setSelectedMonth] = useState("2024-08")

  const filteredPayments = paymentData.filter(payment => {
    const paymentMonth = payment.paymentDate.substring(0, 7)
    return paymentMonth === selectedMonth || 
           (payment.status === "미납" && paymentMonth < selectedMonth)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1>결제 관리</h1>
        <p className="text-muted-foreground">학생들의 결제 현황을 관리합니다.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="월 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-08">2024년 8월</SelectItem>
              <SelectItem value="2024-07">2024년 7월</SelectItem>
              <SelectItem value="2024-06">2024년 6월</SelectItem>
            </SelectContent>
          </Select>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                결제 정보 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>결제 정보 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="student-name">학생 이름</Label>
                  <Input id="student-name" placeholder="학생 이름을 입력하세요" />
                </div>
                <div>
                  <Label htmlFor="amount">결제 금액</Label>
                  <Input id="amount" type="number" placeholder="금액을 입력하세요" />
                </div>
                <div>
                  <Label htmlFor="payment-date">결제일</Label>
                  <Input id="payment-date" type="date" />
                </div>
                <Button className="w-full">추가</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedMonth} 결제 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>수강정보</TableHead>
                    <TableHead>결제금액</TableHead>
                    <TableHead>결제일</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.status === "미납" && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          {payment.name}
                        </div>
                      </TableCell>
                      <TableCell>{payment.courseInfo}</TableCell>
                      <TableCell>{payment.amount.toLocaleString()}원</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={payment.status === "완료" ? "default" : "destructive"}
                        >
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
