import {
  calculateGrade,
  DEFAULT_BRANCH_ID,
  formatClassName,
  getNextLevel,
  GroupType,
  LEVEL_ORDER,
  LevelType,
  monthsDiff,
  supabase,
  TrialReservation,
} from "./shared"

export async function fetchStudentStatusCounts(): Promise<{
  total: number
  active: number
  paused: number
  withdrawn: number
  trial: number
}> {
  const { data, error } = await supabase.from("students").select("status").eq("branch_id", DEFAULT_BRANCH_ID)

  if (error) {
    console.error("fetchStudentStatusCounts error:", error)
    return { total: 0, active: 0, paused: 0, withdrawn: 0, trial: 0 }
  }

  const counts = { total: 0, active: 0, paused: 0, withdrawn: 0, trial: 0 }
  for (const s of data || []) {
    counts.total++
    if (s.status === "재원") counts.active++
    else if (s.status === "휴원") counts.paused++
    else if (s.status === "퇴원") counts.withdrawn++
    else if (s.status === "체험") counts.trial++
  }
  return counts
}

export async function fetchTodayTrials(date: string): Promise<TrialReservation[]> {
  const { data, error } = await supabase
    .from("trial_reservations")
    .select("*, classes:class_id (date, time)")
    .eq("branch_id", DEFAULT_BRANCH_ID)

  if (error) {
    console.error("fetchTodayTrials error:", error)
    return []
  }

  return (data || [])
    .filter((t: any) => t.classes?.date === date)
    .map((t: any) => ({
      id: t.id,
      branch_id: t.branch_id,
      name: t.name,
      phone: t.phone,
      gender: t.gender || "",
      grade: t.grade || "",
      status: t.status,
      class_id: t.class_id,
      trial_date: t.classes?.date || "",
      trial_time: t.classes?.time || "",
      note: t.note || "",
      created_at: t.created_at,
    }))
}

export async function fetchUnpaidStudents(targetMonth: string): Promise<{
  id: string
  name: string
  phone: string
  className: string
}[]> {
  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, name, phone, category, sessions_per_week")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .eq("status", "재원")

  if (studentErr) {
    console.error("fetchUnpaidStudents students error:", studentErr)
    return []
  }

  const { data: payments, error: payErr } = await supabase
    .from("payments")
    .select("student_id")
    .eq("target_month", targetMonth)

  if (payErr) {
    console.error("fetchUnpaidStudents payments error:", payErr)
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
  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, name, birth_date, current_level")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .eq("status", "재원")

  if (sErr) {
    console.error("fetchLevelTestCandidates students error:", sErr)
    return []
  }

  const { data: levels, error: lErr } = await supabase.from("student_levels").select("student_id, level, acquired_date")
  if (lErr) {
    console.error("fetchLevelTestCandidates levels error:", lErr)
    return []
  }

  const { data: configs, error: cErr } = await supabase.from("level_test_configs").select("level, required_months")
  if (cErr) {
    console.error("fetchLevelTestCandidates configs error:", cErr)
    return []
  }

  const configMap = new Map((configs || []).map((c: any) => [c.level, c.required_months]))
  const levelMap = new Map<string, string>()
  for (const l of levels || []) {
    if (l.acquired_date) levelMap.set(`${l.student_id}-${l.level}`, l.acquired_date)
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
    if (!s.current_level || s.current_level === "GOLD") continue

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
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const cutoffDate = threeMonthsAgo.toISOString().split("T")[0]

  const { data: absences, error: aErr } = await supabase
    .from("attendance")
    .select(`
      id, student_id, status,
      classes:class_id (date, time, group_type)
    `)
    .eq("status", "결석")
    .gte("classes.date", cutoffDate)

  if (aErr) {
    console.error("fetchPendingMakeups absences error:", aErr)
    return []
  }

  const validAbsences = (absences || []).filter((a: any) => a.classes && a.classes.date >= cutoffDate)
  if (validAbsences.length === 0) return []

  const absenceIds = validAbsences.map((a: any) => a.id)
  const { data: makeups, error: mErr } = await supabase
    .from("attendance")
    .select("makeup_of_attendance_id, status")
    .in("makeup_of_attendance_id", absenceIds)

  if (mErr) {
    console.error("fetchPendingMakeups makeups error:", mErr)
    return []
  }

  const resolvedIds = new Set(
    (makeups || [])
      .filter((m: any) => m.status === "보강완료" || m.status === "보강예정")
      .map((m: any) => m.makeup_of_attendance_id)
  )

  const unresolvedAbsences = validAbsences.filter((a: any) => !resolvedIds.has(a.id))
  if (unresolvedAbsences.length === 0) return []

  const studentIds = [...new Set(unresolvedAbsences.map((a: any) => a.student_id))]
  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, name, birth_date, phone, category, sessions_per_week, status")
    .in("id", studentIds)
    .eq("status", "재원")

  if (sErr) {
    console.error("fetchPendingMakeups students error:", sErr)
    return []
  }

  const studentMap = new Map((students || []).map((s: any) => [s.id, s]))
  const grouped = new Map<string, { id: string; date: string; time: string; groupType: string }[]>()

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
    .from("students")
    .select("category, current_level")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .eq("status", "재원")

  if (error) {
    console.error("fetchStudentDistribution error:", error)
    return { byCategory: [], byLevel: [] }
  }

  const catCounts = new Map<string, number>()
  const lvlCounts = new Map<string, number>()

  for (const s of data || []) {
    catCounts.set(s.category, (catCounts.get(s.category) || 0) + 1)
    const lv = s.current_level || "미정"
    lvlCounts.set(lv, (lvlCounts.get(lv) || 0) + 1)
  }

  const catOrder = ["어린이", "청소년", "성인", "스페셜"]
  const byCategory = catOrder.filter((c) => catCounts.has(c)).map((c) => ({ category: c, count: catCounts.get(c)! }))

  const byLevel = LEVEL_ORDER.filter((l) => lvlCounts.has(l)).map((l) => ({ level: l, count: lvlCounts.get(l)! }))

  return { byCategory, byLevel }
}

export async function fetchRecentChanges(): Promise<{
  type: "registration" | "level_up"
  studentId: string
  studentName: string
  grade: string
  date: string
  level?: LevelType
}[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()
  const cutoffDate = cutoff.split("T")[0]

  const { data: newStudents, error: sErr } = await supabase
    .from("students")
    .select("id, name, birth_date, created_at")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .eq("status", "재원")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(10)
  if (sErr) console.error("fetchRecentChanges students error:", sErr)

  const { data: levelUps, error: lErr } = await supabase
    .from("student_levels")
    .select("student_id, level, acquired_date, students:student_id (name, birth_date, branch_id)")
    .neq("level", "WHITE")
    .gte("acquired_date", cutoffDate)
    .order("acquired_date", { ascending: false })
    .limit(10)
  if (lErr) console.error("fetchRecentChanges levels error:", lErr)

  const results: {
    type: "registration" | "level_up"
    studentId: string
    studentName: string
    grade: string
    date: string
    level?: LevelType
  }[] = []

  for (const s of newStudents || []) {
    results.push({
      type: "registration",
      studentId: s.id,
      studentName: s.name,
      grade: calculateGrade(s.birth_date),
      date: s.created_at.split("T")[0],
    })
  }

  for (const l of levelUps || []) {
    const student = (l as any).students
    if (!student || student.branch_id !== DEFAULT_BRANCH_ID) continue
    results.push({
      type: "level_up",
      studentId: l.student_id,
      studentName: student.name,
      grade: calculateGrade(student.birth_date),
      date: l.acquired_date,
      level: l.level as LevelType,
    })
  }

  return results.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
}
