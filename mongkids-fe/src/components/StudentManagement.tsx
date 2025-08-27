import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Input } from "./ui/input"
import { Search } from "lucide-react"

// Mock 데이터
const allStudents = [
  {
    id: 1,
    name: "김민지",
    birthDate: "2015-03-15",
    phone: "010-1234-5678",
    courseInfo: "주 2회 키즈",
    level: "RED",
    schedule: "토11, 일14",
    memo: ""
  },
  {
    id: 2,
    name: "박서연",
    birthDate: "2014-07-22",
    phone: "010-2345-6789",
    courseInfo: "주 1회 키즈",
    level: "WHITE",
    schedule: "토10",
    memo: ""
  },
  {
    id: 3,
    name: "최수빈",
    birthDate: "2008-11-03",
    phone: "010-3456-7890",
    courseInfo: "주 3회 청소년",
    level: "BLACK",
    schedule: "월17, 수17, 금17",
    memo: ""
  },
  {
    id: 4,
    name: "정하영",
    birthDate: "2009-05-18",
    phone: "010-4567-8901",
    courseInfo: "주 2회 청소년",
    level: "YELLOW",
    schedule: "화17, 목17",
    memo: ""
  },
  {
    id: 5,
    name: "김도현",
    birthDate: "2006-09-12",
    phone: "010-5678-9012",
    courseInfo: "주 1회 스페셜",
    level: "BLUE",
    schedule: "토16",
    memo: "경험이 많음"
  },
  {
    id: 6,
    name: "이지원",
    birthDate: "2011-08-25",
    phone: "010-6789-0123",
    courseInfo: "주 2회 키즈",
    level: "GREEN",
    schedule: "토11, 일11",
    memo: ""
  },
  {
    id: 7,
    name: "강예원",
    birthDate: "2016-01-10",
    phone: "010-7890-1234",
    courseInfo: "주 1회 키즈",
    level: "NONE",
    schedule: "토10",
    memo: "신규 등록"
  },
  {
    id: 8,
    name: "윤서아",
    birthDate: "2012-12-05",
    phone: "010-8901-2345",
    courseInfo: "주 2회 청소년",
    level: "GOLD",
    schedule: "월18, 수18",
    memo: "고급자"
  }
]

export default function StudentManagement() {
  const [searchTerm, setSearchTerm] = useState("")

  const getLevelColor = (level: string) => {
    switch (level) {
      case "NONE":
        return "bg-gray-200 text-gray-600"
      case "WHITE":
        return "bg-white text-gray-800 border border-gray-300"
      case "YELLOW":
        return "bg-yellow-400 text-yellow-900"
      case "GREEN":
        return "bg-green-500 text-white"
      case "BLUE":
        return "bg-blue-500 text-white"
      case "RED":
        return "bg-red-500 text-white"
      case "BLACK":
        return "bg-black text-white"
      case "GOLD":
        return "bg-yellow-600 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  // 검색 필터링
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1>학생 관리</h1>
        <p className="text-muted-foreground">학생 정보를 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>전체 학생 목록</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="학생 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            {searchTerm && (
              <span className="text-sm text-muted-foreground">
                {filteredStudents.length}명 검색됨
              </span>
            )}
          </div>
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
                  <TableHead>수업일정</TableHead>
                  <TableHead>레벨</TableHead>
                  <TableHead>메모</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.birthDate}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>{student.courseInfo}</TableCell>
                      <TableCell className="font-mono text-sm">{student.schedule}</TableCell>
                      <TableCell>
                        <div 
                          style={{
                            backgroundColor: 
                              student.level === 'NONE' ? '#e5e7eb' :
                              student.level === 'WHITE' ? '#ffffff' :
                              student.level === 'YELLOW' ? '#fde047' :
                              student.level === 'GREEN' ? '#86efac' :
                              student.level === 'BLUE' ? '#93c5fd' :
                              student.level === 'RED' ? '#fca5a5' :
                              student.level === 'BLACK' ? '#374151' :
                              student.level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                            border: student.level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                            width: '20px',
                            height: '20px',
                            borderRadius: '3px',
                            display: 'inline-block'
                          }}
                        />
                      </TableCell>
                      <TableCell>{student.memo || "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {searchTerm ? "검색 결과가 없습니다." : "학생이 없습니다."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}