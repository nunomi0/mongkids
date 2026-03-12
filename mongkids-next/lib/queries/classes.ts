import {
  AttendanceRecord,
  AttendanceStatus,
  calculateGrade,
  ClassItem,
  ClassStudent,
  DEFAULT_BRANCH_ID,
  GroupType,
  StudentSchedule,
  supabase,
} from "./shared"

export async function fetchClassesByDate(date: string): Promise<{
  classes: ClassItem[]
  attendanceMap: Record<string, AttendanceRecord>
}> {
  const { data: classRows, error: classError } = await supabase
    .from("classes")
    .select(`
      id, date, time, group_type,
      attendance (
        id, student_id, status, makeup_of_attendance_id, memo,
        students:student_id (id, name, birth_date, gender, current_level, status)
      )
    `)
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .eq("date", date)
    .order("time")

  if (classError) {
    console.error("fetchClassesByDate error:", classError)
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
        level: student.current_level || "",
        isTrial: student.status === "체험",
      })
      const key = `${date}-${cls.id}-${student.id}`
      attendanceMap[key] = {
        id: att.id,
        student_id: student.id,
        class_id: cls.id,
        status: att.status,
        makeup_of_attendance_id: att.makeup_of_attendance_id,
        memo: att.memo || "",
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
    .from("classes")
    .select(`
      id, date, time, group_type,
      attendance (
        id, student_id, status, makeup_of_attendance_id, memo,
        students:student_id (id, name, birth_date, gender, current_level, status)
      )
    `)
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .gte("date", start)
    .lte("date", end)
    .order("time")

  if (error) {
    console.error("fetchClassesByWeek error:", error)
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
        level: student.current_level || "",
        isTrial: student.status === "체험",
      })
      const key = `${cls.date}-${cls.id}-${student.id}`
      attendanceMap[key] = {
        id: att.id,
        student_id: student.id,
        class_id: cls.id,
        status: att.status,
        makeup_of_attendance_id: att.makeup_of_attendance_id,
        memo: att.memo || "",
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
    .from("classes")
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      date: data.date,
      time: data.time,
      group_type: data.group_type,
    })
    .select()
    .single()

  if (error) {
    console.error("createClass error:", error)
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
    .from("attendance")
    .upsert(
      {
        student_id: record.student_id,
        class_id: record.class_id,
        status: record.status,
        memo: record.memo || "",
        makeup_of_attendance_id: record.makeup_of_attendance_id || null,
      },
      { onConflict: "student_id,class_id" }
    )
    .select()
    .single()

  if (error) {
    console.error("upsertAttendance error:", error)
    return null
  }

  return {
    id: data.id,
    student_id: data.student_id,
    class_id: data.class_id,
    status: data.status,
    makeup_of_attendance_id: data.makeup_of_attendance_id,
    memo: data.memo || "",
  }
}

export async function markAllPresent(classId: string, studentIds: string[]): Promise<void> {
  for (const studentId of studentIds) {
    await upsertAttendance({
      student_id: studentId,
      class_id: classId,
      status: "출석",
    })
  }
}

export async function fetchMonthlyAttendance(
  studentId: string,
  yearMonth: string
): Promise<
  {
    id: string
    date: string
    time: string
    group_type: GroupType
    status: AttendanceStatus
  }[]
> {
  const startDate = `${yearMonth}-01`
  const [y, m] = yearMonth.split("-").map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      id, status,
      classes:class_id (date, time, group_type)
    `)
    .eq("student_id", studentId)
    .gte("classes.date", startDate)
    .lte("classes.date", endDate)

  if (error) {
    console.error("fetchMonthlyAttendance error:", error)
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

export async function fetchStudentAttendance(
  studentId: string,
  yearMonth: string
): Promise<
  {
    id: string
    date: string
    time: string
    group_type: string
    status: AttendanceStatus
    memo: string
  }[]
> {
  const startDate = `${yearMonth}-01`
  const [y, m] = yearMonth.split("-").map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      id, status, memo,
      classes:class_id (date, time, group_type)
    `)
    .eq("student_id", studentId)

  if (error) {
    console.error("fetchStudentAttendance error:", error)
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
      memo: r.memo || "",
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
}

export async function updateAttendanceStatus(id: string, status: AttendanceStatus): Promise<void> {
  const { error } = await supabase.from("attendance").update({ status }).eq("id", id)
  if (error) console.error("updateAttendanceStatus error:", error)
}

export async function updateAttendanceMemo(id: string, memo: string): Promise<void> {
  const { error } = await supabase.from("attendance").update({ memo }).eq("id", id)
  if (error) console.error("updateAttendanceMemo error:", error)
}

export type GenerateScheduleResult = {
  classesCreated: number
  attendancesCreated: number
  studentsProcessed: number
  errors: string[]
}

export async function generateMonthlySchedule(
  targetMonth: string
): Promise<GenerateScheduleResult> {
  const errors: string[] = []
  const [year, month] = targetMonth.split("-").map(Number)

  const datesByWeekday = new Map<number, string[]>()
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(year, month - 1, day).getDay()
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    if (!datesByWeekday.has(weekday)) datesByWeekday.set(weekday, [])
    datesByWeekday.get(weekday)!.push(dateStr)
  }

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, name, student_schedules(weekday, time, group_type)")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .eq("status", "재원")

  if (studentsError) {
    return { classesCreated: 0, attendancesCreated: 0, studentsProcessed: 0, errors: [studentsError.message] }
  }

  const activeStudents = students || []
  const neededClassKeys = new Set<string>()
  for (const student of activeStudents) {
    for (const sched of (student.student_schedules as any[] || [])) {
      const dates = datesByWeekday.get(sched.weekday) || []
      for (const date of dates) {
        neededClassKeys.add(`${date}|${sched.time}|${sched.group_type}`)
      }
    }
  }

  const classRows = Array.from(neededClassKeys).map((key) => {
    const [date, time, group_type] = key.split("|")
    return { branch_id: DEFAULT_BRANCH_ID, date, time, group_type }
  })

  let classesCreated = 0
  if (classRows.length > 0) {
    const { data: upserted, error: classError } = await supabase
      .from("classes")
      .upsert(classRows, { onConflict: "branch_id,date,time,group_type", ignoreDuplicates: true })
      .select("id")

    if (classError) {
      errors.push(`수업 생성 오류: ${classError.message}`)
    } else {
      classesCreated = upserted?.length ?? 0
    }
  }

  const { data: monthClasses, error: fetchError } = await supabase
    .from("classes")
    .select("id, date, time, group_type")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
    .lte("date", `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`)

  if (fetchError) {
    errors.push(`수업 조회 오류: ${fetchError.message}`)
    return { classesCreated, attendancesCreated: 0, studentsProcessed: activeStudents.length, errors }
  }

  const classIdMap = new Map<string, string>()
  for (const cls of monthClasses || []) {
    classIdMap.set(`${cls.date}|${cls.time}|${cls.group_type}`, cls.id)
  }

  const attendanceRows: { student_id: string; class_id: string; status: string }[] = []
  for (const student of activeStudents) {
    for (const sched of (student.student_schedules as any[] || [])) {
      const dates = datesByWeekday.get(sched.weekday) || []
      for (const date of dates) {
        const classId = classIdMap.get(`${date}|${sched.time}|${sched.group_type}`)
        if (classId) {
          attendanceRows.push({ student_id: student.id, class_id: classId, status: "예정" })
        }
      }
    }
  }

  let attendancesCreated = 0
  if (attendanceRows.length > 0) {
    const batchSize = 500
    for (let i = 0; i < attendanceRows.length; i += batchSize) {
      const batch = attendanceRows.slice(i, i + batchSize)
      const { data: upserted, error: attendError } = await supabase
        .from("attendance")
        .upsert(batch, { onConflict: "student_id,class_id", ignoreDuplicates: true })
        .select("id")

      if (attendError) {
        errors.push(`출석 생성 오류 (batch ${i / batchSize + 1}): ${attendError.message}`)
      } else {
        attendancesCreated += upserted?.length ?? 0
      }
    }
  }

  return { classesCreated, attendancesCreated, studentsProcessed: activeStudents.length, errors }
}
