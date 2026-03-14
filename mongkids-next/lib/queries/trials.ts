import { DEFAULT_BRANCH_ID, TrialReservation, TrialStatus, supabase } from "./shared"

export async function fetchTrials(): Promise<TrialReservation[]> {
  const { data, error } = await supabase
    .from("trial_reservations")
    .select("*, classes:class_id (date, time)")
    .eq("branch_id", DEFAULT_BRANCH_ID)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("fetchTrials error:", error)
    return []
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    branch_id: t.branch_id,
    name: t.name,
    phone: t.phone,
    gender: t.gender || "",
    grade: t.grade || "",
    status: t.status,
    class_id: t.class_id,
    student_id: t.student_id,
    trial_date: t.classes?.date || "",
    trial_time: t.classes?.time || "",
    note: t.note || "",
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
    .from("trial_reservations")
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      name: data.name,
      phone: data.phone,
      gender: data.gender,
      grade: data.grade,
      status: "예정" as TrialStatus,
      note: data.note || "",
    })
    .select()
    .single()

  if (error) {
    console.error("createTrial error:", error)
    return null
  }

  return {
    id: trial.id,
    branch_id: trial.branch_id,
    name: trial.name,
    phone: trial.phone,
    gender: trial.gender || "",
    grade: trial.grade || "",
    status: trial.status,
    class_id: trial.class_id,
    student_id: trial.student_id,
    trial_date: "",
    trial_time: "",
    note: trial.note || "",
    created_at: trial.created_at,
  }
}

export async function updateTrial(trial: TrialReservation): Promise<void> {
  const { error } = await supabase
    .from("trial_reservations")
    .update({
      name: trial.name,
      phone: trial.phone,
      gender: trial.gender,
      grade: trial.grade,
      status: trial.status,
      student_id: trial.student_id,
      note: trial.note,
    })
    .eq("id", trial.id)

  if (error) console.error("updateTrial error:", error)
}

export async function linkTrialToStudent(trialId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from("trial_reservations")
    .update({
      status: "등록" as TrialStatus,
      student_id: studentId,
    })
    .eq("id", trialId)

  if (error) console.error("linkTrialToStudent error:", error)
}

export async function deleteTrial(id: string): Promise<void> {
  const { error } = await supabase.from("trial_reservations").delete().eq("id", id)
  if (error) console.error("deleteTrial error:", error)
}
