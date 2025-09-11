export function getGradeLabel(birthDate: string | null | undefined, now: Date = new Date()): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const koreanAge = now.getFullYear() - birth.getFullYear() + 1

  if (koreanAge < 8) return `${koreanAge}세`
  if (koreanAge <= 13) return `초${koreanAge - 7}`
  if (koreanAge <= 16) return `중${koreanAge - 13}`
  if (koreanAge <= 19) return `고${koreanAge - 16}`
  return '성인'
}


