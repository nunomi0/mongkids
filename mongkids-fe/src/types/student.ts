export type StudentStatus = '재원' | '휴원' | '퇴원' | '체험'

export type GroupType = '일반1' | '일반2' | '스페셜' | '체험'

export type StudentSchedule = {
  weekday: number
  time: string
  group_type: GroupType
}

export type ClassType = {
  id: number
  category: string
  sessions_per_week: number
}

export type LevelValue = '' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD' | 'NONE'

export type Student = {
  id: number
  name: string
  gender: '남' | '여'
  birth_date: string
  shoe_size?: string | null
  phone: string
  registration_date: string
  class_type_id: number | null
  current_level: LevelValue | null
  status: StudentStatus
  schedules: StudentSchedule[]
}

export type LevelHistory = { level: string; acquired_date: string }

export type AttendanceItem = {
  id: number
  status: '예정'|'출석'|'결석'
  kind?: '정규'|'보강'
  note?: string | null
  classes?: { date?: string, time?: string }
}

export type PaymentItem = {
  id: number
  payment_date: string
  payment_month?: string | null
  total_amount: number
  payment_method?: string | null
  shoe_discount: number
  sibling_discount: number
  additional_discount: number
}


