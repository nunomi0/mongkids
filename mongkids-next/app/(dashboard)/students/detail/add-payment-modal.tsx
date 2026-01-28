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
import { Plus, Trash2 } from "lucide-react"
import type { PaymentFormData, PaymentMethod, Discount } from "@/types/student"

const PAYMENT_METHODS: PaymentMethod[] = ["계좌이체", "카드결제", "스포츠바우처", "현금"]

const DISCOUNT_TYPES = ["신발", "형제자매", "추가", "이벤트", "기타"]

type FormErrors = {
  payment_date?: string
  target_month?: string
  amount?: string
  method?: string
}

const getDefaultMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

const getToday = () => {
  const now = new Date()
  return now.toISOString().split("T")[0]
}

const initialFormData: PaymentFormData = {
  payment_date: getToday(),
  target_month: getDefaultMonth(),
  amount: "",
  method: "계좌이체",
  discounts: [],
  memo: "",
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSaved: (data: PaymentFormData) => void
  studentName?: string
}

export default function AddPaymentModal({
  isOpen,
  onClose,
  onSaved,
  studentName,
}: Props) {
  const [formData, setFormData] = useState<PaymentFormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = useCallback(() => {
    setFormData({
      ...initialFormData,
      payment_date: getToday(),
      target_month: getDefaultMonth(),
    })
    setErrors({})
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const addDiscount = () => {
    setFormData((prev) => ({
      ...prev,
      discounts: [...prev.discounts, { type: "신발", amount: 0 }],
    }))
  }

  const removeDiscount = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      discounts: prev.discounts.filter((_, i) => i !== index),
    }))
  }

  const updateDiscount = (index: number, field: keyof Discount, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      discounts: prev.discounts.map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      ),
    }))
  }

  const calculateFinalAmount = () => {
    const baseAmount = parseInt(formData.amount) || 0
    const totalDiscount = formData.discounts.reduce((sum, d) => sum + (d.amount || 0), 0)
    return Math.max(0, baseAmount - totalDiscount)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("ko-KR") + "원"
  }

  const formatMonth = (value: string) => {
    if (!value) return ""
    const [year, month] = value.split("-")
    return `${year}년 ${parseInt(month)}월`
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.payment_date) {
      newErrors.payment_date = "결제일을 입력하세요"
    }

    if (!formData.target_month) {
      newErrors.target_month = "해당월을 입력하세요"
    }

    if (!formData.amount || parseInt(formData.amount) <= 0) {
      newErrors.amount = "금액을 입력하세요"
    }

    if (!formData.method) {
      newErrors.method = "결제수단을 선택하세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    onSaved(formData)
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            결제 추가
            {studentName && (
              <span className="text-muted-foreground font-normal ml-2">
                - {studentName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 결제일 */}
          <div className="space-y-2">
            <Label htmlFor="payment_date">
              결제일 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => handleInputChange("payment_date", e.target.value)}
            />
            {errors.payment_date && (
              <p className="text-sm text-red-500">{errors.payment_date}</p>
            )}
          </div>

          {/* 해당월 */}
          <div className="space-y-2">
            <Label htmlFor="target_month">
              해당월 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="target_month"
              type="month"
              value={formData.target_month}
              onChange={(e) => handleInputChange("target_month", e.target.value)}
            />
            {formData.target_month && (
              <p className="text-sm text-muted-foreground">
                {formatMonth(formData.target_month)} 수업료
              </p>
            )}
            {errors.target_month && (
              <p className="text-sm text-red-500">{errors.target_month}</p>
            )}
          </div>

          {/* 금액 */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              금액 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              placeholder="150000"
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* 결제수단 */}
          <div className="space-y-2">
            <Label>
              결제수단 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.method}
              onValueChange={(v) => handleInputChange("method", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.method && (
              <p className="text-sm text-red-500">{errors.method}</p>
            )}
          </div>

          {/* 할인 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>할인</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDiscount}
              >
                <Plus className="h-4 w-4 mr-1" />
                할인 추가
              </Button>
            </div>

            {formData.discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">할인 없음</p>
            ) : (
              <div className="space-y-2">
                {formData.discounts.map((discount, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {/* 할인 유형 */}
                    <Select
                      value={discount.type}
                      onValueChange={(v) => updateDiscount(index, "type", v)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* 할인 금액 */}
                    <Input
                      type="number"
                      value={discount.amount || ""}
                      onChange={(e) =>
                        updateDiscount(index, "amount", parseInt(e.target.value) || 0)
                      }
                      placeholder="10000"
                      className="flex-1"
                    />

                    {/* 삭제 버튼 */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDiscount(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Input
              id="memo"
              value={formData.memo}
              onChange={(e) => handleInputChange("memo", e.target.value)}
              placeholder="메모 입력"
            />
          </div>

          {/* 최종 금액 */}
          {formData.amount && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">기본 금액</span>
                <span>{formatCurrency(parseInt(formData.amount) || 0)}</span>
              </div>
              {formData.discounts.length > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>할인 합계</span>
                    <span className="text-red-500">
                      -{formatCurrency(formData.discounts.reduce((sum, d) => sum + (d.amount || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-semibold mt-2 pt-2 border-t">
                    <span>최종 금액</span>
                    <span>{formatCurrency(calculateFinalAmount())}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleSubmit}>추가</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
