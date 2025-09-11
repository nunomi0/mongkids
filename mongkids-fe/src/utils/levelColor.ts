export type LevelValue = 'NONE' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD'

export function getLevelColor(level: LevelValue | '' | null | undefined): string {
  switch (level) {
    case 'WHITE': return '#ffffff'
    case 'YELLOW': return '#fde047'
    case 'GREEN': return '#86efac'
    case 'BLUE': return '#93c5fd'
    case 'RED': return '#fca5a5'
    case 'BLACK': return '#374151'
    case 'GOLD': return '#fbbf24'
    case 'NONE':
    default:
      return '#e5e7eb'
  }
}


