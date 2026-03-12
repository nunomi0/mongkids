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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { CATEGORY_OPTIONS } from "@/lib/constants"
import type {
  StudentFormData,
  StudentSchedule,
  CategoryType,
  Gender,
  StudentStatus,
  GroupType,
} from "@/types/student"

const WEEKDAYS = [
  { value: 0, label: "일" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
]

const TIMES = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
]

const GROUP_TYPES: GroupType[] = ["일반1", "일반2", "스페셜", "체험"]
const GENDERS: Gender[] = ["남", "여"]
const STATUSES: StudentStatus[] = ["재원", "휴원", "퇴원", "체험"]

type FormErrors = {
  name?: string
  birth_date?: string
  phone?: string
  category?: string
  schedules?: string
}

const initialFormData: StudentFormData = {
  name: "",
  birth_date: "",
  phone: "",
  category: "어린이",
  sessions_per_week: 2,
  gender: "남",
  status: "재원",
  shoe_size: "",
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSaved: (data: StudentFormData, schedules: StudentSchedule[]) => void
  initialData?: Partial<StudentFormData>
}

export default function AddStudentModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
}: Props) {
  const [formData, setFormData] = useState<StudentFormData>(initialFormData)
  const [schedules, setSchedules] = useState<StudentSchedule[]>([])
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = useCallback(() => {
    setFormData({
      ...initialFormData,
      ...initialData,
    })
    setSchedules([])
    setErrors({})
  }, [initialData])

  useEffect(() => {
    if (!isOpen) return
    resetForm()
  }, [isOpen, resetForm])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const handleInputChange = (field: keyof StudentFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const addSchedule = () => {
    setSchedules((prev) => [
      ...prev,
      { weekday: 1, time: "15:00", group_type: "일반1" },
    ])
    if (errors.schedules) {
      setErrors((prev) => ({ ...prev, schedules: undefined }))
    }
  }

  const removeSchedule = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index))
  }

  const updateSchedule = (
    index: number,
    field: keyof StudentSchedule,
    value: string | number
  ) => {
    setSchedules((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
    if (errors.schedules) {
      setErrors((prev) => ({ ...prev, schedules: undefined }))
    }
  }

  const hasDuplicateSchedules = () => {
    const seen = new Set<string>()
    for (const s of schedules) {
      const key = `${s.weekday}-${s.time}`
      if (seen.has(key)) return true
      seen.add(key)
    }
    return false
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "이름을 입력하세요"
    }

    if (!formData.birth_date) {
      newErrors.birth_date = "생년월일을 입력하세요"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "전화번호를 입력하세요"
    }

    if (!formData.category) {
      newErrors.category = "등록반을 선택하세요"
    }

    if (schedules.length !== formData.sessions_per_week) {
      newErrors.schedules = `${formData.category} 주 ${formData.sessions_per_week}회 수업입니다. 현재 ${schedules.length}개 등록됨`
    } else if (hasDuplicateSchedules()) {
      newErrors.schedules = "중복된 수업 시간이 있습니다"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    onSaved(formData, schedules)
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>학생 추가</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="홍길동"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">
                생년월일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange("birth_date", e.target.value)}
              />
              {errors.birth_date && <p className="text-sm text-red-500">{errors.birth_date}</p>}
            </div>

            <div className="space-y-2">
              <Label>성별</Label>
              <Select value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                전화번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="010-1234-5678"
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label>상태</Label>
              <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shoe_size">신발 사이즈</Label>
              <Input
                id="shoe_size"
                value={formData.shoe_size}
                onChange={(e) => handleInputChange("shoe_size", e.target.value)}
                placeholder="250"
              />
            </div>

            {/* 등록반 (category + sessions_per_week) */}
            <div className="space-y-2">
              <Label>
                등록반 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(v) => handleInputChange("category", v)}
              >
                <SelectTrigger><SelectValue placeholder="등록반 선택" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label>주 횟수</Label>
              <Select
                value={formData.sessions_per_week.toString()}
                onValueChange={(v) => handleInputChange("sessions_per_week", parseInt(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">주 1회</SelectItem>
                  <SelectItem value="2">주 2회</SelectItem>
                  <SelectItem value="3">주 3회</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 수업 시간 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>수업 시간</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
                <Plus className="h-4 w-4 mr-1" />시간 추가
              </Button>
            </div>

            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">수업 시간을 추가해주세요</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule, index) => (
                  <div key={index} className="flex items-center gap-2 w-full">
                    <Select value={schedule.weekday.toString()} onValueChange={(v) => updateSchedule(index, "weekday", parseInt(v))}>
                      <SelectTrigger className="flex-1 min-w-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((d) => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={schedule.time} onValueChange={(v) => updateSchedule(index, "time", v)}>
                      <SelectTrigger className="flex-1 min-w-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={schedule.group_type} onValueChange={(v) => updateSchedule(index, "group_type", v)}>
                      <SelectTrigger className="flex-1 min-w-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GROUP_TYPES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeSchedule(index)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {errors.schedules && <p className="text-sm text-red-500">{errors.schedules}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit}>추가</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
