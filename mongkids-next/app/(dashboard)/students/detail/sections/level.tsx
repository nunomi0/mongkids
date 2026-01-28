import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import LevelBadge, { LEVEL_ORDER, LevelValue } from "@/components/level-badge"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LevelHistory } from "@/types/student"

type Props = {
  className?: string
  histories: LevelHistory[]
  onEdit: () => void
}

export default function LevelSection({ className, histories, onEdit }: Props) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">레벨 이력</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">

          {LEVEL_ORDER.map((level) => {
            const item = histories.find((h) => h.level === level)

            return (
              <div key={level} className="flex items-center gap-3">

                {/* 색상 배지 */}
                <LevelBadge level={level as LevelValue} size={14} radius={3} />

                {/* 레벨 텍스트 */}
                <span className="text-xs font-medium w-12">{level}</span>

                {/* 획득 날짜 */}
                <span className={cn(
                  "text-xs",
                  item?.acquired_at ? "text-foreground" : "text-gray-400"
                )}>
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
