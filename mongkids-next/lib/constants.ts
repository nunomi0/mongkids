import type { CategoryType } from '@/types/student'

export const DEFAULT_BRANCH_ID = 'b0000000-0000-0000-0000-000000000001'

export const CATEGORY_OPTIONS: { value: CategoryType; label: string; sessionsPerWeek: number[] }[] = [
  { value: '어린이', label: '어린이', sessionsPerWeek: [2, 3] },
  { value: '청소년', label: '청소년', sessionsPerWeek: [2, 3] },
  { value: '성인', label: '성인', sessionsPerWeek: [2, 3] },
  { value: '스페셜', label: '스페셜', sessionsPerWeek: [2, 3] },
]
