import { supabase } from './supabase'
import { DEFAULT_BRANCH_ID } from './constants'
import {
  calculateGrade,
  formatClassName,
  formatClassTime,
  formatPaymentAmount,
  formatLastPaymentMonth,
} from './utils/student'
import type {
  Student,
  StudentListItem,
  StudentFormData,
  StudentSchedule,
  Payment,
  PaymentFormData,
  LevelHistory,
  LevelType,
  ClassItem,
  ClassStudent,
  AttendanceRecord,
  AttendanceStatus,
  TrialReservation,
  TrialStatus,
  GroupType,
  CategoryType,
} from '@/types/student'

// ============================================================
// 학생
// ============================================================

export async function fetchStudentsList(): Promise<StudentListItem[]> {
  const { data: students, error } = await supabase
    .from('students')
    .select(`
      id, name, birth_date, gender, phone, status, category, sessions_per_week, current_level,
      student_schedules (weekday, time, group_type),
      payments (target_month, amount)
    `)
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchStudentsList error:', error)
    return []
  }

  return (students || []).map((s: any) => {
    const schedules = s.student_schedules || []
    const payments = (s.payments || []) as { target_month: string; amount: number }[]

    // 최근 결제 찾기
    const sorted = [...payments].sort((a, b) => b.target_month.localeCompare(a.target_month))
    const lastPayment = sorted[0]

    return {
      id: s.id,
      name: s.name,
      gender: s.gender,
      grade: calculateGrade(s.birth_date),
      level: s.current_level || '',
      className: formatClassName(s.category, s.sessions_per_week),
      classTime: formatClassTime(schedules),
      phone: s.phone,
      lastPayment: lastPayment ? formatLastPaymentMonth(lastPayment.target_month) : '',
      paymentAmount: lastPayment ? formatPaymentAmount(lastPayment.amount) : '',
      status: s.status,
    }
  })
}

export async function fetchStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      student_schedules (id, weekday, time, group_type)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('fetchStudent error:', error)
    return null
  }

  return {
    id: data.id,
    branch_id: data.branch_id,
    name: data.name,
    birth_date: data.birth_date,
    phone: data.phone,
    category: data.category,
    sessions_per_week: data.sessions_per_week,
    gender: data.gender,
    status: data.status,
    shoe_size: data.shoe_size,
    current_level: data.current_level,
    memo: data.memo,
    schedules: data.student_schedules || [],
  }
}

export async function createStudent(
  formData: StudentFormData,
  schedules: StudentSchedule[]
): Promise<Student | null> {
  // 1. Insert student
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      name: formData.name,
      birth_date: formData.birth_date,
      phone: formData.phone,
      gender: formData.gender,
      status: formData.status,
      shoe_size: formData.shoe_size,
      category: formData.category,
      sessions_per_week: formData.sessions_per_week,
      current_level: 'WHITE' as LevelType,
      memo: '',
    })
    .select()
    .single()

  if (studentError) {
    console.error('createStudent error:', studentError)
    return null
  }

  // 2. Insert schedules
  if (schedules.length > 0) {
    const { error: schedError } = await supabase
      .from('student_schedules')
      .insert(
        schedules.map((s) => ({
          student_id: student.id,
          weekday: s.weekday,
          time: s.time,
          group_type: s.group_type,
        }))
      )

    if (schedError) console.error('createStudent schedules error:', schedError)
  }

  // 3. Insert level histories (7 levels, only WHITE acquired)
  const levels: LevelType[] = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD']
  const { error: levelError } = await supabase
    .from('student_levels')
    .insert(
      levels.map((level) => ({
        student_id: student.id,
        level,
        acquired_date: level === 'WHITE' ? new Date().toISOString().split('T')[0] : null,
      }))
    )

  if (levelError) console.error('createStudent levels error:', levelError)

  return fetchStudent(student.id)
}

export async function updateStudent(
  id: string,
  formData: Partial<Student>,
  schedules?: StudentSchedule[]
): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({
      name: formData.name,
      birth_date: formData.birth_date,
      phone: formData.phone,
      gender: formData.gender,
      status: formData.status,
      shoe_size: formData.shoe_size,
      category: formData.category,
      sessions_per_week: formData.sessions_per_week,
      memo: formData.memo,
    })
    .eq('id', id)

  if (error) {
    console.error('updateStudent error:', error)
    return
  }

  if (schedules) {
    // Delete old schedules and insert new ones
    await supabase.from('student_schedules').delete().eq('student_id', id)
    if (schedules.length > 0) {
      await supabase.from('student_schedules').insert(
        schedules.map((s) => ({
          student_id: id,
          weekday: s.weekday,
          time: s.time,
          group_type: s.group_type,
        }))
      )
    }
  }
}

export async function updateStudentStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ status })
    .eq('id', id)

  if (error) console.error('updateStudentStatus error:', error)
}

// ============================================================
// 결제
// ============================================================

export async function fetchPayments(studentId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('fetchPayments error:', error)
    return []
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    student_id: p.student_id,
    payment_date: p.payment_date,
    target_month: p.target_month,
    amount: p.amount,
    method: p.method,
    discounts: p.discounts || [],
    memo: p.memo || '',
  }))
}

export async function createPayment(
  studentId: string,
  data: PaymentFormData
): Promise<Payment | null> {
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      student_id: studentId,
      payment_date: data.payment_date,
      target_month: data.target_month,
      amount: parseInt(data.amount) || 0,
      method: data.method,
      discounts: data.discounts,
      memo: data.memo,
    })
    .select()
    .single()

  if (error) {
    console.error('createPayment error:', error)
    return null
  }

  return {
    id: payment.id,
    student_id: payment.student_id,
    payment_date: payment.payment_date,
    target_month: payment.target_month,
    amount: payment.amount,
    method: payment.method,
    discounts: payment.discounts || [],
    memo: payment.memo || '',
  }
}

export async function updatePayment(payment: Payment): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({
      payment_date: payment.payment_date,
      target_month: payment.target_month,
      amount: payment.amount,
      method: payment.method,
      discounts: payment.discounts,
      memo: payment.memo,
    })
    .eq('id', payment.id)

  if (error) console.error('updatePayment error:', error)
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) console.error('deletePayment error:', error)
}

// ============================================================
// 레벨
// ============================================================

export async function fetchLevelHistories(studentId: string): Promise<LevelHistory[]> {
  const { data, error } = await supabase
    .from('student_levels')
    .select('level, acquired_date')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchLevelHistories error:', error)
    return []
  }

  return (data || []).map((l: any) => ({
    level: l.level,
    acquired_at: l.acquired_date,
  }))
}

export async function saveLevelHistories(
  studentId: string,
  histories: LevelHistory[]
): Promise<void> {
  // Find the highest acquired level and update current_level
  const levels: LevelType[] = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD']
  let currentLevel: LevelType | null = null
  for (let i = levels.length - 1; i >= 0; i--) {
    const h = histories.find((h) => h.level === levels[i])
    if (h?.acquired_at) {
      currentLevel = levels[i]
      break
    }
  }

  // Update current_level on student
  await supabase
    .from('students')
    .update({ current_level: currentLevel })
    .eq('id', studentId)

  // Upsert level histories
  for (const h of histories) {
    const { error } = await supabase
      .from('student_levels')
      .upsert(
        {
          student_id: studentId,
          level: h.level,
          acquired_date: h.acquired_at,
        },
        { onConflict: 'student_id,level' }
      )

    if (error) console.error('saveLevelHistories error:', error)
  }
}

// ============================================================
// 수업
// ============================================================

export async function fetchClassesByDate(date: string): Promise<{
  classes: ClassItem[]
  attendanceMap: Record<string, AttendanceRecord>
}> {
  const { data: classRows, error: classError } = await supabase
    .from('classes')
    .select(`
      id, date, time, group_type,
      attendance (
        id, student_id, status, makeup_of_attendance_id, memo,
        students:student_id (id, name, birth_date, gender, current_level, status)
      )
    `)
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .eq('date', date)
    .order('time')

  if (classError) {
    console.error('fetchClassesByDate error:', classError)
    return { classes: [], attendanceMap: {} }
  }

  const classes: ClassItem[] = []
  const attendanceMap: Record<string, AttendanceRecord> = {}

  for (const cls of classRows || []) {
    const students: ClassStudent[] = []
    for (const att of cls.attendance || []) {
      const student = att.students as any
      if (!student) continue
      students.push({
        id: student.id,
        name: student.name,
        grade: calculateGrade(student.birth_date),
        level: student.current_level || '',
        isTrial: student.status === '체험',
      })
      const key = `${date}-${cls.id}-${student.id}`
      attendanceMap[key] = {
        id: att.id,
        student_id: student.id,
        class_id: cls.id,
        status: att.status,
        makeup_of_attendance_id: att.makeup_of_attendance_id,
        memo: att.memo || '',
      }
    }

    classes.push({
      id: cls.id,
      date: cls.date,
      time: cls.time,
      group_type: cls.group_type,
      students,
    })
  }

  return { classes, attendanceMap }
}

export async function fetchClassesByWeek(start: string, end: string): Promise<{
  classes: ClassItem[]
  attendanceMap: Record<string, AttendanceRecord>
}> {
  const { data: classRows, error } = await supabase
    .from('classes')
    .select(`
      id, date, time, group_type,
      attendance (
        id, student_id, status, makeup_of_attendance_id, memo,
        students:student_id (id, name, birth_date, gender, current_level, status)
      )
    `)
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .gte('date', start)
    .lte('date', end)
    .order('time')

  if (error) {
    console.error('fetchClassesByWeek error:', error)
    return { classes: [], attendanceMap: {} }
  }

  const classes: ClassItem[] = []
  const attendanceMap: Record<string, AttendanceRecord> = {}

  for (const cls of classRows || []) {
    const students: ClassStudent[] = []
    for (const att of cls.attendance || []) {
      const student = att.students as any
      if (!student) continue
      students.push({
        id: student.id,
        name: student.name,
        grade: calculateGrade(student.birth_date),
        level: student.current_level || '',
        isTrial: student.status === '체험',
      })
      const key = `${cls.date}-${cls.id}-${student.id}`
      attendanceMap[key] = {
        id: att.id,
        student_id: student.id,
        class_id: cls.id,
        status: att.status,
        makeup_of_attendance_id: att.makeup_of_attendance_id,
        memo: att.memo || '',
      }
    }

    classes.push({
      id: cls.id,
      date: cls.date,
      time: cls.time,
      group_type: cls.group_type,
      students,
    })
  }

  return { classes, attendanceMap }
}

export async function createClass(data: {
  date: string
  time: string
  group_type: GroupType
}): Promise<ClassItem | null> {
  const { data: cls, error } = await supabase
    .from('classes')
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      date: data.date,
      time: data.time,
      group_type: data.group_type,
    })
    .select()
    .single()

  if (error) {
    console.error('createClass error:', error)
    return null
  }

  return {
    id: cls.id,
    date: cls.date,
    time: cls.time,
    group_type: cls.group_type,
    students: [],
  }
}

export async function upsertAttendance(record: {
  student_id: string
  class_id: string
  status: AttendanceStatus
  memo?: string
  makeup_of_attendance_id?: string | null
}): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        student_id: record.student_id,
        class_id: record.class_id,
        status: record.status,
        memo: record.memo || '',
        makeup_of_attendance_id: record.makeup_of_attendance_id || null,
      },
      { onConflict: 'student_id,class_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('upsertAttendance error:', error)
    return null
  }

  return {
    id: data.id,
    student_id: data.student_id,
    class_id: data.class_id,
    status: data.status,
    makeup_of_attendance_id: data.makeup_of_attendance_id,
    memo: data.memo || '',
  }
}

export async function markAllPresent(classId: string, studentIds: string[]): Promise<void> {
  for (const studentId of studentIds) {
    await upsertAttendance({
      student_id: studentId,
      class_id: classId,
      status: '출석',
    })
  }
}

export async function fetchMonthlyAttendance(
  studentId: string,
  yearMonth: string
): Promise<{
  id: string
  date: string
  time: string
  group_type: GroupType
  status: AttendanceStatus
}[]> {
  // yearMonth format: "2026-02"
  const startDate = `${yearMonth}-01`
  const [y, m] = yearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id, status,
      classes:class_id (date, time, group_type)
    `)
    .eq('student_id', studentId)
    .gte('classes.date', startDate)
    .lte('classes.date', endDate)

  if (error) {
    console.error('fetchMonthlyAttendance error:', error)
    return []
  }

  return (data || [])
    .filter((r: any) => r.classes)
    .map((r: any) => ({
      id: r.id,
      date: r.classes.date,
      time: r.classes.time,
      group_type: r.classes.group_type,
      status: r.status,
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
}

// 학생 상세 출석 (스케줄 기반으로 출석 기록 조회)
export async function fetchStudentAttendance(
  studentId: string,
  yearMonth: string
): Promise<{
  id: string
  date: string
  time: string
  group_type: string
  status: AttendanceStatus
  memo: string
}[]> {
  const startDate = `${yearMonth}-01`
  const [y, m] = yearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id, status, memo,
      classes:class_id (date, time, group_type)
    `)
    .eq('student_id', studentId)

  if (error) {
    console.error('fetchStudentAttendance error:', error)
    return []
  }

  return (data || [])
    .filter((r: any) => r.classes && r.classes.date >= startDate && r.classes.date <= endDate)
    .map((r: any) => ({
      id: r.id,
      date: r.classes.date,
      time: r.classes.time,
      group_type: r.classes.group_type,
      status: r.status,
      memo: r.memo || '',
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
}

export async function updateAttendanceStatus(id: string, status: AttendanceStatus): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .update({ status })
    .eq('id', id)

  if (error) console.error('updateAttendanceStatus error:', error)
}

export async function updateAttendanceMemo(id: string, memo: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .update({ memo })
    .eq('id', id)

  if (error) console.error('updateAttendanceMemo error:', error)
}

// ============================================================
// 체험
// ============================================================

export async function fetchTrials(): Promise<TrialReservation[]> {
  const { data, error } = await supabase
    .from('trial_reservations')
    .select(`*, classes:class_id (date, time)`)
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchTrials error:', error)
    return []
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    branch_id: t.branch_id,
    name: t.name,
    phone: t.phone,
    gender: t.gender || '',
    grade: t.grade || '',
    status: t.status,
    class_id: t.class_id,
    trial_date: t.classes?.date || '',
    trial_time: t.classes?.time || '',
    note: t.note || '',
    created_at: t.created_at,
  }))
}

export async function createTrial(data: {
  name: string
  phone: string
  gender: string
  grade: string
  note?: string
}): Promise<TrialReservation | null> {
  const { data: trial, error } = await supabase
    .from('trial_reservations')
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      name: data.name,
      phone: data.phone,
      gender: data.gender,
      grade: data.grade,
      status: '예정' as TrialStatus,
      note: data.note || '',
    })
    .select()
    .single()

  if (error) {
    console.error('createTrial error:', error)
    return null
  }

  return {
    id: trial.id,
    branch_id: trial.branch_id,
    name: trial.name,
    phone: trial.phone,
    gender: trial.gender || '',
    grade: trial.grade || '',
    status: trial.status,
    class_id: trial.class_id,
    trial_date: '',
    trial_time: '',
    note: trial.note || '',
    created_at: trial.created_at,
  }
}

export async function updateTrial(trial: TrialReservation): Promise<void> {
  const { error } = await supabase
    .from('trial_reservations')
    .update({
      name: trial.name,
      phone: trial.phone,
      gender: trial.gender,
      grade: trial.grade,
      status: trial.status,
      note: trial.note,
    })
    .eq('id', trial.id)

  if (error) console.error('updateTrial error:', error)
}

export async function deleteTrial(id: string): Promise<void> {
  const { error } = await supabase
    .from('trial_reservations')
    .delete()
    .eq('id', id)

  if (error) console.error('deleteTrial error:', error)
}

// ============================================================
// 학생 검색 (수업에 학생 추가 시)
// ============================================================

export async function fetchSearchableStudents(): Promise<{
  id: string
  name: string
  gender: string
  grade: string
  level: string
  className: string
  classTime: string
  phone: string
  status: string
}[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id, name, birth_date, gender, phone, status, category, sessions_per_week, current_level,
      student_schedules (weekday, time, group_type)
    `)
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .in('status', ['재원', '휴원'])
    .order('name')

  if (error) {
    console.error('fetchSearchableStudents error:', error)
    return []
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    grade: calculateGrade(s.birth_date),
    level: s.current_level || '',
    className: formatClassName(s.category, s.sessions_per_week),
    classTime: formatClassTime(s.student_schedules || []),
    phone: s.phone,
    status: s.status,
  }))
}

export async function fetchStudentSchedules(studentId: string): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from('student_schedules')
    .select('*')
    .eq('student_id', studentId)

  if (error) {
    console.error('fetchStudentSchedules error:', error)
    return []
  }

  return data || []
}
