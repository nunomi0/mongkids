import React from "react"

export type LevelValue = 'NONE' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD'

interface LevelBadgeProps {
  level: LevelValue | '' | null | undefined
  size?: number
  radius?: number
  className?: string
  showBorderForWhite?: boolean
}

export default function LevelBadge({ level, size = 12, radius = 2, className, showBorderForWhite = true }: LevelBadgeProps) {
  const bg = (() => {
    switch (level) {
      case 'WHITE': return '#ffffff'
      case 'YELLOW': return '#fde047'
      case 'GREEN': return '#86efac'
      case 'BLUE': return '#93c5fd'
      case 'RED': return '#fca5a5'
      case 'BLACK': return '#374151'
      case 'GOLD': return '#fbbf24'
      case 'NONE':
      default: return '#e5e7eb'
    }
  })()

  const border = level === 'WHITE' && showBorderForWhite ? '1px solid #d1d5db' : 'none'

  return (
    <span
      className={className}
      style={{
        backgroundColor: bg,
        border,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        display: 'inline-block'
      }}
    />
  )
}


