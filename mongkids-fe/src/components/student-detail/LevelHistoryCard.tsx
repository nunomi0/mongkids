import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import LevelBadge from "../LevelBadge"
import { LevelHistory, Student } from "../../types/student"
import { format } from "date-fns"

export default function LevelHistoryCard({ levelHistories, student, onReload }: { levelHistories: LevelHistory[]; student: Student; onReload: () => void }) {
  const levels = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD']
  return (
    <Card className="shrink-0">
      <CardHeader className="p">
        <CardTitle className="text-sm">레벨 이력</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-center gap-4">
          {levels.map(level => {
            const hist = levelHistories.find(l => l.level === level)
            return (
              <div key={level} className="flex flex-col items-center">
                <LevelBadge level={level as any} size={16} radius={3} />
                <span className="text-xs text-gray-600 mt-1 font-medium">{level}</span>
                <span className="text-xs text-gray-500 mt-1 text-center">
                  {hist ? format(new Date(hist.acquired_date), 'yyyy-MM-dd') : '미취득'}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


