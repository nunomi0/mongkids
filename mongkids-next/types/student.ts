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
