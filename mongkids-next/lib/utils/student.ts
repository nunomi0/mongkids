import type { StudentSchedule } from '@/types/student'

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토']

/**
 * birth_date → "초3", "성인" 등 학년 문자열 계산
 */
export function calculateGrade(birthDate: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()

  // 한국 나이 기준: 해당 년도 3월 기준
  const birthYear = birth.getFullYear()
  const currentYear = today.getFullYear()

  // 만 나이 계산
  let age = currentYear - birthYear
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  if (age >= 20) return '성인'
  if (age < 6) return `${age}세`

  // 학년 계산: 입학 기준 (3월), 만 6세가 되는 해에 초등학교 입학
  const schoolYear = currentYear - birthYear - 6
  // 3월 이전이면 아직 진급 전
  const adjustedSchoolYear = today.getMonth() < 2 ? schoolYear - 1 : schoolYear

  if (adjustedSchoolYear < 1) return `${age}세`
  if (adjustedSchoolYear <= 6) return `초${adjustedSchoolYear}`
  if (adjustedSchoolYear <= 9) return `중${adjustedSchoolYear - 6}`
  if (adjustedSchoolYear <= 12) return `고${adjustedSchoolYear - 9}`
  return '성인'
}

/**
 * category + sessions_per_week → "어린이 주 3회"
 */
export function formatClassName(category: string, sessionsPerWeek: number): string {
  return `${category} 주 ${sessionsPerWeek}회`
}

/**
 * schedules → "월수 15:00 / 금 16:00" 형식
 */
export function formatClassTime(schedules: StudentSchedule[]): string {
  if (!schedules || schedules.length === 0) return '-'

  // 시간별로 그룹화
  const byTime = new Map<string, number[]>()
  for (const s of schedules) {
    const list = byTime.get(s.time) || []
    list.push(s.weekday)
    byTime.set(s.time, list)
  }

  // 시간별로 요일 묶어서 표시
  const parts: string[] = []
  for (const [time, weekdays] of byTime) {
    const days = weekdays.sort().map((w) => WEEKDAY_KR[w]).join('')
    parts.push(`${days} ${time}`)
  }

  return parts.join(' / ')
}

/**
 * 금액 → "150,000원" 형식
 */
export function formatPaymentAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

/**
 * target_month → "1월" 형식 (목록 표시용)
 */
export function formatLastPaymentMonth(targetMonth: string): string {
  if (!targetMonth) return ''
  const parts = targetMonth.split('-')
  if (parts.length < 2) return ''
  return `${parseInt(parts[1])}월`
}
