import type { ExportClassAttendance } from "@/lib/excel/attendance-generator"
import type { ParsedAttendance, ParsedClass } from "@/lib/excel/attendance-parser"
import type { ExportStudent } from "@/lib/excel/member-generator"
import type { ParsedPayment, ParsedStudent } from "@/lib/excel/member-parser"
import {
  calculateGrade,
  DEFAULT_BRANCH_ID,
  formatClassName,
  LevelType,
  StudentSchedule,
  supabase,
} from "./shared"

export async function upsertStudentsFromExcel(
  studentsMap: Map<string, ParsedStudent>,
  payments: ParsedPayment[]
): Promise<{ created: number; updated: number; paymentsCreated: number; errors: string[] }> {
  let created = 0
  let updated = 0
  let paymentsCreated = 0
  const errors: string[] = []
  const studentIdMap = new Map<string, string>()

  const { data: allStudents } = await supabase
    .from("students")
    .select("id, name, birth_date")
    .eq("branch_id", DEFAULT_BRANCH_ID)

  const existingByKey = new Map<string, string>()
  const existingByName = new Map<string, string>()
  for (const s of allStudents || []) {
    existingByKey.set(`${s.name}_${s.birth_date}`, s.id)
    existingByName.set(s.name, s.id)
  }

  for (const [key, student] of studentsMap) {
    try {
      const existingId = existingByKey.get(key) || existingByName.get(student.name)

      if (existingId) {
        const { error } = await supabase
          .from("students")
          .update({
            gender: student.gender,
            phone: student.phone,
            shoe_size: student.shoe_size,
            category: student.category,
            sessions_per_week: student.sessions_per_week,
            current_level: student.current_level,
            memo: student.memo,
          })
          .eq("id", existingId)

        if (error) {
          errors.push(`학생 "${student.name}" 업데이트 오류: ${error.message}`)
          continue
        }

        studentIdMap.set(key, existingId)
        updated++

        await supabase.from("student_schedules").delete().eq("student_id", existingId)
        if (student.schedules.length > 0) {
          await supabase.from("student_schedules").insert(
            student.schedules.map((s) => ({
              student_id: existingId,
              weekday: s.weekday,
              time: s.time,
              group_type: s.group_type,
            }))
          )
        }

        if (student.current_level) {
          await supabase.from("student_levels").upsert(
            {
              student_id: existingId,
              level: student.current_level,
              acquired_date: new Date().toISOString().split("T")[0],
            },
            { onConflict: "student_id,level" }
          )
        }
      } else {
        const { data: newStudent, error } = await supabase
          .from("students")
          .insert({
            branch_id: DEFAULT_BRANCH_ID,
            name: student.name,
            birth_date: student.birth_date,
            gender: student.gender,
            phone: student.phone,
            shoe_size: student.shoe_size,
            status: "재원" as const,
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
        existingByKey.set(key, newStudent.id)
        existingByName.set(student.name, newStudent.id)
        created++

        if (student.schedules.length > 0) {
          await supabase.from("student_schedules").insert(
            student.schedules.map((s) => ({
              student_id: newStudent.id,
              weekday: s.weekday,
              time: s.time,
              group_type: s.group_type,
            }))
          )
        }

        const levels: LevelType[] = ["WHITE", "YELLOW", "GREEN", "BLUE", "RED", "BLACK", "GOLD"]
        for (const level of levels) {
          await supabase.from("student_levels").upsert(
            {
              student_id: newStudent.id,
              level,
              acquired_date:
                student.current_level && level === student.current_level ? new Date().toISOString().split("T")[0] : null,
            },
            { onConflict: "student_id,level" }
          )
        }
      }
    } catch (err) {
      errors.push(`학생 "${student.name}" 처리 오류: ${err}`)
    }
  }

  for (const payment of payments) {
    const studentId = studentIdMap.get(payment.student_key)
    if (!studentId) continue

    try {
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("id")
        .eq("student_id", studentId)
        .eq("target_month", payment.target_month)
        .limit(1)

      if (existingPayments && existingPayments.length > 0) continue

      if (payment.amount > 0) {
        const { error } = await supabase.from("payments").insert({
          student_id: studentId,
          payment_date: payment.payment_date,
          target_month: payment.target_month,
          amount: payment.amount,
          method: "계좌이체" as const,
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

export async function upsertAttendanceFromExcel(
  classes: ParsedClass[],
  attendances: ParsedAttendance[]
): Promise<{ classesCreated: number; attendancesCreated: number; errors: string[] }> {
  let classesCreated = 0
  let attendancesCreated = 0
  const errors: string[] = []
  const classIdMap = new Map<string, string>()

  for (const cls of classes) {
    try {
      const { data: existing } = await supabase
        .from("classes")
        .select("id")
        .eq("branch_id", DEFAULT_BRANCH_ID)
        .eq("date", cls.date)
        .eq("time", cls.time)
        .eq("group_type", cls.group_type)
        .maybeSingle()

      if (existing) {
        classIdMap.set(`${cls.date}_${cls.time}_${cls.group_type}`, existing.id)
      } else {
        const { data: newClass, error } = await supabase
          .from("classes")
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

  const studentNameCache = new Map<string, string>()
  async function getStudentId(name: string): Promise<string | null> {
    if (studentNameCache.has(name)) return studentNameCache.get(name)!

    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("branch_id", DEFAULT_BRANCH_ID)
      .eq("name", name)
      .limit(1)

    if (data && data.length > 0) {
      studentNameCache.set(name, data[0].id)
      return data[0].id
    }
    return null
  }

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
        .from("attendance")
        .upsert(
          {
            student_id: studentId,
            class_id: classId,
            status: att.status,
            is_test: att.is_test,
            test_level: att.test_level,
            memo: att.memo,
          },
          { onConflict: "student_id,class_id" }
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

export async function fetchAllStudentsForExport(): Promise<ExportStudent[]> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id, name, birth_date, gender, phone, shoe_size, category,
      sessions_per_week, current_level, memo, status,
      student_schedules (weekday, time),
      payments (payment_date, target_month, amount, discounts)
    `)
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .eq("status", "재원")
    .order("name")

  if (error) {
    console.error("fetchAllStudentsForExport error:", error)
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
      memo: s.memo || "",
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

export async function fetchAttendanceForExport(
  year: number,
  startMonth: number,
  endMonth: number
): Promise<ExportClassAttendance[]> {
  const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`
  const endDay = new Date(year, endMonth, 0).getDate()
  const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      status, is_test, test_level, memo,
      students:student_id (name, birth_date, gender),
      classes:class_id (date, time, group_type)
    `)
    .gte("classes.date", startDate)
    .lte("classes.date", endDate)

  if (error) {
    console.error("fetchAttendanceForExport error:", error)
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
        memo: r.memo || "",
      }
    })
}
