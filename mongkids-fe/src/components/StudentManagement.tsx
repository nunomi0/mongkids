import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Plus, AlertTriangle } from "lucide-react"

// Mock 데이터
const allStudents = [
  {
    id: 1,
    name: "김민지",
    birthDate: "2015-03-15",
    phone: "010-1234-5678",
    courseInfo: "주 2회 키즈",
    level: "초급",
    memo: "집중력이 좋음"
  },
  {
    id: 2,
    name: "박서연",
    birthDate: "2014-07-22",
    phone: "010-2345-6789",
    courseInfo: "주 1회 키즈",
    level: "초급",
    memo: "활발한 성격"
  },
  {
    id: 3,
    name: "최수빈",
    birthDate: "2008-11-03",
    phone: "010-3456-7890",
    courseInfo: "주 3회 청소년",
    level: "중급",
    memo: "무용에 재능이 있음"
  },
  {
    id: 4,
    name: "정하영",
    birthDate: "2009-05-18",
    phone: "010-4567-8901",
    courseInfo: "주 2회 청소년",
    level: "중급",
    memo: ""
  },
  {
    id: 5,
    name: "김도현",
    birthDate: "2006-09-12",
    phone: "010-5678-9012",
    courseInfo: "주 1회 스페셜",
    level: "고급",
    memo: "경험이 많음"
  }
]

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

const trialStudents = [
  {
    id: 1,
    name: "이서현",
    phone: "010-6789-0123",
    age: 7,
    timeSlot: "토 15:00-16:00",
    registered: false,
    trialDate: "2024-08-20"
  },
  {
    id: 2,
    name: "장민우",
    phone: "010-7890-1234",
    age: 12,
    timeSlot: "수 17:00-18:00",
    registered: true,
    trialDate: "2024-08-15"
  },
  {
    id: 3,
    name: "윤채원",
    phone: "010-8901-2345",
    age: 5,
    timeSlot: "금 16:00-17:00",
    registered: false,
    trialDate: "2024-08-22"
  }
]

export default function StudentManagement() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("2024-08")

  const getLevelColor = (level: string) => {
    switch (level) {
      case "초급":
        return "bg-green-100 text-green-800"
      case "중급":
        return "bg-blue-100 text-blue-800"
      case "고급":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredPayments = paymentData.filter(payment => {
    const paymentMonth = payment.paymentDate.substring(0, 7)
    return paymentMonth === selectedMonth || 
           (payment.status === "미납" && paymentMonth < selectedMonth)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1>학생 관리</h1>
        <p className="text-muted-foreground">학생 정보, 결제, 체험을 관리합니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">전체 학생 관리</TabsTrigger>
          <TabsTrigger value="payment">결제 관리</TabsTrigger>
          <TabsTrigger value="trial">체험 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>전체 학생 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>생년월일</TableHead>
                      <TableHead>전화번호</TableHead>
                      <TableHead>수강정보</TableHead>
                      <TableHead>수준</TableHead>
                      <TableHead>메모</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.birthDate}</TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>{student.courseInfo}</TableCell>
                        <TableCell>
                          <Badge className={getLevelColor(student.level)}>
                            {student.level}
                          </Badge>
                        </TableCell>
                        <TableCell>{student.memo || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="trial" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  체험자 등록
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>체험자 등록</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="trial-name">이름</Label>
                    <Input id="trial-name" placeholder="이름을 입력하세요" />
                  </div>
                  <div>
                    <Label htmlFor="trial-phone">전화번호</Label>
                    <Input id="trial-phone" placeholder="전화번호를 입력하세요" />
                  </div>
                  <div>
                    <Label htmlFor="trial-age">나이</Label>
                    <Input id="trial-age" type="number" placeholder="나이를 입력하세요" />
                  </div>
                  <div>
                    <Label htmlFor="trial-time">체험 시간대</Label>
                    <Input id="trial-time" placeholder="예: 토 15:00-16:00" />
                  </div>
                  <Button className="w-full">등록</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>체험자 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>전화번호</TableHead>
                      <TableHead>나이</TableHead>
                      <TableHead>체험 시간대</TableHead>
                      <TableHead>체험일</TableHead>
                      <TableHead>최종 등록</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>{student.age}세</TableCell>
                        <TableCell>{student.timeSlot}</TableCell>
                        <TableCell>{student.trialDate}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={student.registered ? "default" : "secondary"}
                          >
                            {student.registered ? "등록 완료" : "미등록"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}