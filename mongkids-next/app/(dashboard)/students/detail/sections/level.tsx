import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import LevelBadge, { LEVEL_ORDER } from "@/components/level-badge"

type LevelHistory = {
  level: string
  acquired_at: string | null
}

export default function LevelSection() {
  // ===== 더미 데이터 =====
  const histories: LevelHistory[] = [
    { level: "WHITE", acquired_at: "2024-01-10" },
    { level: "YELLOW", acquired_at: "2024-03-02" },
    { level: "GREEN", acquired_at: "2024-06-18" },
    { level: "BLUE", acquired_at: null },
    { level: "RED", acquired_at: null },
    { level: "BLACK", acquired_at: null },
    { level: "GOLD", acquired_at: null },
  ]

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-medium">레벨 이력</CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">

          {LEVEL_ORDER.map((level) => {
            const item = histories.find((h) => h.level === level)

            return (
              <div key={level} className="flex items-center gap-3">

                {/* 색상 배지 */}
                <LevelBadge level={level as any} size={14} radius={3} />

                {/* 레벨 텍스트 */}
                <span className="text-xs font-medium w-12">{level}</span>

                {/* 획득 날짜 */}
                <span className="text-xs text-gray-500">
                  {item?.acquired_at || "미취득"}
                </span>

              </div>
            )
          })}

        </div>
      </CardContent>
    </Card>
  )
}