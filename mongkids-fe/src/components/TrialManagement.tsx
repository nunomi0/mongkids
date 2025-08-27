import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Plus } from "lucide-react"

// Mock 데이터
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

export default function TrialManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1>체험 관리</h1>
        <p className="text-muted-foreground">체험 수업 신청자들을 관리합니다.</p>
      </div>

      <div className="space-y-4">
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
      </div>
    </div>
  )
}
