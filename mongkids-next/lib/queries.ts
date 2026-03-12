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
      current_level: null,
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

  // 3. Insert level histories (7 levels, none acquired by default)
  const levels: LevelType[] = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD']
  const { error: levelError } = await supabase
    .from('student_levels')
    .insert(
      levels.map((level) => ({
        student_id: student.id,
        level,
        acquired_date: null,
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

// ============================================================
// 대시보드
// ============================================================

export async function fetchStudentStatusCounts(): Promise<{
  total: number
  active: number
  paused: number
  withdrawn: number
  trial: number
}> {
  const { data, error } = await supabase
    .from('students')
    .select('status')
    .eq('branch_id', DEFAULT_BRANCH_ID)

  if (error) {
    console.error('fetchStudentStatusCounts error:', error)
    return { total: 0, active: 0, paused: 0, withdrawn: 0, trial: 0 }
  }

  const counts = { total: 0, active: 0, paused: 0, withdrawn: 0, trial: 0 }
  for (const s of data || []) {
    counts.total++
    if (s.status === '재원') counts.active++
    else if (s.status === '휴원') counts.paused++
    else if (s.status === '퇴원') counts.withdrawn++
    else if (s.status === '체험') counts.trial++
  }
  return counts
}

export async function fetchTodayTrials(date: string): Promise<TrialReservation[]> {
  const { data, error } = await supabase
    .from('trial_reservations')
    .select(`*, classes:class_id (date, time)`)
    .eq('branch_id', DEFAULT_BRANCH_ID)

  if (error) {
    console.error('fetchTodayTrials error:', error)
    return []
  }

  return (data || [])
    .filter((t: any) => t.classes?.date === date)
    .map((t: any) => ({
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

export async function fetchUnpaidStudents(targetMonth: string): Promise<{
  id: string
  name: string
  phone: string
  className: string
}[]> {
  // 재원 학생 목록
  const { data: students, error: studentErr } = await supabase
    .from('students')
    .select('id, name, phone, category, sessions_per_week')
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .eq('status', '재원')

  if (studentErr) {
    console.error('fetchUnpaidStudents students error:', studentErr)
    return []
  }

  // 해당 월 결제한 학생 ID 목록
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('student_id')
    .eq('target_month', targetMonth)

  if (payErr) {
    console.error('fetchUnpaidStudents payments error:', payErr)
    return []
  }

  const paidIds = new Set((payments || []).map((p: any) => p.student_id))

  return (students || [])
    .filter((s: any) => !paidIds.has(s.id))
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      className: formatClassName(s.category, s.sessions_per_week),
    }))
}

const LEVEL_ORDER: LevelType[] = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD']

function getNextLevel(current: LevelType): LevelType | null {
  const idx = LEVEL_ORDER.indexOf(current)
  return idx >= 0 && idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null
}

function monthsDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export async function fetchLevelTestCandidates(yearMonth: string): Promise<{
  id: string
  name: string
  grade: string
  currentLevel: LevelType
  currentLevelDate: string
  targetLevel: LevelType
  monthsSince: number
  requiredMonths: number
}[]> {
  // 1. 재원 학생 + current_level
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, name, birth_date, current_level')
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .eq('status', '재원')

  if (sErr) {
    console.error('fetchLevelTestCandidates students error:', sErr)
    return []
  }

  // 2. 학생 레벨 이력 (현재 레벨의 acquired_date)
  const { data: levels, error: lErr } = await supabase
    .from('student_levels')
    .select('student_id, level, acquired_date')

  if (lErr) {
    console.error('fetchLevelTestCandidates levels error:', lErr)
    return []
  }

  // 3. 레벨별 필요 개월 수
  const { data: configs, error: cErr } = await supabase
    .from('level_test_configs')
    .select('level, required_months')

  if (cErr) {
    console.error('fetchLevelTestCandidates configs error:', cErr)
    return []
  }

  const configMap = new Map((configs || []).map((c: any) => [c.level, c.required_months]))
  const levelMap = new Map<string, string>() // `${student_id}-${level}` → acquired_date
  for (const l of levels || []) {
    if (l.acquired_date) {
      levelMap.set(`${l.student_id}-${l.level}`, l.acquired_date)
    }
  }

  const result: {
    id: string
    name: string
    grade: string
    currentLevel: LevelType
    currentLevelDate: string
    targetLevel: LevelType
    monthsSince: number
    requiredMonths: number
  }[] = []

  for (const s of students || []) {
    if (!s.current_level || s.current_level === 'GOLD') continue

    const nextLevel = getNextLevel(s.current_level as LevelType)
    if (!nextLevel) continue

    const acquiredDate = levelMap.get(`${s.id}-${s.current_level}`)
    if (!acquiredDate) continue

    const required = configMap.get(nextLevel) || 0
    const elapsed = monthsDiff(acquiredDate.slice(0, 7), yearMonth)

    if (elapsed >= required) {
      result.push({
        id: s.id,
        name: s.name,
        grade: calculateGrade(s.birth_date),
        currentLevel: s.current_level as LevelType,
        currentLevelDate: acquiredDate,
        targetLevel: nextLevel,
        monthsSince: elapsed,
        requiredMonths: required,
      })
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchPendingMakeups(): Promise<{
  id: string
  name: string
  grade: string
  phone: string
  className: string
  absences: { id: string; date: string; time: string; groupType: string }[]
}[]> {
  // 1. 결석 기록 (최근 3개월)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const cutoffDate = threeMonthsAgo.toISOString().split('T')[0]

  const { data: absences, error: aErr } = await supabase
    .from('attendance')
    .select(`
      id, student_id, status,
      classes:class_id (date, time, group_type)
    `)
    .eq('status', '결석')
    .gte('classes.date', cutoffDate)

  if (aErr) {
    console.error('fetchPendingMakeups absences error:', aErr)
    return []
  }

  // 결석 기록 필터 (classes가 null인 것 제거)
  const validAbsences = (absences || []).filter((a: any) => a.classes && a.classes.date >= cutoffDate)

  if (validAbsences.length === 0) return []

  // 2. 보강 레코드 확인 (makeup_of_attendance_id가 결석 id인 것)
  const absenceIds = validAbsences.map((a: any) => a.id)
  const { data: makeups, error: mErr } = await supabase
    .from('attendance')
    .select('makeup_of_attendance_id, status')
    .in('makeup_of_attendance_id', absenceIds)

  if (mErr) {
    console.error('fetchPendingMakeups makeups error:', mErr)
    return []
  }

  // 보강 완료/예정인 결석 ID
  const resolvedIds = new Set(
    (makeups || [])
      .filter((m: any) => m.status === '보강완료' || m.status === '보강예정')
      .map((m: any) => m.makeup_of_attendance_id)
  )

  // 미처리 결석만
  const unresolvedAbsences = validAbsences.filter((a: any) => !resolvedIds.has(a.id))

  if (unresolvedAbsences.length === 0) return []

  // 3. 학생 정보
  const studentIds = [...new Set(unresolvedAbsences.map((a: any) => a.student_id))]
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, name, birth_date, phone, category, sessions_per_week, status')
    .in('id', studentIds)
    .eq('status', '재원')

  if (sErr) {
    console.error('fetchPendingMakeups students error:', sErr)
    return []
  }

  const studentMap = new Map((students || []).map((s: any) => [s.id, s]))

  // 학생별 그룹핑
  const grouped = new Map<string, {
    id: string; date: string; time: string; groupType: string
  }[]>()

  for (const a of unresolvedAbsences) {
    const cls = (a as any).classes
    if (!studentMap.has(a.student_id)) continue
    if (!grouped.has(a.student_id)) grouped.set(a.student_id, [])
    grouped.get(a.student_id)!.push({
      id: a.id,
      date: cls.date,
      time: cls.time,
      groupType: cls.group_type,
    })
  }

  return Array.from(grouped.entries())
    .map(([studentId, absList]) => {
      const s = studentMap.get(studentId)!
      return {
        id: studentId,
        name: s.name,
        grade: calculateGrade(s.birth_date),
        phone: s.phone,
        className: formatClassName(s.category, s.sessions_per_week),
        absences: absList.sort((a, b) => b.date.localeCompare(a.date)),
      }
    })
    .sort((a, b) => b.absences.length - a.absences.length)
}

export async function fetchStudentDistribution(): Promise<{
  byCategory: { category: string; count: number }[]
  byLevel: { level: string; count: number }[]
}> {
  const { data, error } = await supabase
    .from('students')
    .select('category, current_level')
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .eq('status', '재원')

  if (error) {
    console.error('fetchStudentDistribution error:', error)
    return { byCategory: [], byLevel: [] }
  }

  const catCounts = new Map<string, number>()
  const lvlCounts = new Map<string, number>()

  for (const s of data || []) {
    catCounts.set(s.category, (catCounts.get(s.category) || 0) + 1)
    const lv = s.current_level || '미정'
    lvlCounts.set(lv, (lvlCounts.get(lv) || 0) + 1)
  }

  const catOrder = ['어린이', '청소년', '성인', '스페셜']
  const byCategory = catOrder
    .filter((c) => catCounts.has(c))
    .map((c) => ({ category: c, count: catCounts.get(c)! }))

  const byLevel = LEVEL_ORDER
    .filter((l) => lvlCounts.has(l))
    .map((l) => ({ level: l, count: lvlCounts.get(l)! }))

  return { byCategory, byLevel }
}

export async function fetchRecentChanges(): Promise<{
  type: 'registration' | 'level_up'
  studentId: string
  studentName: string
  grade: string
  date: string
  level?: LevelType
}[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()
  const cutoffDate = cutoff.split('T')[0]

  // 신규 등록
  const { data: newStudents, error: sErr } = await supabase
    .from('students')
    .select('id, name, birth_date, created_at')
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .eq('status', '재원')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(10)

  if (sErr) console.error('fetchRecentChanges students error:', sErr)

  // 레벨 승급
  const { data: levelUps, error: lErr } = await supabase
    .from('student_levels')
    .select('student_id, level, acquired_date, students:student_id (name, birth_date, branch_id)')
    .neq('level', 'WHITE')
    .gte('acquired_date', cutoffDate)
    .order('acquired_date', { ascending: false })
    .limit(10)

  if (lErr) console.error('fetchRecentChanges levels error:', lErr)

  const results: {
    type: 'registration' | 'level_up'
    studentId: string
    studentName: string
    grade: string
    date: string
    level?: LevelType
  }[] = []

  for (const s of newStudents || []) {
    results.push({
      type: 'registration',
      studentId: s.id,
      studentName: s.name,
      grade: calculateGrade(s.birth_date),
      date: s.created_at.split('T')[0],
    })
  }

  for (const l of levelUps || []) {
    const student = (l as any).students
    if (!student || student.branch_id !== DEFAULT_BRANCH_ID) continue
    results.push({
      type: 'level_up',
      studentId: l.student_id,
      studentName: student.name,
      grade: calculateGrade(student.birth_date),
      date: l.acquired_date,
      level: l.level as LevelType,
    })
  }

  return results.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
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

// ============================================================
// 엑셀 업로드/다운로드용 쿼리
// ============================================================

import type { ParsedStudent, ParsedPayment } from '@/lib/excel/member-parser'
import type { ParsedClass, ParsedAttendance } from '@/lib/excel/attendance-parser'
import type { ExportStudent } from '@/lib/excel/member-generator'
import type { ExportClassAttendance } from '@/lib/excel/attendance-generator'

/** 회원명단 bulk upsert (이름+생년월일로 매칭) */
export async function upsertStudentsFromExcel(
  studentsMap: Map<string, ParsedStudent>,
  payments: ParsedPayment[]
): Promise<{ created: number; updated: number; paymentsCreated: number; errors: string[] }> {
  let created = 0
  let updated = 0
  let paymentsCreated = 0
  const errors: string[] = []
  const studentIdMap = new Map<string, string>() // student_key → student.id

  // 전체 기존 학생을 한 번에 조회하여 로컬 매칭 (N+1 쿼리 방지)
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name, birth_date')
    .eq('branch_id', DEFAULT_BRANCH_ID)

  // 이름+생년월일 → id 매핑, 이름만 → id 매핑 (fallback)
  const existingByKey = new Map<string, string>()
  const existingByName = new Map<string, string>()
  for (const s of allStudents || []) {
    existingByKey.set(`${s.name}_${s.birth_date}`, s.id)
    existingByName.set(s.name, s.id)
  }

  for (const [key, student] of studentsMap) {
    try {
      // 이름+생년월일로 매칭, 실패 시 이름만으로 매칭
      const existingId = existingByKey.get(key) || existingByName.get(student.name)

      if (existingId) {
        // 기존 학생 업데이트
        const { error } = await supabase
          .from('students')
          .update({
            gender: student.gender,
            phone: student.phone,
            shoe_size: student.shoe_size,
            category: student.category,
            sessions_per_week: student.sessions_per_week,
            current_level: student.current_level,
            memo: student.memo,
          })
          .eq('id', existingId)

        if (error) {
          errors.push(`학생 "${student.name}" 업데이트 오류: ${error.message}`)
          continue
        }

        studentIdMap.set(key, existingId)
        updated++

        // 스케줄 교체
        await supabase.from('student_schedules').delete().eq('student_id', existingId)
        if (student.schedules.length > 0) {
          await supabase.from('student_schedules').insert(
            student.schedules.map((s) => ({
              student_id: existingId,
              weekday: s.weekday,
              time: s.time,
              group_type: s.group_type,
            }))
          )
        }

        // 레벨 upsert
        if (student.current_level) {
          await supabase.from('student_levels').upsert(
            { student_id: existingId, level: student.current_level, acquired_date: new Date().toISOString().split('T')[0] },
            { onConflict: 'student_id,level' }
          )
        }
      } else {
        // 신규 생성
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert({
            branch_id: DEFAULT_BRANCH_ID,
            name: student.name,
            birth_date: student.birth_date,
            gender: student.gender,
            phone: student.phone,
            shoe_size: student.shoe_size,
            status: '재원' as const,
            category: student.category,
            sessions_per_week: student.sessions_per_week,
            current_level: student.current_level || null,
            memo: student.memo,
          })
          .select()
          .single()

        if (error || !newStudent) {
          errors.push(`학생 "${student.name}" 생성 오류: ${error?.message} (birth_date: ${student.birth_date})`)
          continue
        }

        studentIdMap.set(key, newStudent.id)
        // 로컬 맵도 갱신 (같은 이름 다음 처리 시 충돌 방지)
        existingByKey.set(key, newStudent.id)
        existingByName.set(student.name, newStudent.id)
        created++

        // 스케줄 삽입
        if (student.schedules.length > 0) {
          await supabase.from('student_schedules').insert(
            student.schedules.map((s) => ({
              student_id: newStudent.id,
              weekday: s.weekday,
              time: s.time,
              group_type: s.group_type,
            }))
          )
        }

        // 레벨 히스토리 초기화 (upsert로 중복 안전)
        const levels: LevelType[] = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD']
        for (const level of levels) {
          await supabase.from('student_levels').upsert(
            {
              student_id: newStudent.id,
              level,
              acquired_date:
                student.current_level && level === student.current_level
                  ? new Date().toISOString().split('T')[0]
                  : null,
            },
            { onConflict: 'student_id,level' }
          )
        }
      }
    } catch (err) {
      errors.push(`학생 "${student.name}" 처리 오류: ${err}`)
    }
  }

  // 결제 데이터 삽입
  for (const payment of payments) {
    const studentId = studentIdMap.get(payment.student_key)
    if (!studentId) continue

    try {
      // 같은 학생+target_month 결제가 이미 있는지 확인
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('id')
        .eq('student_id', studentId)
        .eq('target_month', payment.target_month)
        .limit(1)

      if (existingPayments && existingPayments.length > 0) continue // 이미 있으면 스킵

      if (payment.amount > 0) {
        const { error } = await supabase.from('payments').insert({
          student_id: studentId,
          payment_date: payment.payment_date,
          target_month: payment.target_month,
          amount: payment.amount,
          method: '계좌이체' as const,
          discounts: payment.discounts,
          memo: payment.memo,
        })

        if (error) {
          errors.push(`결제 생성 오류 (${payment.student_key}): ${error.message}`)
        } else {
          paymentsCreated++
        }
      }
    } catch (err) {
      errors.push(`결제 처리 오류 (${payment.student_key}): ${err}`)
    }
  }

  return { created, updated, paymentsCreated, errors }
}

/** 출석 데이터 bulk upsert */
export async function upsertAttendanceFromExcel(
  classes: ParsedClass[],
  attendances: ParsedAttendance[]
): Promise<{ classesCreated: number; attendancesCreated: number; errors: string[] }> {
  let classesCreated = 0
  let attendancesCreated = 0
  const errors: string[] = []

  // 1. 수업 upsert → class_id 매핑
  const classIdMap = new Map<string, string>() // date_time_groupType → class_id

  for (const cls of classes) {
    try {
      // 기존 수업 조회
      const { data: existing } = await supabase
        .from('classes')
        .select('id')
        .eq('branch_id', DEFAULT_BRANCH_ID)
        .eq('date', cls.date)
        .eq('time', cls.time)
        .eq('group_type', cls.group_type)
        .maybeSingle()

      if (existing) {
        classIdMap.set(`${cls.date}_${cls.time}_${cls.group_type}`, existing.id)
      } else {
        const { data: newClass, error } = await supabase
          .from('classes')
          .insert({
            branch_id: DEFAULT_BRANCH_ID,
            date: cls.date,
            time: cls.time,
            group_type: cls.group_type,
          })
          .select()
          .single()

        if (error || !newClass) {
          errors.push(`수업 생성 오류 (${cls.date} ${cls.time}): ${error?.message}`)
          continue
        }

        classIdMap.set(`${cls.date}_${cls.time}_${cls.group_type}`, newClass.id)
        classesCreated++
      }
    } catch (err) {
      errors.push(`수업 처리 오류 (${cls.date} ${cls.time}): ${err}`)
    }
  }

  // 2. 학생 이름 → ID 캐시
  const studentNameCache = new Map<string, string>()

  async function getStudentId(name: string): Promise<string | null> {
    if (studentNameCache.has(name)) return studentNameCache.get(name)!

    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('branch_id', DEFAULT_BRANCH_ID)
      .eq('name', name)
      .limit(1)

    if (data && data.length > 0) {
      studentNameCache.set(name, data[0].id)
      return data[0].id
    }
    return null
  }

  // 3. 출석 upsert
  for (const att of attendances) {
    try {
      const classKey = `${att.class_date}_${att.class_time}_${att.group_type}`
      const classId = classIdMap.get(classKey)
      if (!classId) {
        errors.push(`수업 없음: ${classKey} (학생: ${att.student_name})`)
        continue
      }

      const studentId = await getStudentId(att.student_name)
      if (!studentId) {
        errors.push(`학생 없음: "${att.student_name}" (${att.class_date} ${att.class_time})`)
        continue
      }

      const { error } = await supabase
        .from('attendance')
        .upsert(
          {
            student_id: studentId,
            class_id: classId,
            status: att.status,
            is_test: att.is_test,
            test_level: att.test_level,
            memo: att.memo,
          },
          { onConflict: 'student_id,class_id' }
        )

      if (error) {
        errors.push(`출석 upsert 오류 (${att.student_name}, ${att.class_date}): ${error.message}`)
      } else {
        attendancesCreated++
      }
    } catch (err) {
      errors.push(`출석 처리 오류 (${att.student_name}): ${err}`)
    }
  }

  return { classesCreated, attendancesCreated, errors }
}

/** 다운로드용 - 전체 재원 학생 데이터 조회 */
export async function fetchAllStudentsForExport(): Promise<ExportStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id, name, birth_date, gender, phone, shoe_size, category,
      sessions_per_week, current_level, memo, status,
      student_schedules (weekday, time),
      payments (payment_date, target_month, amount, discounts)
    `)
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .eq('status', '재원')
    .order('name')

  if (error) {
    console.error('fetchAllStudentsForExport error:', error)
    return []
  }

  return (data || []).map((s: any) => {
    const payments = (s.payments || []) as any[]
    const sorted = [...payments].sort((a, b) => b.target_month.localeCompare(a.target_month))
    const lastPayment = sorted[0]

    return {
      name: s.name,
      gender: s.gender,
      birth_date: s.birth_date,
      shoe_size: s.shoe_size,
      current_level: s.current_level,
      phone: s.phone,
      category: s.category,
      sessions_per_week: s.sessions_per_week,
      memo: s.memo || '',
      schedules: s.student_schedules || [],
      last_payment: lastPayment
        ? {
            payment_date: lastPayment.payment_date,
            target_month: lastPayment.target_month,
            amount: lastPayment.amount,
            discounts: lastPayment.discounts || [],
          }
        : undefined,
    }
  })
}

/** 다운로드용 - 출석 데이터 조회 */
export async function fetchAttendanceForExport(
  year: number,
  startMonth: number,
  endMonth: number
): Promise<ExportClassAttendance[]> {
  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`
  const endDay = new Date(year, endMonth, 0).getDate()
  const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      status, is_test, test_level, memo,
      students:student_id (name, birth_date, gender),
      classes:class_id (date, time, group_type)
    `)
    .gte('classes.date', startDate)
    .lte('classes.date', endDate)

  if (error) {
    console.error('fetchAttendanceForExport error:', error)
    return []
  }

  return (data || [])
    .filter((r: any) => r.classes && r.students)
    .map((r: any) => {
      const birthDate = r.students.birth_date
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--

      return {
        class_date: r.classes.date,
        class_time: r.classes.time,
        group_type: r.classes.group_type,
        student_name: r.students.name,
        student_age: age,
        student_gender: r.students.gender,
        status: r.status,
        is_test: r.is_test || false,
        test_level: r.test_level || null,
        memo: r.memo || '',
      }
    })
}

// ============================================================
// 월별 시간표 자동 생성
// ============================================================

export type GenerateScheduleResult = {
  classesCreated: number
  attendancesCreated: number
  studentsProcessed: number
  errors: string[]
}

/**
 * 재원 학생의 student_schedules 기반으로 targetMonth(YYYY-MM)의
 * classes + attendance 레코드를 생성한다.
 * 이미 존재하는 레코드는 UNIQUE 제약으로 스킵 → 멱등(idempotent).
 */
export async function generateMonthlySchedule(
  targetMonth: string
): Promise<GenerateScheduleResult> {
  const errors: string[] = []
  const [year, month] = targetMonth.split('-').map(Number)

  // 1. 해당 월의 요일별 날짜 목록 구축 (weekday 0=일 ~ 6=토)
  const datesByWeekday = new Map<number, string[]>()
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(year, month - 1, day).getDay()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (!datesByWeekday.has(weekday)) datesByWeekday.set(weekday, [])
    datesByWeekday.get(weekday)!.push(dateStr)
  }

  // 2. 재원 학생 + 스케줄 조회
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, student_schedules(weekday, time, group_type)')
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .eq('status', '재원')

  if (studentsError) {
    return { classesCreated: 0, attendancesCreated: 0, studentsProcessed: 0, errors: [studentsError.message] }
  }

  const activeStudents = students || []

  // 3. 필요한 수업 (date, time, group_type) 조합 수집
  const neededClassKeys = new Set<string>() // "date|time|group_type"
  for (const student of activeStudents) {
    for (const sched of (student.student_schedules as any[] || [])) {
      const dates = datesByWeekday.get(sched.weekday) || []
      for (const date of dates) {
        neededClassKeys.add(`${date}|${sched.time}|${sched.group_type}`)
      }
    }
  }

  // 4. classes bulk upsert (ignoreDuplicates → UNIQUE 충돌 무시)
  const classRows = Array.from(neededClassKeys).map(key => {
    const [date, time, group_type] = key.split('|')
    return { branch_id: DEFAULT_BRANCH_ID, date, time, group_type }
  })

  let classesCreated = 0
  if (classRows.length > 0) {
    const { data: upserted, error: classError } = await supabase
      .from('classes')
      .upsert(classRows, { onConflict: 'branch_id,date,time,group_type', ignoreDuplicates: true })
      .select('id')

    if (classError) {
      errors.push(`수업 생성 오류: ${classError.message}`)
    } else {
      classesCreated = upserted?.length ?? 0
    }
  }

  // 5. 해당 월 전체 classes 조회 → (date|time|group_type) → class_id 맵
  const { data: monthClasses, error: fetchError } = await supabase
    .from('classes')
    .select('id, date, time, group_type')
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('date', `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`)

  if (fetchError) {
    errors.push(`수업 조회 오류: ${fetchError.message}`)
    return { classesCreated, attendancesCreated: 0, studentsProcessed: activeStudents.length, errors }
  }

  const classIdMap = new Map<string, string>()
  for (const cls of monthClasses || []) {
    classIdMap.set(`${cls.date}|${cls.time}|${cls.group_type}`, cls.id)
  }

  // 6. attendance bulk upsert
  const attendanceRows: { student_id: string; class_id: string; status: string }[] = []
  for (const student of activeStudents) {
    for (const sched of (student.student_schedules as any[] || [])) {
      const dates = datesByWeekday.get(sched.weekday) || []
      for (const date of dates) {
        const classId = classIdMap.get(`${date}|${sched.time}|${sched.group_type}`)
        if (classId) {
          attendanceRows.push({ student_id: student.id, class_id: classId, status: '예정' })
        }
      }
    }
  }

  let attendancesCreated = 0
  if (attendanceRows.length > 0) {
    // 배치 처리 (500건씩)
    const batchSize = 500
    for (let i = 0; i < attendanceRows.length; i += batchSize) {
      const batch = attendanceRows.slice(i, i + batchSize)
      const { data: upserted, error: attendError } = await supabase
        .from('attendance')
        .upsert(batch, { onConflict: 'student_id,class_id', ignoreDuplicates: true })
        .select('id')

      if (attendError) {
        errors.push(`출석 생성 오류 (batch ${i / batchSize + 1}): ${attendError.message}`)
      } else {
        attendancesCreated += upserted?.length ?? 0
      }
    }
  }

  return { classesCreated, attendancesCreated, studentsProcessed: activeStudents.length, errors }
}
