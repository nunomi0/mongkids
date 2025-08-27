import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

// Mock 데이터 - 학생 정보 포함
const studentsData = [
  { id: 1, name: "김민지", grade: "초3", level: "RED" },
  { id: 2, name: "박서연", grade: "초2", level: "WHITE" },
  { id: 3, name: "최수빈", grade: "중2", level: "BLACK" },
  { id: 4, name: "정하영", grade: "중1", level: "YELLOW" },
  { id: 5, name: "김도현", grade: "고1", level: "BLUE" },
  { id: 6, name: "이지원", grade: "초4", level: "GREEN" },
  { id: 7, name: "강예원", grade: "초1", level: "RED" },
  { id: 8, name: "윤서아", grade: "초3", level: "WHITE" },
  { id: 9, name: "한지민", grade: "초2", level: "YELLOW" },
  { id: 10, name: "오유진", grade: "초1", level: "RED" },
  { id: 11, name: "박재현", grade: "고2", level: "BLACK" }
]

// 전체 수업 시간표 데이터 (요일별) - 한 시간에 여러 수업 가능
const weeklySchedule = {
  monday: [
    { time: "15:00-15:50", subject: "키즈 클라이밍", students: [1, 2, 7] },
    { time: "16:00-16:50", subject: "키즈 클라이밍", students: [6, 8, 9] },
    { time: "17:00-17:50", subject: "청소년 클라이밍", students: [3, 4] },
    { time: "18:00-18:50", subject: "청소년 클라이밍", students: [5, 11] },
    { time: "19:00-19:50", subject: "성인 클라이밍", students: [] }
  ],
  tuesday: [
    { time: "15:00-15:50", subject: "키즈 클라이밍", students: [1, 7, 10] },
    { time: "16:00-16:50", subject: "키즈 클라이밍", students: [2, 8] },
    { time: "17:00-17:50", subject: "청소년 클라이밍", students: [3, 4, 6] },
    { time: "18:00-18:50", subject: "성인 클라이밍", students: [5] },
    { time: "19:00-19:50", subject: "성인 클라이밍", students: [11] }
  ],
  wednesday: [
    { time: "15:00-15:50", subject: "키즈 클라이밍", students: [2, 9, 10] },
    { time: "16:00-16:50", subject: "청소년 클라이밍", students: [5, 11] },
    { time: "17:00-17:50", subject: "키즈 클라이밍", students: [1, 6, 7, 8] },
    { time: "18:00-18:50", subject: "청소년 클라이밍", students: [3, 4] },
    { time: "19:00-19:50", subject: "성인 클라이밍", students: [] }
  ],
  thursday: [
    { time: "15:00-15:50", subject: "키즈 클라이밍", students: [1, 2, 7] },
    { time: "16:00-16:50", subject: "청소년 클라이밍", students: [3, 4, 6] },
    { time: "17:00-17:50", subject: "키즈 클라이밍", students: [8, 9, 10] },
    { time: "18:00-18:50", subject: "성인 클라이밍", students: [5, 11] },
    { time: "19:00-19:50", subject: "성인 클라이밍", students: [] }
  ],
  friday: [
    { time: "15:00-15:50", subject: "키즈 클라이밍", students: [1, 7, 10] },
    { time: "16:00-16:50", subject: "키즈 클라이밍", students: [2, 6, 8] },
    { time: "17:00-17:50", subject: "청소년 클라이밍", students: [3, 4] },
    { time: "18:00-18:50", subject: "청소년 클라이밍", students: [5, 9] },
    { time: "19:00-19:50", subject: "성인 클라이밍", students: [11] }
  ],
  saturday: [
    { time: "10:00-10:50", subject: "키즈 클라이밍", students: [1, 2, 7, 10] },
    { time: "11:00-11:50", subject: "키즈 클라이밍", students: [6, 8, 9] },
    { time: "12:00-12:50", subject: "청소년 클라이밍", students: [3, 4] },
    { time: "13:00-13:50", subject: "청소년 클라이밍", students: [5, 11] },
    { time: "14:00-14:50", subject: "키즈 클라이밍", students: [1, 2, 6, 7, 8] },
    { time: "15:00-15:50", subject: "청소년 클라이밍", students: [3, 4, 9] },
    { time: "16:00-16:50", subject: "성인 클라이밍", students: [5, 11] },
    { time: "17:00-17:50", subject: "성인 클라이밍", students: [] }
  ],
  sunday: [
    { time: "10:00-10:50", subject: "키즈 클라이밍", students: [1, 2, 7] },
    { time: "11:00-11:50", subject: "키즈 클라이밍", students: [6, 8, 9, 10] },
    { time: "12:00-12:50", subject: "청소년 클라이밍", students: [3, 4] },
    { time: "13:00-13:50", subject: "청소년 클라이밍", students: [5, 11] },
    { time: "14:00-14:50", subject: "키즈 클라이밍", students: [1, 2, 6, 7, 8] },
    { time: "15:00-15:50", subject: "청소년 클라이밍", students: [3, 4, 9] },
    { time: "16:00-16:50", subject: "성인 클라이밍", students: [5, 11] },
    { time: "17:00-17:50", subject: "성인 클라이밍", students: [] }
  ]
}

const dayNames = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export default function ClassManagement() {
  const [activeTab, setActiveTab] = useState("ongoing")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState("")
  const [selectedTime, setSelectedTime] = useState("")

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 1분마다 업데이트

    return () => clearInterval(timer)
  }, [])

  // 초기 선택값 설정 (현재 요일과 시간)
  useEffect(() => {
    const currentDay = currentTime.getDay()
    const currentHour = currentTime.getHours()
    
    // 현재 요일 설정
    const dayKey = dayKeys[currentDay === 0 ? 6 : currentDay - 1]
    setSelectedDay(dayKey)
    
    // 현재 시간대 설정 (15:00-15:50, 16:00-16:50 등)
    const timeSlot = `${currentHour.toString().padStart(2, '0')}:00-${currentHour.toString().padStart(2, '0')}:50`
    setSelectedTime(timeSlot)
  }, [currentTime])

  const getLevelColor = (level: string) => {
    switch (level) {
      case "RED":
        return "bg-red-100 text-red-800"
      case "WHITE":
        return "bg-gray-100 text-gray-800"
      case "YELLOW":
        return "bg-yellow-100 text-yellow-800"
      case "GREEN":
        return "bg-green-100 text-green-800"
      case "BLUE":
        return "bg-blue-100 text-blue-800"
      case "BLACK":
        return "bg-black text-white"
      case "ADVANCED":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // 선택된 요일과 시간의 수업 찾기
  const getSelectedClasses = () => {
    if (!selectedDay || !selectedTime) return []
    
    const daySchedule = weeklySchedule[selectedDay as keyof typeof weeklySchedule]
    if (!daySchedule) return []

    const selectedClasses = daySchedule.filter(classItem => classItem.time === selectedTime)
    
    return selectedClasses.map(classItem => ({
      ...classItem,
      day: dayNames[dayKeys.indexOf(selectedDay)],
      students: classItem.students.map(studentId => 
        studentsData.find(student => student.id === studentId)
      ).filter(Boolean)
    }))
  }

  // 시간대 옵션 생성
  const getTimeOptions = () => {
    const daySchedule = weeklySchedule[selectedDay as keyof typeof weeklySchedule]
    if (!daySchedule) return []
    
    return daySchedule.map(classItem => classItem.time)
  }

  // 전체 시간표용 시간대 목록 생성
  const getAllTimeSlots = () => {
    const allTimes = new Set<string>()
    Object.values(weeklySchedule).forEach(daySchedule => {
      daySchedule.forEach(classItem => {
        allTimes.add(classItem.time)
      })
    })
    return Array.from(allTimes).sort()
  }

  const selectedClasses = getSelectedClasses()
  const timeOptions = getTimeOptions()
  const allTimeSlots = getAllTimeSlots()

  return (
    <div className="space-y-6">
      <div>
        <h1>수업 관리</h1>
        <p className="text-muted-foreground">진행 중인 수업과 전체 시간표를 관리합니다.</p>
        <p className="text-sm text-muted-foreground">
          현재 시간: {currentTime.toLocaleString('ko-KR')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ongoing">진행 중인 수업</TabsTrigger>
          <TabsTrigger value="schedule">전체 수업 시간표</TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="요일" />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((dayName, index) => (
                  <SelectItem key={index} value={dayKeys[index]}>
                    {dayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="시간" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedClasses.map((classItem, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{classItem.subject}</span>
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
                      <div className="space-y-1">
                                                 {classItem.students
                           .filter((student): student is NonNullable<typeof student> => student !== undefined)
                           .map((student) => (
                             <div key={student.id} className="flex items-center justify-between p-2 rounded border">
                               <span>{student.name}</span>
                               <div className="flex gap-2 items-center">
                                 <Badge variant="outline">{student.grade}</Badge>
                                 <div 
                                   className="w-3 h-3 rounded-full"
                                   style={{
                                     backgroundColor: 
                                       student.level === 'RED' ? '#ef4444' :
                                       student.level === 'WHITE' ? '#9ca3af' :
                                       student.level === 'YELLOW' ? '#eab308' :
                                       student.level === 'GREEN' ? '#22c55e' :
                                       student.level === 'BLUE' ? '#3b82f6' :
                                       student.level === 'BLACK' ? '#000000' :
                                       student.level === 'ADVANCED' ? '#a855f7' : '#9ca3af'
                                   }}
                                 />
                               </div>
                             </div>
                           ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">선택한 시간에 진행 중인 수업이 없습니다.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>전체 수업 시간표</CardTitle>
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
                    {allTimeSlots.map((timeSlot) => (
                      <TableRow key={timeSlot}>
                        <TableCell>{timeSlot}</TableCell>
                        {dayKeys.map((dayKey) => {
                          const daySchedule = weeklySchedule[dayKey as keyof typeof weeklySchedule]
                          const classItem = daySchedule.find(cls => cls.time === timeSlot)
                          
                          return (
                            <TableCell key={dayKey} className="p-2">
                              {classItem ? (
                                <div className="p-2 rounded-lg border bg-card">
                                  <div className="space-y-1">
                                    <div className="font-medium">{classItem.subject}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {classItem.students.length}명
                                    </div>
                                                                         {classItem.students.length > 0 && (
                                       <div className="text-xs">
                                         {classItem.students.map(studentId => {
                                           const student = studentsData.find(s => s.id === studentId)
                                           return student ? (
                                             <div key={student.id} className="flex items-center gap-1">
                                               <span>{student.name}</span>
                                               <Badge variant="outline" className="text-xs">
                                                 {student.grade}
                                               </Badge>
                                               <div 
                                                 className={`w-3 h-3 rounded-full ${getLevelColor(student.level).replace('bg-', 'bg-').replace('text-', '')}`}
                                                 style={{
                                                   backgroundColor: 
                                                     student.level === 'RED' ? '#ef4444' :
                                                     student.level === 'WHITE' ? '#9ca3af' :
                                                     student.level === 'YELLOW' ? '#eab308' :
                                                     student.level === 'GREEN' ? '#22c55e' :
                                                     student.level === 'BLUE' ? '#3b82f6' :
                                                     student.level === 'BLACK' ? '#000000' :
                                                     student.level === 'ADVANCED' ? '#a855f7' : '#9ca3af'
                                                 }}
                                               />
                                             </div>
                                           ) : null
                                         })}
                                       </div>
                                     )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-sm">-</div>
                              )}
                            </TableCell>
                          )
                        })}
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