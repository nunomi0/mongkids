export type StudentStatus = '재원' | '휴원' | '퇴원' | '체험'
export type GroupType = '일반1' | '일반2' | '스페셜' | '체험'
export type Gender = '남' | '여'
export type CategoryType = '스페셜' | '어린이' | '청소년' | '성인'

export type StudentSchedule = {
  id?: string
  student_id?: string
  weekday: number
  time: string
  group_type: GroupType
}

export type StudentFormData = {
  name: string
  birth_date: string
  phone: string
  category: CategoryType
  sessions_per_week: number
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
  id: string
  branch_id: string
  name: string
  birth_date: string
  phone: string
  category: CategoryType
  sessions_per_week: number
  gender: Gender
  status: StudentStatus
  shoe_size: string
  current_level: LevelType | null
  memo: string
  schedules: StudentSchedule[]
}

export type Payment = {
  id: string
  student_id: string
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
export type AttendanceStatus = '예정' | '출석' | '결석' | '보강예정' | '보강완료'

export type ClassItem = {
  id: string
  date: string
  time: string
  group_type: GroupType
  students: ClassStudent[]
}

export type ClassStudent = {
  id: string
  name: string
  grade: string
  level: LevelType | ''
  isTrial?: boolean
}

export type AttendanceRecord = {
  id: string
  student_id: string
  class_id: string
  status: AttendanceStatus
  makeup_of_attendance_id: string | null
  memo: string
}

// 체험 관리 타입
export type TrialStatus = '예정' | '노쇼' | '미등록' | '등록'

export type TrialReservation = {
  id: string
  branch_id: string
  name: string
  phone: string
  gender: Gender | ''
  grade: string
  status: TrialStatus
  class_id: string | null
  student_id: string | null
  trial_date: string
  trial_time: string
  note: string
  created_at: string
}

// 학생 목록 표시용 타입
export type StudentListItem = {
  id: string
  name: string
  gender: Gender
  grade: string
  level: LevelType | ''
  className: string
  classTime: string
  phone: string
  lastPayment: string
  paymentAmount: string
  status: StudentStatus
}
