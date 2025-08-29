import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Checkbox } from "./ui/checkbox"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { startOfWeek, endOfWeek, startOfMonth } from "date-fns"

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
  { id: 11, name: "박재현", grade: "고2", level: "BLACK" },
  { id: 12, name: "김아기", grade: "6세", level: "NONE" }
]

// 전체 수업 시간표 데이터 (요일별) - 한 시간에 여러 수업 가능
const weeklySchedule = {
  monday: [
    { time: "15:00-15:50", classType: "키즈", students: [1, 2, 7] },
    { time: "16:00-16:50", classType: "키즈", students: [6, 8, 9] },
    { time: "17:00-17:50", classType: "청소년", students: [3, 4] },
    { time: "18:00-18:50", classType: "청소년", students: [5, 11] },
    { time: "19:00-19:50", classType: "성인", students: [] }
  ],
  tuesday: [
    { time: "15:00-15:50", classType: "키즈", students: [1, 7, 10] },
    { time: "16:00-16:50", classType: "키즈", students: [2, 8] },
    { time: "17:00-17:50", classType: "청소년", students: [3, 4, 6] },
    { time: "18:00-18:50", classType: "성인", students: [5] },
    { time: "19:00-19:50", classType: "성인", students: [11] }
  ],
  wednesday: [
    { time: "15:00-15:50", classType: "키즈", students: [2, 9, 10] },
    { time: "16:00-16:50", classType: "청소년", students: [5, 11] },
    { time: "17:00-17:50", classType: "키즈", students: [1, 6, 7, 8] },
    { time: "18:00-18:50", classType: "청소년", students: [3, 4] },
    { time: "19:00-19:50", classType: "성인", students: [] }
  ],
  thursday: [
    { time: "15:00-15:50", classType: "키즈", students: [1, 2, 7] },
    { time: "16:00-16:50", classType: "청소년", students: [3, 4, 6] },
    { time: "17:00-17:50", classType: "키즈", students: [8, 9, 10] },
    { time: "18:00-18:50", classType: "성인", students: [5, 11] },
    { time: "19:00-19:50", classType: "성인", students: [] }
  ],
  friday: [
    { time: "15:00-15:50", classType: "키즈", students: [1, 7, 10] },
    { time: "16:00-16:50", classType: "키즈", students: [2, 6, 8] },
    { time: "17:00-17:50", classType: "청소년", students: [3, 4] },
    { time: "18:00-18:50", classType: "청소년", students: [5, 9] },
    { time: "19:00-19:50", classType: "성인", students: [11] }
  ],
  saturday: [
    { time: "10:00-10:50", classType: "스페셜", students: [12] },
    { time: "10:00-10:50", classType: "키즈", students: [1, 2, 7, 10] },
    { time: "11:00-11:50", classType: "스페셜", students: [12] },
    { time: "11:00-11:50", classType: "키즈", students: [6, 8, 9] },
    { time: "12:00-12:50", classType: "스페셜", students: [12] },
    { time: "12:00-12:50", classType: "청소년", students: [3, 4] },
    { time: "13:00-13:50", classType: "청소년", students: [5, 11] },
    { time: "14:00-14:50", classType: "스페셜", students: [12] },
    { time: "14:00-14:50", classType: "키즈", students: [1, 2, 6, 7, 8] },
    { time: "15:00-15:50", classType: "청소년", students: [3, 4, 9] },
    { time: "16:00-16:50", classType: "체험", students: [] },
    { time: "17:00-17:50", classType: "성인", students: [5, 11] }
  ],
  sunday: [
    { time: "10:00-10:50", classType: "스페셜", students: [12] },
    { time: "10:00-10:50", classType: "키즈", students: [1, 2, 7] },
    { time: "11:00-11:50", classType: "스페셜", students: [12] },
    { time: "11:00-11:50", classType: "키즈", students: [6, 8, 9, 10] },
    { time: "12:00-12:50", classType: "스페셜", students: [12] },
    { time: "12:00-12:50", classType: "청소년", students: [3, 4] },
    { time: "13:00-13:50", classType: "청소년", students: [5, 11] },
    { time: "14:00-14:50", classType: "스페셜", students: [12] },
    { time: "14:00-14:50", classType: "체험", students: [1] },
    { time: "14:00-14:50", classType: "키즈", students: [1, 2, 6, 7, 8] },
    { time: "14:00-14:50", classType: "청소년", students: [3, 4, 9] },
    { time: "15:00-15:50", classType: "청소년", students: [3, 4, 9] },
    { time: "16:00-16:50", classType: "체험", students: [] },
    { time: "17:00-17:50", classType: "성인", students: [5, 11] }
  ]
}

const dayNames = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export default function ClassManagement() {
  const [activeTab, setActiveTab] = useState("ongoing")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedWeek, setSelectedWeek] = useState<{start: Date, end: Date}>({
    start: new Date(),
    end: new Date()
  })
  const [scheduleWeek, setScheduleWeek] = useState<{start: Date, end: Date}>({
    start: new Date(),
    end: new Date()
  })
  const [weeklyScheduleData, setWeeklyScheduleData] = useState(weeklySchedule)
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false)
  const [selectedClassInfo, setSelectedClassInfo] = useState<{
    day: string
    time: string
    classType: string
  } | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [attendance, setAttendance] = useState<{[key: string]: {[studentId: number]: boolean}}>({})

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
    
    // 현재 주차 설정
    const weekRange = getWeekRange(currentTime)
    setSelectedWeek(weekRange)
    setScheduleWeek(weekRange)
    setSelectedDate(currentTime)
  }, [currentTime])

  // 학년 우선순위 (높은 숫자가 높은 우선순위)
  const getGradePriority = (grade: string) => {
    if (grade.includes('6세')) return 1
    if (grade.includes('초1')) return 2
    if (grade.includes('초2')) return 3
    if (grade.includes('초3')) return 4
    if (grade.includes('초4')) return 5
    if (grade.includes('초5')) return 6
    if (grade.includes('초6')) return 7
    if (grade.includes('중1')) return 8
    if (grade.includes('중2')) return 9
    if (grade.includes('중3')) return 10
    if (grade.includes('고1')) return 11
    if (grade.includes('고2')) return 12
    if (grade.includes('고3')) return 13
    return 999
  }

  // 레벨 우선순위 (높은 숫자가 높은 우선순위)
  const getLevelPriority = (level: string) => {
    switch (level) {
      case "NONE": return 1
      case "WHITE": return 2
      case "YELLOW": return 3
      case "GREEN": return 4
      case "BLUE": return 5
      case "RED": return 6
      case "BLACK": return 7
      case "GOLD": return 8
      default: return 999
    }
  }

  // 주의 시작일과 끝일 계산
  const getWeekRange = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 }) // 월요일부터 시작
    const end = endOfWeek(date, { weekStartsOn: 1 }) // 일요일까지
    
    return { start, end }
  }

  // 해당 날짜의 (해당 달 기준) 주차 계산 - 월요일 시작
  const getWeekOfMonth = (date: Date) => {
    const firstOfMonth = startOfMonth(date)
    const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn: 1 })
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 })
    const diffMs = currentWeekStart.getTime() - firstWeekStart.getTime()
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
    return week
  }

  // 월과 주차 표시 (교차 월 처리: 7월 4주차 / 8월 1주차 (7/29~8/4))
  const getMonthAndWeekDisplay = (date: Date) => {
    const weekRange = getWeekRange(date)
    const startMonth = weekRange.start.getMonth() + 1
    const endMonth = weekRange.end.getMonth() + 1
    const startDay = weekRange.start.getDate()
    const endDay = weekRange.end.getDate()

    if (startMonth !== endMonth) {
      const startWeek = getWeekOfMonth(weekRange.start)
      const endWeek = getWeekOfMonth(weekRange.end)
      return `${startMonth}월 ${startWeek}주차 / ${endMonth}월 ${endWeek}주차 (${startMonth}/${startDay}~${endMonth}/${endDay})`
    }

    const weekInMonth = getWeekOfMonth(date)
    return `${startMonth}월 ${weekInMonth}주차 (${startMonth}/${startDay}~${endMonth}/${endDay})`
  }

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
    
    // 중복된 시간 제거
    const uniqueTimes = [...new Set(daySchedule.map(classItem => classItem.time))]
    return uniqueTimes.sort()
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
          <TabsTrigger value="ongoing">일별 수업</TabsTrigger>
          <TabsTrigger value="schedule">전체 수업 시간표</TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 달력 섹션 */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    날짜 선택
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        // 선택된 날짜의 요일로 자동 설정
                        const dayOfWeek = date.getDay()
                        const dayKey = dayKeys[dayOfWeek === 0 ? 6 : dayOfWeek - 1]
                        setSelectedDay(dayKey)
                        setSelectedDate(date)
                        
                        // 해당 주차 하이라이팅을 위한 주차 범위 설정
                        const weekRange = getWeekRange(date)
                        setSelectedWeek(weekRange)
                      }
                    }}
                    numberOfMonths={1}
                    defaultMonth={selectedDate}
                    weekStartsOn={1}
                    className="rounded-md border"
                    modifiers={{
                      // 선택된 주차만 하이라이트
                      selected: (date) => {
                        return date >= selectedWeek.start && date <= selectedWeek.end
                      },
                      // 호버 효과 - 마우스가 올라간 날짜의 주차만 하이라이트
                      hover: (date) => {
                        const hoverWeekStart = startOfWeek(date, { weekStartsOn: 1 })
                        const hoverWeekEnd = endOfWeek(date, { weekStartsOn: 1 })
                        return date >= hoverWeekStart && date <= hoverWeekEnd
                      }
                    }}
                    modifiersStyles={{
                      selected: {
                        backgroundColor: 'hsl(var(--primary))',
                        color: 'hsl(var(--primary-foreground))',
                        fontWeight: 'bold'
                      },
                      hover: {
                        backgroundColor: 'hsl(var(--accent))',
                        color: 'hsl(var(--accent-foreground))',
                        cursor: 'pointer'
                      }
                    }}
                  />
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm font-medium text-primary">선택된 날짜:</p>
                    <p className="text-sm font-semibold text-primary mt-1">
                      {selectedDate && format(selectedDate, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getMonthAndWeekDisplay(selectedDate)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 수업 목록 섹션 */}
            <div className="lg:col-span-2">
              <div className="flex gap-4 mb-4">
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
                          <span>{classItem.classType}</span>
                          <Badge variant="outline">{classItem.students.length}명</Badge>
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>전체 수업 시간표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <CalendarIcon className="h-4 w-4" /> 주차 선택
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Calendar
                      mode="single"
                      selected={scheduleWeek.start}
                      onSelect={(date) => {
                        if (date) {
                          const weekRange = getWeekRange(date)
                          setScheduleWeek(weekRange)
                        }
                      }}
                      numberOfMonths={1}
                      defaultMonth={scheduleWeek.start}
                      weekStartsOn={1}
                      className="rounded-md border"
                      modifiers={{
                        selected: (date) => {
                          return date >= scheduleWeek.start && date <= scheduleWeek.end
                        },
                        hover: (date) => {
                          const hoverWeekStart = startOfWeek(date, { weekStartsOn: 1 })
                          const hoverWeekEnd = endOfWeek(date, { weekStartsOn: 1 })
                          return date >= hoverWeekStart && date <= hoverWeekEnd
                        }
                      }}
                      modifiersStyles={{
                        selected: {
                          backgroundColor: 'hsl(var(--primary))',
                          color: 'hsl(var(--primary-foreground))',
                          fontWeight: 'bold'
                        },
                        hover: {
                          backgroundColor: 'hsl(var(--accent))',
                          color: 'hsl(var(--accent-foreground))',
                          cursor: 'pointer'
                        }
                      }}
                    />
                  </div>
                  <div className="p-3 bg-primary/5 border rounded-md h-fit">
                    <div className="text-sm text-primary font-semibold mb-1">선택된 주차</div>
                    <div className="text-sm">{getMonthAndWeekDisplay(scheduleWeek.start)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {scheduleWeek.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ~ {scheduleWeek.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
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
                          const classItems = daySchedule.filter(cls => cls.time === timeSlot)
                          // 스페셜과 체험 클래스를 맨 아래로 정렬
                          const sortedClassItems = classItems.sort((a, b) => {
                            if ((a.classType === '스페셜' || a.classType === '체험') && 
                                (b.classType !== '스페셜' && b.classType !== '체험')) return 1
                            if ((a.classType !== '스페셜' && a.classType !== '체험') && 
                                (b.classType === '스페셜' || b.classType === '체험')) return -1
                            return 0
                          })
                          
                          return (
                            <TableCell key={dayKey} className="p-2">
                              {sortedClassItems.length > 0 ? (
                                <div className="space-y-2">
                                  {sortedClassItems.map((classItem, index) => (
                                    <div key={index} className="p-2 rounded-lg border bg-card">
                                      <div className="space-y-1">
                                        <div className="font-medium text-sm flex items-center gap-2">
                                          {classItem.classType}
                                          <Badge variant="outline" className="text-xs">
                                            {classItem.students.length}명
                                          </Badge>
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
                                                      width: '12px',
                                                      height: '12px',
                                                      borderRadius: '2px',
                                                      display: 'inline-block'
                                                    }}
                                                  />
                                                </div>
                                              ) : null
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
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