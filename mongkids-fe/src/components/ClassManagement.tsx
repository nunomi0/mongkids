import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

// Mock 데이터
const ongoingClasses = [
  {
    id: 1,
    day: "월요일",
    time: "16:00-17:00",
    subject: "키즈 발레",
    students: ["김민지", "박서연", "이지원"],
    level: "초급"
  },
  {
    id: 2,
    day: "월요일",
    time: "17:00-18:00",
    subject: "청소년 현대무용",
    students: ["최수빈", "정하영"],
    level: "중급"
  },
  {
    id: 3,
    day: "화요일",
    time: "15:00-16:00",
    subject: "키즈 발레",
    students: ["강예원", "윤서아", "한지민", "오유진"],
    level: "초급"
  },
  {
    id: 4,
    day: "수요일",
    time: "16:00-17:00",
    subject: "스페셜 클래스",
    students: ["김도현", "박재현"],
    level: "고급"
  }
]

const allSchedule = [
  {
    time: "15:00-16:00",
    monday: [{ subject: "키즈 발레", students: 4, level: "초급" }],
    tuesday: [{ subject: "키즈 발레", students: 4, level: "초급" }],
    wednesday: [],
    thursday: [{ subject: "키즈 발레", students: 3, level: "초급" }],
    friday: [],
    saturday: [{ subject: "키즈 발레", students: 5, level: "초급" }]
  },
  {
    time: "16:00-17:00",
    monday: [{ subject: "키즈 발레", students: 3, level: "초급" }],
    tuesday: [],
    wednesday: [{ subject: "스페셜 클래스", students: 2, level: "고급" }],
    thursday: [{ subject: "청소년 현대무용", students: 4, level: "중급" }],
    friday: [{ subject: "키즈 발레", students: 3, level: "초급" }],
    saturday: [{ subject: "스페셜 클래스", students: 3, level: "고급" }]
  },
  {
    time: "17:00-18:00",
    monday: [{ subject: "청소년 현대무용", students: 2, level: "중급" }],
    tuesday: [{ subject: "청소년 현대무용", students: 3, level: "중급" }],
    wednesday: [{ subject: "키즈 발레", students: 4, level: "초급" }],
    thursday: [],
    friday: [{ subject: "청소년 현대무용", students: 2, level: "중급" }],
    saturday: [{ subject: "스페셜 클래스", students: 4, level: "고급" }]
  },
  {
    time: "18:00-19:00",
    monday: [],
    tuesday: [{ subject: "스페셜 클래스", students: 2, level: "고급" }],
    wednesday: [],
    thursday: [{ subject: "스페셜 클래스", students: 3, level: "고급" }],
    friday: [],
    saturday: [{ subject: "청소년 현대무용", students: 5, level: "중급" }]
  }
]

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
const dayNames = ["월", "화", "수", "목", "금", "토"]

export default function ClassManagement() {
  const [activeTab, setActiveTab] = useState("ongoing")

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

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case "키즈 발레":
        return "bg-pink-100 text-pink-800"
      case "청소년 현대무용":
        return "bg-orange-100 text-orange-800"
      case "스페셜 클래스":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>수업 관리</h1>
        <p className="text-muted-foreground">진행 중인 수업과 전체 시간표를 관리합니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ongoing">진행 중인 수업</TabsTrigger>
          <TabsTrigger value="schedule">전체 수업 시간표</TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ongoingClasses.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{classItem.subject}</span>
                    <Badge className={getLevelColor(classItem.level)}>
                      {classItem.level}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{classItem.day}</span>
                    <span>•</span>
                    <span>{classItem.time}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="mb-2">참여 학생 ({classItem.students.length}명):</p>
                    <div className="flex flex-wrap gap-1">
                      {classItem.students.map((student, index) => (
                        <Badge key={index} variant="outline">
                          {student}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>주간 수업 시간표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">시간</TableHead>
                      {dayNames.map((day) => (
                        <TableHead key={day} className="text-center min-w-32">
                          {day}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSchedule.map((timeSlot, index) => (
                      <TableRow key={index}>
                        <TableCell>{timeSlot.time}</TableCell>
                        {days.map((day) => (
                          <TableCell key={day} className="p-2">
                            <div className="space-y-1">
                              {timeSlot[day as keyof typeof timeSlot] && 
                               Array.isArray(timeSlot[day as keyof typeof timeSlot]) &&
                               (timeSlot[day as keyof typeof timeSlot] as any[]).map((cls, clsIndex) => (
                                <div key={clsIndex} className="p-2 rounded-lg border bg-card">
                                  <div className="space-y-1">
                                    <Badge className={getSubjectColor(cls.subject)} variant="outline">
                                      {cls.subject}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                      {cls.students}명 • {cls.level}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        ))}
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