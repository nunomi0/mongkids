import React from "react"
import { getLevelColor, LevelValue } from "../utils/levelColor"

interface LevelBadgeProps {
  level: LevelValue | '' | null | undefined
  size?: number
  radius?: number
  className?: string
  showBorderForWhite?: boolean
}

export default function LevelBadge({ level, size = 12, radius = 2, className, showBorderForWhite = true }: LevelBadgeProps) {
  const bg = getLevelColor(level)

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


