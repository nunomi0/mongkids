import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

// Mock 데이터
const allStudents = [
  {
    id: 1,
    name: "김민지",
    birthDate: "2015-03-15",
    phone: "010-1234-5678",
    courseInfo: "주 2회 키즈",
    level: "RED",
    memo: ""
  },
  {
    id: 2,
    name: "박서연",
    birthDate: "2014-07-22",
    phone: "010-2345-6789",
    courseInfo: "주 1회 키즈",
    level: "WHITE",
    memo: ""
  },
  {
    id: 3,
    name: "최수빈",
    birthDate: "2008-11-03",
    phone: "010-3456-7890",
    courseInfo: "주 3회 청소년",
    level: "BLACK",
    memo: ""
  },
  {
    id: 4,
    name: "정하영",
    birthDate: "2009-05-18",
    phone: "010-4567-8901",
    courseInfo: "주 2회 청소년",
    level: "YELLOW",
    memo: ""
  },
  {
    id: 5,
    name: "김도현",
    birthDate: "2006-09-12",
    phone: "010-5678-9012",
    courseInfo: "주 1회 스페셜",
    level: "BLUE",
    memo: "경험이 많음"
  },
  {
    id: 6,
    name: "김도현",
    birthDate: "2006-09-12",
    phone: "010-5678-9012",
    courseInfo: "주 1회 스페셜",
    level: "GREEN",
    memo: ""
  }
]

export default function StudentManagement() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1>학생 관리</h1>
        <p className="text-muted-foreground">학생 정보를 관리합니다.</p>
      </div>

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
                  <TableHead>레벨</TableHead>
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
    </div>
  )
}