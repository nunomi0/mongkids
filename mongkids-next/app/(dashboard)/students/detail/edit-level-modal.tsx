"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import LevelBadge, { LEVEL_ORDER, LevelValue } from "@/components/level-badge"
import type { LevelHistory } from "@/types/student"

type Props = {
  isOpen: boolean
  onClose: () => void
  onSaved: (histories: LevelHistory[]) => void
  histories: LevelHistory[]
}

export default function EditLevelModal({
  isOpen,
  onClose,
  onSaved,
  histories: initialHistories,
}: Props) {
  const [histories, setHistories] = useState<LevelHistory[]>([])

  useEffect(() => {
    if (isOpen) {
      // LEVEL_ORDER에 맞춰 초기화 (모든 레벨 포함)
      const newHistories = LEVEL_ORDER.map((level) => {
        const existing = initialHistories.find((h) => h.level === level)
        return {
          level: level as LevelHistory["level"],
          acquired_at: existing?.acquired_at || null,
        }
      })
      setHistories(newHistories)
    }
  }, [isOpen, initialHistories])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const updateDate = (level: LevelValue, date: string | null) => {
    setHistories((prev) =>
      prev.map((h) =>
        h.level === level ? { ...h, acquired_at: date } : h
      )
    )
  }

  const clearDate = (level: LevelValue) => {
    updateDate(level, null)
  }

  const handleSubmit = () => {
    onSaved(histories)
    handleClose()
  }

  // 취득한 레벨 개수 계산
  const acquiredCount = histories.filter((h) => h.acquired_at).length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>레벨 이력 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            각 레벨의 취득일을 입력하세요. ({acquiredCount}/{LEVEL_ORDER.length} 취득)
          </p>

          {LEVEL_ORDER.map((level) => {
            const history = histories.find((h) => h.level === level)
            const acquiredAt = history?.acquired_at || ""

            return (
              <div key={level} className="flex items-center gap-3">
                {/* 레벨 배지 */}
                <LevelBadge level={level} size={20} radius={4} />

                {/* 레벨 이름 */}
                <Label className="w-16 text-sm">{level}</Label>

                {/* 취득일 입력 */}
                <div className="flex-1 flex items-center gap-1">
                  <Input
                    type="date"
                    value={acquiredAt}
                    onChange={(e) => updateDate(level, e.target.value || null)}
                    className="flex-1"
                  />
                  {acquiredAt && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => clearDate(level)}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleSubmit}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
