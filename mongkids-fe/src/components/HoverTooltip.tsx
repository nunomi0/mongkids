import React, { useState } from "react"

interface HoverTooltipProps {
  content: string
  children: React.ReactNode
  className?: string
  offset?: number
}

export default function HoverTooltip({ content, children, className, offset = 8 }: HoverTooltipProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      className={`relative inline-flex ${className || ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <span
          role="tooltip"
          className="absolute z-[9999] -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border bg-popover text-popover-foreground shadow px-2 py-1 text-xs"
          style={{ marginTop: `-${offset}px` }}
        >
          {content}
          <span
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid hsl(var(--popover))',
              filter: 'drop-shadow(0 -1px 0 hsl(var(--border)))'
            }}
          />
        </span>
      )}
    </span>
  )
}


