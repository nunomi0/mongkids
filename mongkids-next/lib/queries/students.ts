import {
  DEFAULT_BRANCH_ID,
  calculateGrade,
  formatClassName,
  formatClassTime,
  formatLastPaymentMonth,
  formatPaymentAmount,
  LevelType,
  Student,
  StudentFormData,
  StudentListItem,
  StudentSchedule,
  supabase,
} from "./shared"

export async function fetchStudentsList(): Promise<StudentListItem[]> {
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id, name, birth_date, gender, phone, status, category, sessions_per_week, current_level,
      student_schedules (weekday, time, group_type),
      payments (target_month, amount)
    `)
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("fetchStudentsList error:", error)
    return []
  }

  return (students || []).map((s: any) => {
    const schedules = s.student_schedules || []
    const payments = (s.payments || []) as { target_month: string; amount: number }[]
    const sorted = [...payments].sort((a, b) => b.target_month.localeCompare(a.target_month))
    const lastPayment = sorted[0]

    return {
      id: s.id,
      name: s.name,
      gender: s.gender,
      grade: calculateGrade(s.birth_date),
      level: s.current_level || "",
      className: formatClassName(s.category, s.sessions_per_week),
      classTime: formatClassTime(schedules),
      phone: s.phone,
      lastPayment: lastPayment ? formatLastPaymentMonth(lastPayment.target_month) : "",
      paymentAmount: lastPayment ? formatPaymentAmount(lastPayment.amount) : "",
      status: s.status,
    }
  })
}

export async function fetchStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      student_schedules (id, weekday, time, group_type)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("fetchStudent error:", error)
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
  const { data: student, error: studentError } = await supabase
    .from("students")
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
      memo: "",
    })
    .select()
    .single()

  if (studentError) {
    console.error("createStudent error:", studentError)
    return null
  }

  if (schedules.length > 0) {
    const { error: schedError } = await supabase
      .from("student_schedules")
      .insert(
        schedules.map((s) => ({
          student_id: student.id,
          weekday: s.weekday,
          time: s.time,
          group_type: s.group_type,
        }))
      )

    if (schedError) console.error("createStudent schedules error:", schedError)
  }

  const levels: LevelType[] = ["WHITE", "YELLOW", "GREEN", "BLUE", "RED", "BLACK", "GOLD"]
  const { error: levelError } = await supabase
    .from("student_levels")
    .insert(
      levels.map((level) => ({
        student_id: student.id,
        level,
        acquired_date: null,
      }))
    )

  if (levelError) console.error("createStudent levels error:", levelError)

  return fetchStudent(student.id)
}

export async function updateStudent(
  id: string,
  formData: Partial<Student>,
  schedules?: StudentSchedule[]
): Promise<void> {
  const { error } = await supabase
    .from("students")
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
    .eq("id", id)

  if (error) {
    console.error("updateStudent error:", error)
    return
  }

  if (schedules) {
    await supabase.from("student_schedules").delete().eq("student_id", id)
    if (schedules.length > 0) {
      await supabase.from("student_schedules").insert(
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
  const { error } = await supabase.from("students").update({ status }).eq("id", id)
  if (error) console.error("updateStudentStatus error:", error)
}

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
    .from("students")
    .select(`
      id, name, birth_date, gender, phone, status, category, sessions_per_week, current_level,
      student_schedules (weekday, time, group_type)
    `)
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .in("status", ["재원", "휴원"])
    .order("name")

  if (error) {
    console.error("fetchSearchableStudents error:", error)
    return []
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    grade: calculateGrade(s.birth_date),
    level: s.current_level || "",
    className: formatClassName(s.category, s.sessions_per_week),
    classTime: formatClassTime(s.student_schedules || []),
    phone: s.phone,
    status: s.status,
  }))
}

export async function fetchStudentSchedules(studentId: string): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("*")
    .eq("student_id", studentId)

  if (error) {
    console.error("fetchStudentSchedules error:", error)
    return []
  }

  return data || []
}
