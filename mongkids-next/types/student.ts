export type StudentStatus = '재원' | '휴원' | '퇴원' | '체험'
export type GroupType = '일반1' | '일반2' | '스페셜' | '체험'
export type Gender = '남' | '여'

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

export type StudentFormData = {
  name: string
  birth_date: string
  phone: string
  class_type_id: string
  gender: Gender
  status: StudentStatus
  shoe_size: string
}

export type PaymentMethod = '계좌이체' | '카드결제' | '스포츠바우처' | '현금'

export type Discount = {
  type: string
  amount: number
}

export type PaymentFormData = {
  payment_date: string
  target_month: string
  amount: string
  method: PaymentMethod
  discounts: Discount[]
  memo: string
}

export type Student = {
  id: number
  name: string
  birth_date: string
  phone: string
  class_type_id: number
  gender: Gender
  status: StudentStatus
  shoe_size: string
  memo: string
  schedules: StudentSchedule[]
}

export type Payment = {
  id: number
  student_id: number
  payment_date: string
  target_month: string
  amount: number
  method: PaymentMethod
  discounts: Discount[]
  memo: string
}

export type LevelType = 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD'

export type LevelHistory = {
  level: LevelType
  acquired_at: string | null
}

// 수업 관리 타입
export type AttendanceStatus = '예정' | '출석' | '결석'
export type AttendanceKind = '정규' | '보강'

export type ClassItem = {
  class_id: number
  date: string
  time: string
  group_type: GroupType
  students: ClassStudent[]
}

export type ClassStudent = {
  id: number
  name: string
  grade: string
  level: LevelType | ''
  isTrial?: boolean
}

export type AttendanceRecord = {
  id: number
  student_id: number
  class_id: number
  date: string
  status: AttendanceStatus
  kind: AttendanceKind
  makeup_of_attendance_id: number | null
  note: string | null
}

export type DisplayStatus =
  | 'REGULAR_PLANNED'
  | 'REGULAR_PRESENT'
  | 'REGULAR_ABSENT'
  | 'REGULAR_MAKEUP_PLANNED'
  | 'REGULAR_MAKEUP_PRESENT'
  | 'REGULAR_MAKEUP_ABSENT'
  | 'MAKEUP_PLANNED'
  | 'MAKEUP_PRESENT'
  | 'MAKEUP_ABSENT'
  | 'NONE'
