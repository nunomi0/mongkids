import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Plus } from "lucide-react"
import { supabase } from "../lib/supabase"
type TrialStudent = {
  id: number
  name: string
  gender: '남' | '여'
  birth_date: string
  phone: string
  registration_date: string
  class_type_id: number | null
  is_active?: boolean
}

export default function TrialManagement() {
  const [trialStudents, setTrialStudents] = useState<TrialStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTrialStudent, setNewTrialStudent] = useState({
    name: "",
    gender: "남" as "남" | "여",
    birth_date: "",
    phone: "",
    registration_date: new Date().toISOString().split('T')[0],
    is_active: true
  })

  useEffect(() => {
    loadTrialStudents()
  }, [])

  const loadTrialStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('id, name, gender, birth_date, phone, registration_date, class_type_id, is_active')
        .order('created_at', { ascending: false })
      if (error) throw error
      const studentsData = (data as TrialStudent[]) || []
      // 체험 학생은 class_type_id가 null인 학생들로 가정
      const trialData = studentsData.filter(s => !s.class_type_id)
      setTrialStudents(trialData)
    } catch (error) {
      console.error('체험 학생 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTrialStudent = async () => {
    if (!newTrialStudent.name || !newTrialStudent.birth_date || !newTrialStudent.phone) return

    try {
      const studentData = {
        ...newTrialStudent,
        shoe_size: null,
        class_type_id: null, // 체험 학생은 등록반이 없음
        current_level: null // 체험 학생은 레벨이 없음
      }

      const { error } = await supabase.from('students').insert(studentData as any)
      if (error) throw error
      setIsAddOpen(false)
      setNewTrialStudent({
        name: "",
        gender: "남",
        birth_date: "",
        phone: "",
        registration_date: new Date().toISOString().split('T')[0],
        is_active: true
      })
      loadTrialStudents()
    } catch (error) {
      console.error('체험 학생 등록 실패:', error)
    }
  }

  const getAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>체험 관리</h1>
        <p className="text-muted-foreground">체험 수업 신청자들을 관리합니다.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
                  <Input 
                    id="trial-name" 
                    value={newTrialStudent.name}
                    onChange={(e) => setNewTrialStudent({...newTrialStudent, name: e.target.value})}
                    placeholder="이름을 입력하세요" 
                  />
                </div>
                <div>
                  <Label htmlFor="trial-gender">성별</Label>
                  <select 
                    value={newTrialStudent.gender}
                    onChange={(e) => setNewTrialStudent({...newTrialStudent, gender: e.target.value as "남" | "여"})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="trial-birth">생년월일</Label>
                  <Input 
                    id="trial-birth" 
                    type="date"
                    value={newTrialStudent.birth_date}
                    onChange={(e) => setNewTrialStudent({...newTrialStudent, birth_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="trial-phone">전화번호</Label>
                  <Input 
                    id="trial-phone" 
                    value={newTrialStudent.phone}
                    onChange={(e) => setNewTrialStudent({...newTrialStudent, phone: e.target.value})}
                    placeholder="전화번호를 입력하세요" 
                  />
                </div>
                <div>
                  <Label htmlFor="trial-date">체험일</Label>
                  <Input 
                    id="trial-date" 
                    type="date"
                    value={newTrialStudent.registration_date}
                    onChange={(e) => setNewTrialStudent({...newTrialStudent, registration_date: e.target.value})}
                  />
                </div>
                <Button onClick={addTrialStudent} disabled={!newTrialStudent.name || !newTrialStudent.birth_date || !newTrialStudent.phone} className="w-full">등록</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>체험자 목록 ({trialStudents.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>성별</TableHead>
                    <TableHead>나이</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>체험일</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : trialStudents.length > 0 ? (
                    trialStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>{getAge(student.birth_date)}세</TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>{student.registration_date}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={student.is_active ? "default" : "secondary"}
                          >
                            {student.is_active ? "활성" : "비활성"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        체험 신청자가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
