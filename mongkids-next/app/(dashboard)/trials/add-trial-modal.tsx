"use client"

import { useState, useCallback } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Gender } from "@/types/student"

const GRADE_OPTIONS = [
  "6세", "7세",
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
  "고1", "고2", "고3",
]

const TIME_OPTIONS = Array.from({ length: 14 }, (_, i) => {
  const h = (9 + i).toString().padStart(2, "0")
  return `${h}:00`
})

type Props = {
  isOpen: boolean
  onClose: () => void
  onSaved: (data: { name: string; phone: string; gender: string; grade: string }) => void
}

export default function AddTrialModal({ isOpen, onClose, onSaved }: Props) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [gender, setGender] = useState<Gender>("남")
  const [grade, setGrade] = useState("초1")
  const [trialDate, setTrialDate] = useState("")
  const [trialTime, setTrialTime] = useState("15:00")

  const resetForm = useCallback(() => {
    setName("")
    setPhone("")
    setGender("남")
    setGrade("초1")
    setTrialDate("")
    setTrialTime("15:00")
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return

    onSaved({
      name: name.trim(),
      phone: phone.trim(),
      gender,
      grade,
    })
    handleClose()
  }

  const isValid = !!name.trim() && !!phone.trim()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>체험 예약 등록</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="체험자 이름"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>
                전화번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>성별</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={gender === "남" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setGender("남")}
                >
                  남
                </Button>
                <Button
                  type="button"
                  variant={gender === "여" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setGender("여")}
                >
                  여
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>학년</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={!isValid}>등록</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
