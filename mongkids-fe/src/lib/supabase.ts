import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aytsbdefcjmqnpdvjfmc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dHNiZGVmY2ptcW5wZHZqZm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTY4NzEsImV4cCI6MjA3MjE3Mjg3MX0.Zs5WIf_q2FJRTNIXQsuu9HS8vcdHzI13g7XQe3_D_mk'

// RLS를 우회하기 위한 서비스 키 (실제 프로덕션에서는 환경변수로 관리해야 함)
// 여기서는 일단 anon 키를 사용하고, RLS 정책에서 익명 접근을 허용해야 함
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 또는 서비스 키가 있다면:
// const supabaseServiceKey = 'your-service-key-here'
// export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false
//   }
// })

// 타입 정의
export interface Student {
  id: string
  name: string
  birth_date: string
  phone: string
  course_info: string
  level: 'NONE' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD'
  schedule: string | null
  memo: string | null
  payments: {
    paidMonths: number
    lastPaidAt: string | null
  } | null
  classes: string[] | null
  level_history: Array<{
    level: string
    date: string
  }> | null
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  student_id: string
  date: string
  status: 'present' | 'absent' | 'makeup' | 'makeup_done'
  class_id: string | null
  memo: string | null
  created_at: string
}

export interface Class {
  id: string
  day: '월' | '화' | '수' | '목' | '금' | '토' | '일'
  time: string
  class_type: '키즈' | '청소년' | '스페셜' | '체험'
  students: Array<{
    student_id: string
    name: string
    grade: string
    level: string
  }> | null
  max_students: number
  created_at: string
}

