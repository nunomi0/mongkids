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

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getWeekdayFromDate(date: string): number {
  return new Date(`${date}T00:00:00`).getDay()
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  while (cursor <= end) {
    dates.push(formatLocalDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

async function syncPlannedAttendances(
  studentId: string,
  nextStatus: string | undefined,
  schedules: StudentSchedule[]
): Promise<void> {
  const today = formatLocalDate(new Date())

  const { data: futureAttendances, error: futureAttendanceError } = await supabase
    .from("attendance")
    .select(`
      id, class_id, status,
      classes!inner (date, time, group_type)
    `)
    .eq("student_id", studentId)
    .gte("classes.date", today)

  if (futureAttendanceError) {
    console.error("syncPlannedAttendances future attendance error:", futureAttendanceError)
    return
  }

  const plannedAttendanceIds: string[] = []
  const lockedClassIds = new Set<string>()

  for (const attendance of futureAttendances || []) {
    if (attendance.status === "예정") {
      plannedAttendanceIds.push(attendance.id)
    } else {
      lockedClassIds.add(attendance.class_id)
    }
  }

  if (plannedAttendanceIds.length > 0) {
    const { error: deleteAttendanceError } = await supabase
      .from("attendance")
      .delete()
      .in("id", plannedAttendanceIds)

    if (deleteAttendanceError) {
      console.error("syncPlannedAttendances delete error:", deleteAttendanceError)
      return
    }
  }

  if (nextStatus !== "재원" || schedules.length === 0) return

  const { data: futureClasses, error: futureClassError } = await supabase
    .from("classes")
    .select("id, date, time, group_type")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .gte("date", today)
    .order("date")
    .order("time")

  if (futureClassError) {
    console.error("syncPlannedAttendances future class error:", futureClassError)
    return
  }

  if (!futureClasses || futureClasses.length === 0) return

  const maxDate = futureClasses[futureClasses.length - 1].date
  const dates = getDateRange(today, maxDate)
  const classKeyToId = new Map<string, string>()

  for (const cls of futureClasses) {
    classKeyToId.set(`${cls.date}|${cls.time}|${cls.group_type}`, cls.id)
  }

  const missingClassRows: { branch_id: string; date: string; time: string; group_type: string }[] = []
  for (const date of dates) {
    const weekday = getWeekdayFromDate(date)
    for (const schedule of schedules) {
      if (schedule.weekday !== weekday) continue
      const key = `${date}|${schedule.time}|${schedule.group_type}`
      if (!classKeyToId.has(key)) {
        missingClassRows.push({
          branch_id: DEFAULT_BRANCH_ID,
          date,
          time: schedule.time,
          group_type: schedule.group_type,
        })
      }
    }
  }

  if (missingClassRows.length > 0) {
    const { error: createClassError } = await supabase
      .from("classes")
      .upsert(missingClassRows, { onConflict: "branch_id,date,time,group_type", ignoreDuplicates: true })

    if (createClassError) {
      console.error("syncPlannedAttendances create class error:", createClassError)
      return
    }
  }

  const { data: syncedFutureClasses, error: syncedFutureClassError } = await supabase
    .from("classes")
    .select("id, date, time, group_type")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .gte("date", today)
    .lte("date", maxDate)

  if (syncedFutureClassError) {
    console.error("syncPlannedAttendances refetch class error:", syncedFutureClassError)
    return
  }

  const attendanceRows: { student_id: string; class_id: string; status: "예정" }[] = []
  for (const cls of syncedFutureClasses || []) {
    if (lockedClassIds.has(cls.id)) continue
    const weekday = getWeekdayFromDate(cls.date)
    const isScheduledClass = schedules.some(
      (schedule) =>
        schedule.weekday === weekday &&
        schedule.time === cls.time &&
        schedule.group_type === cls.group_type
    )

    if (isScheduledClass) {
      attendanceRows.push({
        student_id: studentId,
        class_id: cls.id,
        status: "예정",
      })
    }
  }

  if (attendanceRows.length === 0) return

  const batchSize = 500
  for (let i = 0; i < attendanceRows.length; i += batchSize) {
    const batch = attendanceRows.slice(i, i + batchSize)
    const { error: upsertAttendanceError } = await supabase
      .from("attendance")
      .upsert(batch, { onConflict: "student_id,class_id", ignoreDuplicates: true })

    if (upsertAttendanceError) {
      console.error("syncPlannedAttendances upsert error:", upsertAttendanceError)
      return
    }
  }
}

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
  let nextStatus = formData.status

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
    if (!nextStatus) {
      const { data: currentStudent, error: currentStudentError } = await supabase
        .from("students")
        .select("status")
        .eq("id", id)
        .single()

      if (currentStudentError) {
        console.error("updateStudent status fetch error:", currentStudentError)
        return
      }

      nextStatus = currentStudent.status
    }

    const { error: deleteScheduleError } = await supabase
      .from("student_schedules")
      .delete()
      .eq("student_id", id)

    if (deleteScheduleError) {
      console.error("updateStudent schedules delete error:", deleteScheduleError)
      return
    }

    if (schedules.length > 0) {
      const { error: insertScheduleError } = await supabase
        .from("student_schedules")
        .insert(
        schedules.map((s) => ({
          student_id: id,
          weekday: s.weekday,
          time: s.time,
          group_type: s.group_type,
        }))
        )

      if (insertScheduleError) {
        console.error("updateStudent schedules insert error:", insertScheduleError)
        return
      }
    }

    await syncPlannedAttendances(id, nextStatus, schedules)
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
