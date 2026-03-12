import { DEFAULT_BRANCH_ID } from "@/lib/constants"
import { supabase } from "@/lib/supabase"
import {
  calculateGrade,
  formatClassName,
  formatClassTime,
  formatLastPaymentMonth,
  formatPaymentAmount,
} from "@/lib/utils/student"
import type {
  AttendanceRecord,
  AttendanceStatus,
  CategoryType,
  ClassItem,
  ClassStudent,
  GroupType,
  LevelHistory,
  LevelType,
  Payment,
  PaymentFormData,
  Student,
  StudentFormData,
  StudentListItem,
  StudentSchedule,
  TrialReservation,
  TrialStatus,
} from "@/types/student"

export {
  DEFAULT_BRANCH_ID,
  supabase,
  calculateGrade,
  formatClassName,
  formatClassTime,
  formatLastPaymentMonth,
  formatPaymentAmount,
}

export type {
  AttendanceRecord,
  AttendanceStatus,
  CategoryType,
  ClassItem,
  ClassStudent,
  GroupType,
  LevelHistory,
  LevelType,
  Payment,
  PaymentFormData,
  Student,
  StudentFormData,
  StudentListItem,
  StudentSchedule,
  TrialReservation,
  TrialStatus,
}

export const LEVEL_ORDER: LevelType[] = ["WHITE", "YELLOW", "GREEN", "BLUE", "RED", "BLACK", "GOLD"]

export function getNextLevel(current: LevelType): LevelType | null {
  const idx = LEVEL_ORDER.indexOf(current)
  return idx >= 0 && idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null
}

export function monthsDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number)
  const [ty, tm] = to.split("-").map(Number)
  return (ty - fy) * 12 + (tm - fm)
}
