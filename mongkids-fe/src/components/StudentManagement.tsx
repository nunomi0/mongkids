import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Input } from "./ui/input"
import { Search } from "lucide-react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"

// Mock 데이터 (200명 자동 생성)
type Student = {
  id: number
  name: string
  birthDate: string
  phone: string
  courseInfo: string
  level: string
  schedule: string
  memo: string
  payments?: {
    paidMonths: number
    lastPaidAt: string // yyyy-MM-dd
  }
  classes?: string[]
  levelHistory?: { level: string; date: string }[]
}

const LEVELS = [
  "NONE",
  "WHITE",
  "YELLOW",
  "GREEN",
  "BLUE",
  "RED",
  "BLACK",
  "GOLD"
]

const COURSES = ["주 1회 키즈", "주 2회 키즈", "주 1회 청소년", "주 2회 청소년", "주 1회 스페셜", "주 3회 청소년"]
const DAYS = ["월", "화", "수", "목", "금", "토", "일"]
const HOURS = ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19"]

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

const generateStudent = (i: number): Student => {
  const year = 2005 + (i % 12) // 2005~2016
  const month = 1 + (i % 12)
  const day = 1 + (i % 28)
  const name = `학생${pad(i)}`
  const phone = `010-${pad((i * 13) % 10000)}-${pad((i * 37) % 10000)}`
  const level = LEVELS[i % LEVELS.length]
  const courseInfo = COURSES[i % COURSES.length]
  const scheduleCount = 1 + (i % 3) // 주 1~3회
  const slots: string[] = []
  for (let k = 0; k < scheduleCount; k++) {
    const d = DAYS[(i + k) % DAYS.length]
    const h = HOURS[(i * (k + 1)) % HOURS.length]
    slots.push(`${d}${h}`)
  }
  return {
    id: i,
    name,
    birthDate: `${year}-${pad(month)}-${pad(day)}`,
    phone,
    courseInfo,
    level,
    schedule: slots.join(", "),
    memo: ""
  }
}

const allStudentsSeed: Student[] = Array.from({ length: 200 }, (_, idx) => {
  const base = generateStudent(idx + 1)
  return {
    ...base,
    payments: {
      paidMonths: (idx % 6) + 1,
      lastPaidAt: `${2005 + (idx % 12)}-${pad((idx % 12) + 1)}-${pad((idx % 28) + 1)}`
    },
    classes: [base.courseInfo.replace(/^주 \d회\s*/, "").trim()],
    levelHistory: [
      { level: base.level, date: `${2005 + (idx % 12)}-${pad(((idx + 5) % 12) + 1)}-${pad(((idx + 10) % 28) + 1)}` }
    ]
  }
})

export default function StudentManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [students, setStudents] = useState<Student[]>(allStudentsSeed)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // 신규 학생 폼 상태
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: "",
    birthDate: "",
    phone: "",
    courseInfo: "주 1회 키즈",
    level: "NONE",
    schedule: "",
    memo: ""
  })

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
  const filteredStudents = useMemo(() => students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [students, searchTerm])

  const addStudent = () => {
    if (!newStudent.name || !newStudent.birthDate || !newStudent.phone) return
    const nextId = students.length ? Math.max(...students.map(s => s.id)) + 1 : 1
    const created: Student = {
      id: nextId,
      name: newStudent.name!,
      birthDate: newStudent.birthDate!,
      phone: newStudent.phone!,
      courseInfo: newStudent.courseInfo || "주 1회 키즈",
      level: newStudent.level || "NONE",
      schedule: newStudent.schedule || "",
      memo: newStudent.memo || "",
      payments: { paidMonths: 0, lastPaidAt: "" },
      classes: [],
      levelHistory: [{ level: newStudent.level || "NONE", date: new Date().toISOString().slice(0,10) }]
    }
    setStudents(prev => [created, ...prev])
    setIsAddOpen(false)
    setNewStudent({ name: "", birthDate: "", phone: "", courseInfo: "주 1회 키즈", level: "NONE", schedule: "", memo: "" })
  }

  // ===== 출결(깃헙 잔디) 데모 데이터 및 유틸 =====
  type AttnStatus = 'present' | 'absent' | 'makeup' | 'makeup_done'
  const [attendanceStatus, setAttendanceStatus] = useState<Record<number, Record<string, AttnStatus>>>({})

  const startOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = (d.getDay() + 6) % 7 // 월=0
    d.setDate(d.getDate() - day)
    d.setHours(0,0,0,0)
    return d
  }
  const endOfWeek = (date: Date) => {
    const s = startOfWeek(date)
    const e = new Date(s)
    e.setDate(e.getDate() + 6)
    return e
  }
  const getWeekRangeByIndex = (baseDate: Date, index: number) => {
    const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
    const s0 = startOfWeek(first)
    const start = new Date(s0)
    start.setDate(start.getDate() + index * 7)
    const end = endOfWeek(start)
    return { start, end }
  }
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  // 상세 열릴 때 선택 학생에 데모 출결이 없으면 생성(현재 달)
  useEffect(() => {
    if (!selectedStudent || !isDetailOpen) return
    setAttendanceStatus(prev => {
      if (prev[selectedStudent.id]) return prev
      const now = new Date()
      const month = now.getMonth()
      const base: Record<string, AttnStatus> = {}
      // 데모: 주차별 1-2개 날짜를 상태별로 생성(학생 id 기반 패턴)
      const seeds: AttnStatus[] = ['present','absent','makeup','makeup_done']
      for (let w=0; w<4; w++) {
        const { start, end } = getWeekRangeByIndex(now, w)
        const dayOffset = (selectedStudent.id + w) % 7
        const d1 = new Date(start)
        d1.setDate(d1.getDate() + dayOffset)
        if (d1.getMonth() === month) {
          base[fmt(d1)] = seeds[w]
        }
        const d2 = new Date(start)
        d2.setDate(d2.getDate() + ((selectedStudent.id + w*2) % 7))
        if (d2.getMonth() === month && Math.random() > 0.5) {
          base[fmt(d2)] = 'present'
        }
      }
      return { ...prev, [selectedStudent.id]: base }
    })
  }, [selectedStudent, isDetailOpen])

  const getWeekDatesByStatus = (studentId: number, baseDate: Date, idx: number) => {
    const map = attendanceStatus[studentId] || {}
    const { start, end } = getWeekRangeByIndex(baseDate, idx)
    const isInRange = (d: Date) => d >= start && d <= end && d.getMonth() === baseDate.getMonth()
    const bucket: Record<AttnStatus, string[]> = { present: [], absent: [], makeup: [], makeup_done: [] }
    Object.entries(map).forEach(([k, status]) => {
      const [y,m,d] = k.split('-').map(n=>parseInt(n,10))
      const dt = new Date(y, m-1, d)
      if (isInRange(dt)) {
        const md = `${dt.getMonth()+1}/${dt.getDate()}`
        bucket[status].push(md)
      }
    })
    ;(Object.keys(bucket) as AttnStatus[]).forEach(s => bucket[s].sort((a,b)=>{
      const [am,ad]=a.split('/').map(n=>parseInt(n,10)); const [bm,bd]=b.split('/').map(n=>parseInt(n,10));
      return am===bm? ad-bd : am-bm
    }))
    return bucket
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>학생 관리</h1>
        <p className="text-muted-foreground">학생 정보를 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>전체 학생 목록</CardTitle>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">학생 추가</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>학생 추가</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">이름</label>
                    <Input value={newStudent.name || ''} onChange={(e)=>setNewStudent(s=>({...s, name: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">생년월일 (yyyy-MM-dd)</label>
                    <Input value={newStudent.birthDate || ''} onChange={(e)=>setNewStudent(s=>({...s, birthDate: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">전화번호</label>
                    <Input value={newStudent.phone || ''} onChange={(e)=>setNewStudent(s=>({...s, phone: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">수강정보</label>
                    <Input value={newStudent.courseInfo || ''} onChange={(e)=>setNewStudent(s=>({...s, courseInfo: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">수업일정 (예: 토11, 일14)</label>
                    <Input value={newStudent.schedule || ''} onChange={(e)=>setNewStudent(s=>({...s, schedule: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">레벨</label>
                    <Input value={newStudent.level || ''} onChange={(e)=>setNewStudent(s=>({...s, level: e.target.value.toUpperCase()}))} placeholder="NONE/WHITE/YELLOW/..." />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">메모</label>
                    <Input value={newStudent.memo || ''} onChange={(e)=>setNewStudent(s=>({...s, memo: e.target.value}))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={()=>setIsAddOpen(false)}>취소</Button>
                  <Button onClick={addStudent} disabled={!newStudent.name || !newStudent.birthDate || !newStudent.phone}>추가</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => { setSelectedStudent(student); setIsDetailOpen(true) }}
                    >
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
                      <TableCell className="whitespace-nowrap">{student.memo || "-"}</TableCell>
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

      {/* 학생 상세 다이얼로그 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>학생 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{selectedStudent.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedStudent.birthDate} • {selectedStudent.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedStudent.level}</Badge>
                  <div
                    style={{
                      backgroundColor: selectedStudent.level === 'NONE' ? '#e5e7eb' : selectedStudent.level === 'WHITE' ? '#ffffff' : selectedStudent.level === 'YELLOW' ? '#fde047' : selectedStudent.level === 'GREEN' ? '#86efac' : selectedStudent.level === 'BLUE' ? '#93c5fd' : selectedStudent.level === 'RED' ? '#fca5a5' : selectedStudent.level === 'BLACK' ? '#374151' : selectedStudent.level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                      border: selectedStudent.level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                      width: '14px', height: '14px', borderRadius: '2px', display: 'inline-block'
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">출결 확인</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">이번 달 출결</div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{background:'#22c55e'}} /> 출석
                          <span className="inline-block h-3 w-3 rounded-sm" style={{background:'#ef4444'}} /> 결석
                          <span className="inline-block h-3 w-3 rounded-sm" style={{background:'#eab308'}} /> 보강예정
                          <span className="inline-block h-3 w-3 rounded-sm" style={{background:'#38bdf8'}} /> 보강완료
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {([0,1,2,3] as const).map((idx) => (
                          <div
                            key={idx}
                            className="h-4 w-4 rounded-sm border"
                            style={{
                              backgroundColor: (() => {
                                // 주 단위 대표색: present > absent > makeup_done > makeup > gray
                                const b = getWeekDatesByStatus(selectedStudent.id, new Date(), idx)
                                if (b.present.length) return '#22c55e'
                                if (b.absent.length) return '#ef4444'
                                if (b.makeup_done.length) return '#38bdf8'
                                if (b.makeup.length) return '#eab308'
                                return '#e5e7eb'
                              })(),
                              borderColor: '#d1d5db'
                            }}
                            title={(() => {
                              const b = getWeekDatesByStatus(selectedStudent.id, new Date(), idx)
                              const parts: string[] = []
                              if (b.present.length) parts.push(`출석: ${b.present.join(', ')}`)
                              if (b.absent.length) parts.push(`결석: ${b.absent.join(', ')}`)
                              if (b.makeup.length) parts.push(`보강예정: ${b.makeup.join(', ')}`)
                              if (b.makeup_done.length) parts.push(`보강완료: ${b.makeup_done.join(', ')}`)
                              return parts.length ? parts.join(' | ') : '기록 없음'
                            })()}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">결제 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div>결제 달 수: {selectedStudent.payments?.paidMonths ?? 0}개월</div>
                    <div>최근 결제일: {selectedStudent.payments?.lastPaidAt || '-'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">수강 반</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {selectedStudent.classes?.length ? selectedStudent.classes.join(', ') : '-'}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">레벨 히스토리</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedStudent.levelHistory?.map((lh, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{lh.level}</Badge>
                          <span className="text-muted-foreground">{lh.date}</span>
                        </div>
                      )) || <span className="text-sm text-muted-foreground">-</span>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}