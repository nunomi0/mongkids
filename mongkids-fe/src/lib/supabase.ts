import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

if (!supabaseUrl || !supabaseAnonKey) {
  // 개발 중 환경변수 미설정 시 빠르게 원인 파악을 위해 명확한 에러를 던짐
  const msg = [
    '[Supabase init] 환경변수가 설정되지 않았습니다.',
    '필수값:',
    ' - VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co',
    ' - VITE_SUPABASE_ANON_KEY=<your-anon-key>',
    'mongkids-fe/.env 파일을 만들고 위 값을 채워주세요. (서버 재시작 필요)'
  ].join('\n')
  console.error(msg)
  throw new Error('Supabase env not configured')
}

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

