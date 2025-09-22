import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { AttendanceItem, ClassType, LevelHistory, PaymentItem, Student, StudentSchedule } from "../../types/student"

export function useStudentDetailData(studentId: number | null, isOpen: boolean) {
  const [student, setStudent] = useState<Student | null>(null)
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [levelHistories, setLevelHistories] = useState<LevelHistory[]>([])
  const [attendance, setAttendance] = useState<AttendanceItem[]>([])
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [attnYearMonth, setAttnYearMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async (id: number) => {
    try {
      setLoading(true)
      const { data: studentData, error: sErr } = await supabase
        .from('students')
        .select(`*, memo, memo_isopen, student_schedules ( weekday, time, group_type ), student_levels ( level, created_at )`)
        .eq('id', id)
        .single()
      if (sErr) throw sErr
      const schedules = (studentData?.student_schedules || []).map((s: any) => ({ weekday: s.weekday, time: s.time, group_type: s.group_type })) as StudentSchedule[]
      setStudent({
        id: studentData.id,
        name: studentData.name,
        gender: studentData.gender,
        birth_date: studentData.birth_date,
        shoe_size: studentData.shoe_size,
        phone: studentData.phone,
        registration_date: studentData.registration_date,
        class_type_id: studentData.class_type_id,
        current_level: studentData.current_level,
        status: studentData.status,
        schedules,
        ...(studentData.memo !== undefined ? { memo: studentData.memo } : {}),
        ...(studentData.memo_isopen !== undefined ? { memo_isopen: studentData.memo_isopen } : {}),
      } as any)
      setLevelHistories((studentData?.student_levels || []).map((l: any) => ({ level: l.level, acquired_date: l.created_at })))

      const { data: classTypeData } = await supabase.from('class_types').select('*')
      setClassTypes(classTypeData as ClassType[] || [])

      const { data: payData } = await supabase.from('payments').select('*').eq('student_id', id).order('payment_date', { ascending: false })
      setPayments((payData as PaymentItem[]) || [])

      const { data: attData } = await supabase
        .from('attendance')
        .select('id, status, kind, note, note_isopen, makeup_of_attendance_id, classes:classes(date, time)')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
      setAttendance((attData as AttendanceItem[]) || [])
      const recent = (attData as AttendanceItem[] | null) || []
      if (recent.length > 0) {
        const d = recent.find(a => a.classes?.date)?.classes?.date
        if (d) setAttnYearMonth(d.slice(0,7))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && studentId) loadData(studentId)
    else {
      setStudent(null); setLevelHistories([]); setAttendance([]); setPayments([])
    }
  }, [isOpen, studentId, loadData])

  return { student, classTypes, levelHistories, attendance, payments, attnYearMonth, setAttnYearMonth, loading, reload: () => studentId && loadData(studentId) }
}


