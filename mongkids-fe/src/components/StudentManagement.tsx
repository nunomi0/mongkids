import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Input } from "./ui/input"
import { Search, Edit, Trash2, Users, UserX, Clock } from "lucide-react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { supabase } from "../lib/supabase"
// 로컬 타입 정의 (supabase.ts의 api 의존 제거)
type StudentStatus = '재원' | '휴원' | '퇴원'
type LevelType = 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD' | null
type Student = {
  id: number
  name: string
  gender: '남' | '여'
  birth_date: string
  shoe_size: string | null
  phone: string
  registration_date: string
  class_type_id: number | null
  current_level: Exclude<LevelType, null> | null
  status: StudentStatus
  created_at: string
}
type ClassType = { id: number; category: string; sessions_per_week: number }
type StudentSchedule = { id?: number; student_id: number; weekday: number; time: string; group_no: number; created_at?: string }
type StudentLevel = { id: number; student_id: number; level: Exclude<LevelType, null>; acquired_date: string; created_at?: string }
type Payment = { id: number; student_id: number; payment_date: string; total_amount: number; climbing_excluded: number; sibling_discount: number; additional_discount: number; created_at: string }
type Attendance = { id: number; student_id: number; class_id: number; status: '예정' | '출석' | '결석' | '보강예정' | '보강완료'; is_makeup: boolean; memo: string | null; created_at: string; classes?: { date?: string; time?: string } }

type StudentStatus = '재원' | '퇴원' | '휴원'

export default function StudentManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [allStudents, setAllStudents] = useState<(Student & { last_payment_date: string | null; schedules: StudentSchedule[] })[]>([])
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | '재원' | '퇴원' | '휴원'>('재원')
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const [studentLevels, setStudentLevels] = useState<StudentLevel[]>([])
  const [isLevelEditOpen, setIsLevelEditOpen] = useState(false)
  const [levelEditData, setLevelEditData] = useState<{
    [key: string]: string
  }>({})
  
  // 결제 및 출석 정보 상태
  const [studentPayments, setStudentPayments] = useState<Payment[]>([])
  const [studentAttendance, setStudentAttendance] = useState<Attendance[]>([])

  // 수업 시간 선택 상태
  const [selectedSchedules, setSelectedSchedules] = useState<Array<{ weekday: number; time: string; group_no: number }>>([])
  
  // 폼 제출 시도 상태 (에러 메시지 표시용)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // 신규 학생 폼 상태
  const [newStudent, setNewStudent] = useState({
    name: "",
    gender: "남" as "남" | "여",
    birth_date: "",
    shoe_size: "",
    phone: "",
    registration_date: new Date().toISOString().split('T')[0],
    class_type_id: "",
    current_level: "" as "" | "WHITE" | "YELLOW" | "GREEN" | "BLUE" | "RED" | "BLACK" | "GOLD",
    status: "재원" as StudentStatus
  })

  // 수정용 학생 폼 상태
  const [editStudent, setEditStudent] = useState({
    name: "",
    gender: "남" as "남" | "여",
    birth_date: "",
    shoe_size: "",
    phone: "",
    registration_date: "",
    class_type_id: "",
    current_level: "" as "" | "WHITE" | "YELLOW" | "GREEN" | "BLUE" | "RED" | "BLACK" | "GOLD",
    status: "재원" as StudentStatus
  })

  // 학생 목록 로드
  const loadStudents = async () => {
    try {
      setLoading(true)
      // getStudentsWithLastPayment / getClassTypes 가 없는 경우 supabase 직접 사용
      const studentsData = await (async () => {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        return (data || []).map((s: any) => ({ ...s, last_payment_date: null }))
      })()

      const classTypesData = await (async () => {
        const { data, error } = await supabase
          .from('class_types')
          .select('*')
          .order('sessions_per_week', { ascending: true })
        if (error) throw error
        return data || []
      })()
      
      // 각 학생의 스케줄 정보 가져오기
      const studentsWithSchedules = await Promise.all(
        studentsData.map(async (student) => {
          const { data: schData, error: schErr } = await supabase
            .from('student_schedules')
            .select('*')
            .eq('student_id', student.id)
            .order('created_at', { ascending: true })
          if (schErr) throw schErr
          const schedules = (schData as StudentSchedule[]) || []
          return {
            ...student,
            schedules
          }
        })
      )
      
      setAllStudents(studentsWithSchedules)
      setClassTypes(classTypesData)
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  // 학생 레벨 이력 로드
  const loadStudentLevels = async (studentId: number) => {
    try {
      const { data, error } = await supabase
        .from('student_levels')
        .select('*')
        .eq('student_id', studentId)
        .order('acquired_date', { ascending: true })
      if (error) throw error
      const levelsData = (data as StudentLevel[]) || []
      setStudentLevels(levelsData)
    } catch (error) {
      console.error('Error loading student levels:', error)
    }
  }

  // 학생 결제 내역 로드
  const loadStudentPayments = async (studentId: number) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
      if (error) throw error
      const paymentsData = (data as Payment[]) || []
      setStudentPayments(paymentsData)
    } catch (error) {
      console.error('Error loading student payments:', error)
    }
  }

  // 학생 이번달 출석 정보 로드
  const loadStudentAttendance = async (studentId: number) => {
    try {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('attendance')
        .select(`*, classes:classes(date, time)`) // classes 날짜/시간 포함
        .eq('student_id', studentId)
        .gte('classes.date', start)
        .lte('classes.date', end)
        .order('classes.date', { ascending: true })
      if (error) throw error
      const attendanceData = (data as any[]) || []
      setStudentAttendance(attendanceData)
    } catch (error) {
      console.error('Error loading student attendance:', error)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  // 학생 상태 변환 함수들 (더 이상 필요 없음 - 직접 status 사용)
  const getStatusFromActive = (status: StudentStatus): StudentStatus => {
    return status
  }

  const getActiveFromStatus = (status: StudentStatus): boolean => {
    return status !== '퇴원'
  }

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    let filtered = allStudents

    // 상태 필터 적용
    if (statusFilter === '재원') {
      filtered = filtered.filter(student => student.status === '재원')
    } else if (statusFilter === '휴원') {
      filtered = filtered.filter(student => student.status === '휴원')
    } else if (statusFilter === '퇴원') {
      filtered = filtered.filter(student => student.status === '퇴원')
    }
    // 'all'인 경우 모든 학생 포함

    // 검색어 필터 적용
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [allStudents, statusFilter, searchTerm])

  const getLevelColor = (level: string) => {
    switch (level) {
      case "WHITE":
        return "bg-white text-gray-800 border-2 border-gray-300 shadow-sm"
      case "YELLOW":
        return "bg-yellow-400 text-yellow-900 border-2 border-yellow-500 shadow-sm"
      case "GREEN":
        return "bg-green-500 text-white border-2 border-green-600 shadow-sm"
      case "BLUE":
        return "bg-blue-500 text-white border-2 border-blue-600 shadow-sm"
      case "RED":
        return "bg-red-500 text-white border-2 border-red-600 shadow-sm"
      case "BLACK":
        return "bg-gray-900 text-white border-2 border-gray-700 shadow-sm"
      case "GOLD":
        return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-2 border-yellow-600 shadow-sm font-semibold"
      default:
        return "bg-gray-100 text-gray-600 border-2 border-gray-300 shadow-sm"
    }
  }

  const getLevelStyle = (level: string) => {
    switch (level) {
      case "WHITE":
        return {
          backgroundColor: '#ffffff',
          color: '#1f2937',
          border: '2px solid #d1d5db',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }
      case "YELLOW":
        return {
          backgroundColor: '#facc15',
          color: '#92400e',
          border: '2px solid #eab308',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }
      case "GREEN":
        return {
          backgroundColor: '#22c55e',
          color: '#ffffff',
          border: '2px solid #16a34a',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }
      case "BLUE":
        return {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: '2px solid #2563eb',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }
      case "RED":
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: '2px solid #dc2626',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }
      case "BLACK":
        return {
          backgroundColor: '#111827',
          color: '#ffffff',
          border: '2px solid #374151',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }
      case "GOLD":
        return {
          background: 'linear-gradient(to right, #facc15, #eab308)',
          color: '#92400e',
          border: '2px solid #ca8a04',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          fontWeight: '600'
        }
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#4b5563',
          border: '2px solid #d1d5db',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }
    }
  }

  const getStatusColor = (status: StudentStatus) => {
    switch (status) {
      case "재원":
        return "bg-green-100 text-green-800 border border-green-300"
      case "휴원":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300"
      case "퇴원":
        return "bg-red-100 text-red-800 border border-red-300"
      default:
        return "bg-gray-100 text-gray-600 border border-gray-300"
    }
  }

  // 수강 종류에 따른 기본 스케줄 생성
  const createDefaultSchedules = (studentId: number, classTypeId: number | null) => {
    if (!classTypeId) return []
    
    const classType = classTypes.find(ct => ct.id === classTypeId)
    if (!classType) return []
    
    const schedules: Array<{ student_id: number; weekday: number; time: string; group_no: number }> = []
    
    // 수강 종류에 따른 기본 스케줄
    if (classType.category === '키즈') {
      if (classType.sessions_per_week === 1) {
        schedules.push({ student_id: studentId, weekday: 5, time: '11:00', group_no: 1 }) // 토요일 11시
      } else if (classType.sessions_per_week === 2) {
        schedules.push({ student_id: studentId, weekday: 5, time: '11:00', group_no: 1 }) // 토요일 11시
        schedules.push({ student_id: studentId, weekday: 6, time: '14:00', group_no: 1 }) // 일요일 14시
      } else if (classType.sessions_per_week === 3) {
        schedules.push({ student_id: studentId, weekday: 0, time: '16:00', group_no: 1 }) // 월요일 16시
        schedules.push({ student_id: studentId, weekday: 2, time: '16:00', group_no: 1 }) // 수요일 16시
        schedules.push({ student_id: studentId, weekday: 4, time: '16:00', group_no: 1 }) // 금요일 16시
      }
    } else if (classType.category === '청소년') {
      if (classType.sessions_per_week === 1) {
        schedules.push({ student_id: studentId, weekday: 5, time: '14:00', group_no: 1 }) // 토요일 14시
      } else if (classType.sessions_per_week === 2) {
        schedules.push({ student_id: studentId, weekday: 5, time: '14:00', group_no: 1 }) // 토요일 14시
        schedules.push({ student_id: studentId, weekday: 6, time: '17:00', group_no: 1 }) // 일요일 17시
      } else if (classType.sessions_per_week === 3) {
        schedules.push({ student_id: studentId, weekday: 1, time: '17:00', group_no: 1 }) // 화요일 17시
        schedules.push({ student_id: studentId, weekday: 3, time: '17:00', group_no: 1 }) // 목요일 17시
        schedules.push({ student_id: studentId, weekday: 5, time: '17:00', group_no: 1 }) // 토요일 17시
      }
    } else if (classType.category === '여성') {
      if (classType.sessions_per_week === 1) {
        schedules.push({ student_id: studentId, weekday: 5, time: '17:00', group_no: 1 }) // 토요일 17시
      } else if (classType.sessions_per_week === 2) {
        schedules.push({ student_id: studentId, weekday: 5, time: '17:00', group_no: 1 }) // 토요일 17시
        schedules.push({ student_id: studentId, weekday: 6, time: '20:00', group_no: 1 }) // 일요일 20시
      } else if (classType.sessions_per_week === 3) {
        schedules.push({ student_id: studentId, weekday: 0, time: '20:00', group_no: 1 }) // 월요일 20시
        schedules.push({ student_id: studentId, weekday: 2, time: '20:00', group_no: 1 }) // 수요일 20시
        schedules.push({ student_id: studentId, weekday: 4, time: '20:00', group_no: 1 }) // 금요일 20시
      }
    } else if (classType.category === '스페셜') {
      if (classType.sessions_per_week === 1) {
        schedules.push({ student_id: studentId, weekday: 5, time: '10:00', group_no: 1 }) // 토요일 10시
      } else if (classType.sessions_per_week === 2) {
        schedules.push({ student_id: studentId, weekday: 5, time: '10:00', group_no: 1 }) // 토요일 10시
        schedules.push({ student_id: studentId, weekday: 6, time: '13:00', group_no: 1 }) // 일요일 13시
      } else if (classType.sessions_per_week === 3) {
        schedules.push({ student_id: studentId, weekday: 1, time: '13:00', group_no: 1 }) // 화요일 13시
        schedules.push({ student_id: studentId, weekday: 3, time: '13:00', group_no: 1 }) // 목요일 13시
        schedules.push({ student_id: studentId, weekday: 5, time: '13:00', group_no: 1 }) // 토요일 13시
      }
    }
    
    return schedules
  }

  const addStudent = async () => {
    setHasSubmitted(true)
    
    if (!newStudent.name || !newStudent.birth_date || !newStudent.phone) return

    try {
      const studentData = {
        ...newStudent,
        class_type_id: newStudent.class_type_id ? parseInt(newStudent.class_type_id) : null,
        current_level: newStudent.current_level || null,
        status: newStudent.status
      }

      const { data: inserted, error } = await supabase
        .from('students')
        .insert(studentData as any)
        .select('*')
        .single()
      if (error) throw error
      const createdStudent = inserted as any
      
      // 선택된 스케줄 생성 (또는 기본 스케줄)
      const schedules = selectedSchedules.length > 0 
        ? selectedSchedules.map(s => ({ ...s, student_id: createdStudent.id }))
        : createDefaultSchedules(createdStudent.id, createdStudent.class_type_id)
      
      for (const schedule of schedules) {
        const { error } = await supabase.from('student_schedules').insert(schedule as any)
        if (error) throw error
      }
      
      setIsAddOpen(false)
      setHasSubmitted(false)
      setNewStudent({
        name: "",
        gender: "남",
        birth_date: "",
        shoe_size: "",
        phone: "",
        registration_date: new Date().toISOString().split('T')[0],
        class_type_id: "",
        current_level: "",
        status: "재원"
      })
      setSelectedSchedules([])
      loadStudents()
    } catch (error) {
      console.error('Error adding student:', error)
    }
  }

  const updateStudent = async () => {
    if (!selectedStudent || !editStudent.name || !editStudent.birth_date || !editStudent.phone) return

    try {
      const studentData = {
        name: editStudent.name,
        gender: editStudent.gender,
        birth_date: editStudent.birth_date,
        shoe_size: editStudent.shoe_size || null,
        phone: editStudent.phone,
        registration_date: editStudent.registration_date,
        class_type_id: editStudent.class_type_id ? parseInt(editStudent.class_type_id) : null,
        current_level: editStudent.current_level || null,
        status: editStudent.status
      }

      {
        const { error } = await supabase.from('students').update(studentData).eq('id', selectedStudent.id)
        if (error) throw error
      }
      
      // 기존 스케줄 삭제 후 새로운 스케줄 생성
      {
        const { error } = await supabase.from('student_schedules').delete().eq('student_id', selectedStudent.id)
        if (error) throw error
      }
      const schedules = selectedSchedules.length > 0 
        ? selectedSchedules.map(s => ({ ...s, student_id: selectedStudent.id }))
        : createDefaultSchedules(selectedStudent.id, studentData.class_type_id)
      
      for (const schedule of schedules) {
        {
          const { error } = await supabase.from('student_schedules').insert(schedule as any)
          if (error) throw error
        }
      }
      
      setIsEditOpen(false)
      setSelectedSchedules([])
      loadStudents()
    } catch (error) {
      console.error('Error updating student:', error)
    }
  }

  const deleteStudent = async () => {
    if (!selectedStudent || deleteConfirmName !== selectedStudent.name) return

    try {
      // 소프트 삭제: status를 퇴원으로 설정
      {
        const { error } = await supabase.from('students').update({ status: '퇴원' }).eq('id', selectedStudent.id)
        if (error) throw error
      }
      setIsDeleteOpen(false)
      setDeleteConfirmName("")
      setIsDetailOpen(false)
      loadStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
    }
  }

  const openEditDialog = async (student: Student) => {
    setSelectedStudent(student)
    setEditStudent({
      name: student.name,
      gender: student.gender,
      birth_date: student.birth_date,
      shoe_size: student.shoe_size || "",
      phone: student.phone,
      registration_date: student.registration_date,
      class_type_id: student.class_type_id?.toString() || "",
      current_level: student.current_level || "",
      status: student.status
    })
    
    // 기존 스케줄 로드
    try {
      const { data, error } = await supabase
        .from('student_schedules')
        .select('*')
        .eq('student_id', student.id)
      if (error) throw error
      const schedules = (data as StudentSchedule[]) || []
      setSelectedSchedules(schedules.map(s => ({
        weekday: s.weekday,
        time: s.time,
        group_no: s.group_no
      })))
    } catch (error) {
      console.error('Error loading student schedules:', error)
      setSelectedSchedules([])
    }
    
    setIsEditOpen(true)
  }

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student)
    setDeleteConfirmName("")
    setIsDeleteOpen(true)
  }

  const openDetailDialog = async (student: Student) => {
    setSelectedStudent(student)
    await Promise.all([
      loadStudentLevels(student.id),
      loadStudentPayments(student.id),
      loadStudentAttendance(student.id)
    ])
    setIsDetailOpen(true)
  }

  const openLevelEditDialog = async (student: Student) => {
    setSelectedStudent(student)
    await loadStudentLevels(student.id)
    
    // 현재 레벨 이력 데이터를 편집용 상태로 초기화
    const levelData: { [key: string]: string } = {}
    ;['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD'].forEach(level => {
      const levelHistory = studentLevels.find(l => l.level === level)
      levelData[level] = levelHistory ? levelHistory.acquired_date : ''
    })
    setLevelEditData(levelData)
    setIsLevelEditOpen(true)
  }

  const saveLevelHistory = async () => {
    if (!selectedStudent) return

    try {
      // 기존 레벨 이력 삭제
      const { error: deleteError } = await supabase
        .from('student_levels')
        .delete()
        .eq('student_id', selectedStudent.id)
      
      if (deleteError) throw deleteError

      // 새로운 레벨 이력 추가
      const newLevels = Object.entries(levelEditData)
        .filter(([_, date]) => (date as string).trim() !== '')
        .map(([level, date]) => ({
          student_id: selectedStudent.id,
          level: level as 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD',
          acquired_date: date as string
        }))

      if (newLevels.length > 0) {
        const { error: insertError } = await supabase
          .from('student_levels')
          .insert(newLevels)
        
        if (insertError) throw insertError
      }

      // 현재 레벨 업데이트 (가장 최근 날짜의 레벨)
      if (newLevels.length > 0) {
        const sortedLevels = newLevels.sort((a, b) => 
          new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime()
        )
        const latestLevel = sortedLevels[0].level

        {
          const { error } = await supabase.from('students').update({ current_level: latestLevel }).eq('id', selectedStudent.id)
          if (error) throw error
        }
      } else {
        {
          const { error } = await supabase.from('students').update({ current_level: null }).eq('id', selectedStudent.id)
          if (error) throw error
        }
      }

      setIsLevelEditOpen(false)
      await loadStudentLevels(selectedStudent.id)
      loadStudents() // 학생 목록 새로고침
    } catch (error) {
      console.error('Error saving level history:', error)
    }
  }

  const getClassTypeName = (classTypeId: number | null) => {
    if (!classTypeId) return "-"
    const classType = classTypes.find(ct => ct.id === classTypeId)
    return classType ? `${classType.category} 주 ${classType.sessions_per_week}회` : "-"
  }

  const getGrade = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    // 한국 나이 기준으로 학년 계산
    if (age < 6) return `${age}세`
    if (age === 6) return "초1"
    if (age === 7) return "초2"
    if (age === 8) return "초3"
    if (age === 9) return "초4"
    if (age === 10) return "초5"
    if (age === 11) return "초6"
    if (age === 12) return "중1"
    if (age === 13) return "중2"
    if (age === 14) return "중3"
    if (age === 15) return "고1"
    if (age === 16) return "고2"
    if (age === 17) return "고3"
    if (age >= 18) return "성인"
    
    return `${age}세`
  }

  const getClassScheduleText = (schedules: StudentSchedule[]) => {
    if (!schedules || schedules.length === 0) return "-"
    
    const weekdayNames = ['월', '화', '수', '목', '금', '토', '일']
    
    return schedules
      .map(schedule => {
        const weekday = weekdayNames[schedule.weekday]
        const time = schedule.time.substring(0, 2) // "11:00" -> "11"
        return `${weekday}${time}`
      })
      .join(', ')
  }

  // 수업 시간 선택 컴포넌트
  const ScheduleSelector = ({ schedules, onChange }: { 
    schedules: Array<{ weekday: number; time: string; group_no: number }>
    onChange: (schedules: Array<{ weekday: number; time: string; group_no: number }>) => void 
  }) => {
    const weekdayNames = ['월', '화', '수', '목', '금', '토', '일']
    const timeOptions = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
      '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
    ]

    const addSchedule = () => {
      onChange([...schedules, { weekday: 0, time: '11:00', group_no: 1 }])
    }

    const removeSchedule = (index: number) => {
      onChange(schedules.filter((_, i) => i !== index))
    }

    const updateSchedule = (index: number, field: 'weekday' | 'time' | 'group_no', value: number | string) => {
      const newSchedules = [...schedules]
      newSchedules[index] = { ...newSchedules[index], [field]: value }
      onChange(newSchedules)
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">수업 시간</label>
          <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
            시간 추가
          </Button>
        </div>
        
        {schedules.map((schedule, index) => (
          <div key={index} className="flex items-center gap-2 p-2 border rounded">
            <select
              value={schedule.weekday}
              onChange={(e) => updateSchedule(index, 'weekday', parseInt(e.target.value))}
              className="flex-1 p-1 text-sm border rounded"
            >
              {weekdayNames.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
            
            <select
              value={schedule.time}
              onChange={(e) => updateSchedule(index, 'time', e.target.value)}
              className="flex-1 p-1 text-sm border rounded"
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            
            <select
              value={schedule.group_no}
              onChange={(e) => updateSchedule(index, 'group_no', parseInt(e.target.value))}
              className="w-16 p-1 text-sm border rounded"
            >
              <option value={1}>1반</option>
              <option value={2}>2반</option>
              <option value={3}>3반</option>
            </select>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeSchedule(index)}
              className="text-red-500 hover:text-red-700"
            >
              삭제
            </Button>
          </div>
        ))}
        
        {schedules.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-2">
            수업 시간을 추가해주세요
          </div>
        )}
      </div>
    )
  }

  const levelOptions = [
    { value: "", label: "선택하세요" },
    { value: "WHITE", label: "WHITE" },
    { value: "YELLOW", label: "YELLOW" },
    { value: "GREEN", label: "GREEN" },
    { value: "BLUE", label: "BLUE" },
    { value: "RED", label: "RED" },
    { value: "BLACK", label: "BLACK" },
    { value: "GOLD", label: "GOLD" }
  ]

  const statusOptions = [
    { value: "재원", label: "재원" },
    { value: "휴원", label: "휴원" },
    { value: "퇴원", label: "퇴원" }
  ]

  const getStatusFilterLabel = () => {
    switch (statusFilter) {
      case 'all': return '전체'
      case '재원': return '재원'
      case '휴원': return '휴원'
      case '퇴원': return '퇴원'
      default: return '재원'
    }
  }

  const getStatusFilterCount = () => {
    switch (statusFilter) {
      case 'all': return allStudents.length
      case '재원': return allStudents.filter(s => s.status === '재원').length
      case '휴원': return allStudents.filter(s => s.status === '휴원').length
      case '퇴원': return allStudents.filter(s => s.status === '퇴원').length
      default: return 0
    }
  }

  // 수업 시간 유효성 검사
  const validateSchedules = (classTypeId: string | number | null, schedules: Array<{ weekday: number; time: string; group_no: number }>, status: StudentStatus) => {
    // 휴원이나 퇴원인 경우 스케줄 검증 불필요
    if (status !== '재원') return true
    
    // 재원인 경우 등록반 선택 필수
    if (status === '재원' && !classTypeId) return false
    
    if (!classTypeId) return false
    
    const classType = classTypes.find(ct => ct.id === parseInt(classTypeId.toString()))
    if (!classType) return false
    
    // 등록반 횟수와 스케줄 개수 일치 여부 확인
    if (schedules.length !== classType.sessions_per_week) return false
    
    // 중복 시간 검증 (같은 요일, 같은 시간 - 그룹은 상관없음)
    const timeSlots = schedules.map(s => `${s.weekday}-${s.time}`)
    const uniqueTimeSlots = new Set(timeSlots)
    
    return timeSlots.length === uniqueTimeSlots.size
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
            <CardTitle>학생 목록 ({getStatusFilterCount()}명)</CardTitle>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">학생 추가</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>학생 추가</DialogTitle>
                </DialogHeader>
                  <p className="text-sm text-black">
                    <span className="text-red-500 font-semibold">*</span> 표시된 필드는 반드시 입력해야 합니다.
                  </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={newStudent.name || ''} 
                      onChange={(e)=>setNewStudent(s=>({...s, name: e.target.value}))}
                      className={!newStudent.name && hasSubmitted ? 'border-red-300' : ''}
                      placeholder="학생 이름을 입력하세요"
                    />
                    {!newStudent.name && hasSubmitted && (
                      <p className="text-xs text-red-500">이름을 입력해주세요</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">성별</label>
                    <select 
                      value={newStudent.gender} 
                      onChange={(e)=>setNewStudent(s=>({...s, gender: e.target.value as "남" | "여"}))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="남">남</option>
                      <option value="여">여</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      생년월일 <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={newStudent.birth_date || ''} 
                      onChange={(e)=>setNewStudent(s=>({...s, birth_date: e.target.value}))}
                      type="date"
                      className={!newStudent.birth_date && hasSubmitted ? 'border-red-300' : ''}
                    />
                    {!newStudent.birth_date && hasSubmitted && (
                      <p className="text-xs text-red-500">생년월일을 선택해주세요</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      전화번호 <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={newStudent.phone || ''} 
                      onChange={(e)=>setNewStudent(s=>({...s, phone: e.target.value}))}
                      className={!newStudent.phone && hasSubmitted ? 'border-red-300' : ''}
                      placeholder="010-1234-5678"
                    />
                    {!newStudent.phone && hasSubmitted && (
                      <p className="text-xs text-red-500">전화번호를 입력해주세요</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">신발 사이즈</label>
                    <Input 
                      value={newStudent.shoe_size || ''} 
                      onChange={(e)=>setNewStudent(s=>({...s, shoe_size: e.target.value}))}
                      placeholder="220"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      등록반 <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={newStudent.class_type_id} 
                      onChange={(e)=>setNewStudent(s=>({...s, class_type_id: e.target.value}))}
                      className={`w-full p-2 border rounded ${!newStudent.class_type_id && hasSubmitted ? 'border-red-300' : ''}`}
                    >
                      <option value="">등록반을 선택하세요</option>
                      {classTypes.map((classType) => (
                        <option key={classType.id} value={classType.id}>
                          {classType.category} 주 {classType.sessions_per_week}회
                        </option>
                      ))}
                    </select>
                    {!newStudent.class_type_id && hasSubmitted && (
                      <p className="text-xs text-red-500">등록반을 선택해주세요</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">현재 레벨</label>
                    <select 
                      value={newStudent.current_level} 
                      onChange={(e)=>setNewStudent(s=>({...s, current_level: e.target.value as "" | "WHITE" | "YELLOW" | "GREEN" | "BLUE" | "RED" | "BLACK" | "GOLD"}))}
                      className="w-full p-2 border rounded"
                    >
                      {levelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">상태</label>
                    <select 
                      value={newStudent.status} 
                      onChange={(e)=>setNewStudent(s=>({...s, status: e.target.value as StudentStatus}))}
                      className="w-full p-2 border rounded"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* 수업 시간 선택 */}
                <div className="mt-4">
                  <ScheduleSelector 
                    schedules={selectedSchedules}
                    onChange={setSelectedSchedules}
                  />
                  {newStudent.status === '재원' && hasSubmitted && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {(() => {
                        if (!newStudent.class_type_id) {
                          return `⚠️ 재원 상태인 경우 등록반을 선택해야 합니다.`
                        }
                        
                        const classType = classTypes.find(ct => ct.id === parseInt(newStudent.class_type_id))
                        if (!classType) return null
                        const isValid = validateSchedules(newStudent.class_type_id, selectedSchedules, newStudent.status)
                        
                        if (isValid) {
                          return `✅ ${classType.category} 주 ${classType.sessions_per_week}회에 맞는 수업 시간이 설정되었습니다.`
                        } else {
                          // 구체적인 오류 메시지 생성
                          let errorMessage = `⚠️ ${classType.category} 주 ${classType.sessions_per_week}회에 맞게 수업 시간을 설정해주세요.`
                          
                          if (selectedSchedules.length !== classType.sessions_per_week) {
                            errorMessage += ` (현재 ${selectedSchedules.length}개)`
                          }
                          
                          // 중복 시간 확인 (그룹은 상관없음)
                          const timeSlots = selectedSchedules.map(s => `${s.weekday}-${s.time}`)
                          const uniqueTimeSlots = new Set(timeSlots)
                          if (timeSlots.length !== uniqueTimeSlots.size) {
                            errorMessage += ` - 중복된 시간이 있습니다.`
                          }
                          
                          return errorMessage
                        }
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => {
                    setIsAddOpen(false)
                    setHasSubmitted(false)
                  }}>취소</Button>
                  <Button 
                    onClick={addStudent} 
                    disabled={
                      !newStudent.name || 
                      !newStudent.birth_date || 
                      !newStudent.phone ||
                      !validateSchedules(newStudent.class_type_id, selectedSchedules, newStudent.status)
                    }
                  >
                    추가
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center space-x-4">
            {/* 상태 필터 */}
            <div className="flex items-center space-x-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                <Users className="w-4 h-4 mr-1" />
                전체
              </Button>
              <Button
                variant={statusFilter === '재원' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('재원')}
              >
                <Users className="w-4 h-4 mr-1" />
                재원
              </Button>
              <Button
                variant={statusFilter === '휴원' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('휴원')}
              >
                <Clock className="w-4 h-4 mr-1" />
                휴원
              </Button>
              <Button
                variant={statusFilter === '퇴원' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('퇴원')}
              >
                <UserX className="w-4 h-4 mr-1" />
                퇴원
              </Button>
            </div>
            {/* 검색 */}
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
                  <TableHead>성별</TableHead>
                  <TableHead>학년</TableHead>
                  <TableHead>현재 레벨</TableHead>
                  <TableHead>등록반</TableHead>
                  <TableHead>수업시간</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>최근결제일</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    return (
                      <TableRow
                        key={student.id}
                        className={`cursor-pointer hover:bg-accent ${student.status === '퇴원' ? 'opacity-60' : ''}`}
                        onClick={() => openDetailDialog(student)}
                      >
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>{getGrade(student.birth_date)}</TableCell>
                        <TableCell>
                          {student.current_level ? (
                            <div 
                              style={{
                                backgroundColor: 
                                  student.current_level === 'NONE' ? '#e5e7eb' :
                                  student.current_level === 'WHITE' ? '#ffffff' :
                                  student.current_level === 'YELLOW' ? '#fde047' :
                                  student.current_level === 'GREEN' ? '#86efac' :
                                  student.current_level === 'BLUE' ? '#93c5fd' :
                                  student.current_level === 'RED' ? '#fca5a5' :
                                  student.current_level === 'BLACK' ? '#374151' :
                                  student.current_level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                                border: student.current_level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                display: 'inline-block'
                              }}
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{getClassTypeName(student.class_type_id)}</TableCell>
                        <TableCell className="font-mono text-sm">{getClassScheduleText(student.schedules)}</TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>{student.last_payment_date || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {searchTerm ? "검색 결과가 없습니다." : `${getStatusFilterLabel()} 학생이 없습니다.`}
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
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">학생 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="flex flex-col max-h-[calc(95vh-64px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
  
              {/* 메인 콘텐츠 (스크롤 영역) */}
              <div className="flex-1 pr-2 space-y-4">

              <div className="flex-shrink-0 flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <div>
                  <div className="text-xl font-bold text-gray-900">{selectedStudent.name}</div>
                  <div className="text-sm text-gray-600">{selectedStudent.birth_date} ({getGrade(selectedStudent.birth_date)})</div>
                  <div className="text-sm text-gray-600">{getClassTypeName(selectedStudent.class_type_id)} ({getClassScheduleText(selectedStudent.schedules)})</div>
                  <div className="text-sm text-gray-600">
                      <span className="font-medium">전화번호:</span>{' '}
                      {selectedStudent.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                      <span className="font-medium">신발 사이즈:</span>{' '}
                      {selectedStudent.shoe_size || "-"}
                  </div>
                  <div className="text-sm text-gray-600">
                      <span className="font-medium">등록일:</span>{' '}
                      {selectedStudent.registration_date}
                  </div>

                </div>
                <div className="flex items-center gap-3">
                  {selectedStudent.current_level && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">현재 레벨:</span>
                      <div 
                        style={{
                          backgroundColor: 
                            selectedStudent.current_level === 'NONE' ? '#e5e7eb' :
                            selectedStudent.current_level === 'WHITE' ? '#ffffff' :
                            selectedStudent.current_level === 'YELLOW' ? '#fde047' :
                            selectedStudent.current_level === 'GREEN' ? '#86efac' :
                            selectedStudent.current_level === 'BLUE' ? '#93c5fd' :
                            selectedStudent.current_level === 'RED' ? '#fca5a5' :
                            selectedStudent.current_level === 'BLACK' ? '#374151' :
                            selectedStudent.current_level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                          border: selectedStudent.current_level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                          width: '18px',
                          height: '18px',
                          borderRadius: '3px',
                          display: 'inline-block'
                        }}
                      />
                    </div>
                  )}
                  <Badge className={`text-sm px-3 py-1 ${getStatusColor(selectedStudent.status)}`}>
                    {selectedStudent.status}
                  </Badge>
                </div>
              </div>
                {/* 레벨 이력 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">레벨 이력</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* 레벨 색상과 취득 날짜를 가로로 배치 */}
                    <div className="flex justify-center gap-4">
                      {['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD'].map((level) => {
                        const levelHistory = studentLevels.find(l => l.level === level)
                        return (
                          <div key={level} className="flex flex-col items-center">
                            <div 
                              style={{
                                backgroundColor: 
                                  level === 'NONE' ? '#e5e7eb' :
                                  level === 'WHITE' ? '#ffffff' :
                                  level === 'YELLOW' ? '#fde047' :
                                  level === 'GREEN' ? '#86efac' :
                                  level === 'BLUE' ? '#93c5fd' :
                                  level === 'RED' ? '#fca5a5' :
                                  level === 'BLACK' ? '#374151' :
                                  level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                                border: level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                                width: '16px',
                                height: '16px',
                                borderRadius: '3px',
                                display: 'inline-block'
                              }}
                            />
                            <span className="text-xs text-gray-600 mt-1 font-medium">{level}</span>
                            <span className="text-xs text-gray-500 mt-1 text-center">
                              {levelHistory ? levelHistory.acquired_date : "미취득"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 이번달 출석 현황 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">이번달 출석 현황</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">출석일:</span>{' '}
                        {studentAttendance
                          .filter(a => a.status === '출석')
                          .map(a => a.classes?.date)
                          .filter(Boolean)
                          .join(', ') || '없음'}
                      </div>
                      <div>
                        <span className="font-medium">결석일:</span>{' '}
                        {studentAttendance
                          .filter(a => a.status === '결석')
                          .map(a => a.classes?.date)
                          .filter(Boolean)
                          .join(', ') || '없음'}
                      </div>
                      <div>
                        <span className="font-medium">보강완료:</span>{' '}
                        {studentAttendance
                          .filter(a => a.status === '보강완료')
                          .map(a => a.classes?.date)
                          .filter(Boolean)
                          .join(', ') || '없음'}
                      </div>
                      <div>
                        <span className="font-medium">보강예정:</span>{' '}
                        {studentAttendance
                          .filter(a => a.status === '보강예정')
                          .map(a => a.classes?.date)
                          .filter(Boolean)
                          .join(', ') || '없음'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 결제 내역 */}
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">결제 내역</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {studentPayments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs p-1">결제일</TableHead>
                              <TableHead className="text-xs p-1">금액</TableHead>
                              <TableHead className="text-xs p-1">할인</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentPayments.map((payment) => (
                              <TableRow key={payment.id} className="text-xs">
                                <TableCell className="py-1 px-1">{payment.payment_date}</TableCell>
                                <TableCell className="py-1 px-1 font-medium">
                                  {payment.total_amount.toLocaleString()}원
                                </TableCell>
                                <TableCell className="py-1 px-1">
                                  <div className="space-y-1">
                                    {payment.climbing_excluded > 0 && (
                                      <div className="text-red-600 text-xs">
                                        암벽화 제외: {payment.climbing_excluded.toLocaleString()}원
                                      </div>
                                    )}
                                    {payment.sibling_discount > 0 && (
                                      <div className="text-blue-600 text-xs">
                                        형제할인: {payment.sibling_discount.toLocaleString()}원
                                      </div>
                                    )}
                                    {payment.additional_discount > 0 && (
                                      <div className="text-green-600 text-xs">
                                        추가할인: {payment.additional_discount.toLocaleString()}원
                                      </div>
                                    )}
                                    {payment.climbing_excluded === 0 && payment.sibling_discount === 0 && payment.additional_discount === 0 && (
                                      <div className="text-gray-500 text-xs">할인 없음</div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        <div className="text-2xl mb-1">📄</div>
                        <div className="text-xs">결제 내역이 없습니다.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

                {/* 액션 버튼 */}
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(selectedStudent)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    정보 수정
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openLevelEditDialog(selectedStudent)}
                  >
                    레벨 이력 수정
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => openDeleteDialog(selectedStudent)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    학생 삭제
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>학생 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              정말로 <strong>{selectedStudent?.name}</strong> 학생을 삭제하시겠습니까?
            </p>
            <p className="text-sm text-muted-foreground">
              삭제를 확인하려면 학생의 이름을 정확히 입력해주세요.
            </p>
            <Input
              placeholder="학생 이름을 입력하세요"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsDeleteOpen(false)
                setDeleteConfirmName("")
              }}>
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteStudent}
                disabled={deleteConfirmName !== selectedStudent?.name}
              >
                삭제
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 학생 수정 다이얼로그 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>학생 정보 수정</DialogTitle>
          </DialogHeader>
            <p className="text-sm text-black">
              <span className="text-red-500 font-semibold">*</span> 표시된 필드는 반드시 입력해야 합니다.
            </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                이름 <span className="text-red-500">*</span>
              </label>
              <Input 
                value={editStudent.name} 
                onChange={(e)=>setEditStudent(s=>({...s, name: e.target.value}))}
                className={!editStudent.name ? 'border-red-300' : ''}
                placeholder="학생 이름을 입력하세요"
              />
              {!editStudent.name && (
                <p className="text-xs text-red-500">이름을 입력해주세요</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">성별</label>
              <select 
                value={editStudent.gender} 
                onChange={(e)=>setEditStudent(s=>({...s, gender: e.target.value as "남" | "여"}))}
                className="w-full p-2 border rounded"
              >
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                생년월일 <span className="text-red-500">*</span>
              </label>
              <Input 
                value={editStudent.birth_date} 
                onChange={(e)=>setEditStudent(s=>({...s, birth_date: e.target.value}))}
                type="date"
                className={!editStudent.birth_date ? 'border-red-300' : ''}
              />
              {!editStudent.birth_date && (
                <p className="text-xs text-red-500">생년월일을 선택해주세요</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <Input 
                value={editStudent.phone} 
                onChange={(e)=>setEditStudent(s=>({...s, phone: e.target.value}))}
                className={!editStudent.phone ? 'border-red-300' : ''}
                placeholder="010-1234-5678"
                type="tel"
              />
              {!editStudent.phone && (
                <p className="text-xs text-red-500">전화번호를 입력해주세요</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">신발 사이즈</label>
              <Input 
                value={editStudent.shoe_size} 
                onChange={(e)=>setEditStudent(s=>({...s, shoe_size: e.target.value}))}
                placeholder="220"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                등록반 <span className="text-red-500">*</span>
              </label>
              <select 
                value={editStudent.class_type_id} 
                onChange={(e)=>setEditStudent(s=>({...s, class_type_id: e.target.value}))}
                className={`w-full p-2 border rounded ${!editStudent.class_type_id ? 'border-red-300' : ''}`}
              >
                <option value="">등록반을 선택하세요</option>
                {classTypes.map((classType) => (
                  <option key={classType.id} value={classType.id}>
                    {classType.category} 주 {classType.sessions_per_week}회
                  </option>
                ))}
              </select>
              {!editStudent.class_type_id && (
                <p className="text-xs text-red-500">등록반을 선택해주세요</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">현재 레벨</label>
              <select 
                value={editStudent.current_level} 
                onChange={(e)=>setEditStudent(s=>({...s, current_level: e.target.value as "" | "WHITE" | "YELLOW" | "GREEN" | "BLUE" | "RED" | "BLACK" | "GOLD"}))}
                className="w-full p-2 border rounded"
              >
                {levelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">상태</label>
              <select 
                value={editStudent.status} 
                onChange={(e)=>setEditStudent(s=>({...s, status: e.target.value as StudentStatus}))}
                className="w-full p-2 border rounded"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 수업 시간 선택 */}
          <div className="mt-4">
            <ScheduleSelector 
              schedules={selectedSchedules}
              onChange={setSelectedSchedules}
            />
            {editStudent.status === '재원' && (
              <div className="mt-2 text-xs text-muted-foreground">
                {(() => {
                  if (!editStudent.class_type_id) {
                    return `⚠️ 재원 상태인 경우 등록반을 선택해야 합니다.`
                  }
                  
                  const classType = classTypes.find(ct => ct.id === parseInt(editStudent.class_type_id))
                  if (!classType) return null
                  const isValid = validateSchedules(editStudent.class_type_id, selectedSchedules, editStudent.status)
                  
                  if (isValid) {
                    return `✅ ${classType.category} 주 ${classType.sessions_per_week}회에 맞는 수업 시간이 설정되었습니다.`
                  } else {
                    // 구체적인 오류 메시지 생성
                    let errorMessage = `⚠️ ${classType.category} 주 ${classType.sessions_per_week}회에 맞게 수업 시간을 설정해주세요.`
                    
                    if (selectedSchedules.length !== classType.sessions_per_week) {
                      errorMessage += ` (현재 ${selectedSchedules.length}개)`
                    }
                    
                    // 중복 시간 확인 (그룹은 상관없음)
                    const timeSlots = selectedSchedules.map(s => `${s.weekday}-${s.time}`)
                    const uniqueTimeSlots = new Set(timeSlots)
                    if (timeSlots.length !== uniqueTimeSlots.size) {
                      errorMessage += ` - 중복된 시간이 있습니다.`
                    }
                    
                    return errorMessage
                  }
                })()}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={()=>setIsEditOpen(false)}>취소</Button>
            <Button 
              onClick={updateStudent} 
              disabled={
                !editStudent.name || 
                !editStudent.birth_date || 
                !editStudent.phone ||
                !validateSchedules(editStudent.class_type_id, selectedSchedules, editStudent.status)
              }
            >
              수정
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 레벨 이력 수정 다이얼로그 */}
      <Dialog open={isLevelEditOpen} onOpenChange={setIsLevelEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>레벨 이력 수정 - {selectedStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              각 레벨의 취득 날짜를 입력하세요. 빈 값으로 두면 해당 레벨을 취득하지 않은 것으로 처리됩니다.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD'].map((level) => (
                <div key={level} className="flex items-center gap-3">
                  <div 
                    style={{
                      backgroundColor: 
                        level === 'NONE' ? '#e5e7eb' :
                        level === 'WHITE' ? '#ffffff' :
                        level === 'YELLOW' ? '#fde047' :
                        level === 'GREEN' ? '#86efac' :
                        level === 'BLUE' ? '#93c5fd' :
                        level === 'RED' ? '#fca5a5' :
                        level === 'BLACK' ? '#374151' :
                        level === 'GOLD' ? '#fbbf24' : '#e5e7eb',
                      border: level === 'WHITE' ? '1px solid #d1d5db' : 'none',
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      display: 'inline-block'
                    }}
                  />
                  <Input
                    type="date"
                    value={levelEditData[level] || ''}
                    onChange={(e) => setLevelEditData(prev => ({
                      ...prev,
                      [level]: e.target.value
                    }))}
                    placeholder="취득 날짜"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLevelEditOpen(false)}>
                취소
              </Button>
              <Button onClick={saveLevelHistory}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}