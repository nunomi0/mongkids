export function getGradeLabel(birthDate: string | null | undefined, now: Date = new Date()): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = now
  const age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (age < 6) return `${age}세`
  if (age === 6) return monthDiff >= 0 ? '초1' : '6세'
  if (age <= 12) return `초${age - 5}`
  if (age <= 15) return `중${age - 12}`
  if (age <= 18) return `고${age - 15}`
  return '성인'
}


