"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Users, Sparkles } from "lucide-react"
import { createClass } from "@/lib/queries"
import type { ClassItem, GroupType } from "@/types/student"

const REGULAR_GROUP_TYPES: GroupType[] = ["일반1", "일반2", "스페셜"]

type ClassCategory = "일반" | "체험"

type Props = {
  isOpen: boolean
  onClose: () => void
  date: string
  time: string
  onAddClass: (classItem: ClassItem) => void
  existingGroupTypes?: GroupType[]
}

export default function AddClassModal({ isOpen, onClose, date, time, onAddClass, existingGroupTypes = [] }: Props) {
  const [category, setCategory] = useState<ClassCategory | null>(null)
  const [groupType, setGroupType] = useState<GroupType | "">("")

  const resetState = () => {
    setCategory(null)
    setGroupType("")
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleConfirm = async () => {
    if (!category) return
    const finalGroupType: GroupType = category === "체험" ? "체험" : (groupType as GroupType)
    if (category === "일반" && !groupType) return

    const created = await createClass({ date, time, group_type: finalGroupType })
    if (created) {
      onAddClass(created)
    }
    handleClose()
  }

  const isValid = category === "체험"
    ? true
    : !!groupType

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>수업 추가</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 수업 타입 선택 */}
          <div className="grid gap-2">
            <Label>수업 타입</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={category === "일반" ? "default" : "outline"}
                className="h-16 flex-col gap-1.5"
                onClick={() => { setCategory("일반"); setGroupType("") }}
                disabled={REGULAR_GROUP_TYPES.every((g) => existingGroupTypes.includes(g))}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">일반</span>
                {REGULAR_GROUP_TYPES.every((g) => existingGroupTypes.includes(g)) && (
                  <span className="text-[10px] text-muted-foreground">이미 존재</span>
                )}
              </Button>
              <Button
                variant={category === "체험" ? "default" : "outline"}
                className="h-16 flex-col gap-1.5"
                onClick={() => { setCategory("체험"); setGroupType("") }}
                disabled={existingGroupTypes.includes("체험")}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm">체험</span>
                {existingGroupTypes.includes("체험") && (
                  <span className="text-[10px] text-muted-foreground">이미 존재</span>
                )}
              </Button>
            </div>
          </div>

          {/* 그룹 타입 (일반 선택 시만) */}
          {category === "일반" && (
            <div className="grid gap-2">
              <Label>그룹 타입</Label>
              <Select value={groupType} onValueChange={(v) => setGroupType(v as GroupType)}>
                <SelectTrigger>
                  <SelectValue placeholder="그룹 선택" />
                </SelectTrigger>
                <SelectContent>
                  {REGULAR_GROUP_TYPES.filter((g) => !existingGroupTypes.includes(g)).map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>취소</Button>
          <Button onClick={handleConfirm} disabled={!isValid}>추가</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
