import { LevelHistory, LevelType, supabase } from "./shared"

export async function fetchLevelHistories(studentId: string): Promise<LevelHistory[]> {
  const { data, error } = await supabase
    .from("student_levels")
    .select("level, acquired_date")
    .eq("student_id", studentId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("fetchLevelHistories error:", error)
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
  let currentLevel: LevelType | null = null
  let latestAcquiredAt = ""

  for (const history of histories) {
    if (!history.acquired_at) continue
    if (history.acquired_at >= latestAcquiredAt) {
      latestAcquiredAt = history.acquired_at
      currentLevel = history.level
    }
  }

  await supabase.from("students").update({ current_level: currentLevel }).eq("id", studentId)

  for (const h of histories) {
    const { error } = await supabase
      .from("student_levels")
      .upsert(
        {
          student_id: studentId,
          level: h.level,
          acquired_date: h.acquired_at,
        },
        { onConflict: "student_id,level" }
      )

    if (error) console.error("saveLevelHistories error:", error)
  }
}
