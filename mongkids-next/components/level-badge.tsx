export const LEVEL_ORDER = [
    "WHITE",
    "YELLOW",
    "GREEN",
    "BLUE",
    "RED",
    "BLACK",
    "GOLD",
  ] as const
  
  export type LevelValue = (typeof LEVEL_ORDER)[number]
  
  export default function LevelBadge({
    level,
    size = 12,
    radius = 2,
  }: {
    level: LevelValue
    size?: number
    radius?: number
  }) {
    const colors: Record<LevelValue, string> = {
      WHITE: "#ffffff",
      YELLOW: "#fde047",
      GREEN: "#86efac",
      BLUE: "#93c5fd",
      RED: "#fca5a5",
      BLACK: "#374151",
      GOLD: "#fbbf24",
    }
  
    const isWhite = level === "WHITE"
  
    return (
      <span
        style={{
          backgroundColor: colors[level] || "#e5e7eb",
          width: size,
          height: size,
          borderRadius: radius,
          display: "inline-block",
          border: isWhite ? "1px solid #d1d5db" : "none",
        }}
      />
    )
  }