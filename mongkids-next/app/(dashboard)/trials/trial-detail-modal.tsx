"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import TrialStatusBadge from "@/components/trial-status-badge"
import type { TrialReservation, TrialStatus, Gender } from "@/types/student"

const GRADE_OPTIONS = [
  "6세", "7세",
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
  "고1", "고2", "고3",
]

const STATUS_OPTIONS: TrialStatus[] = ["예정", "노쇼", "미등록", "등록"]

type Props = {
  isOpen: boolean
  onClose: () => void
  reservation: TrialReservation | null
  onUpdate: (updated: TrialReservation) => void
  onDelete: (id: string) => void
}

export default function TrialDetailModal({ isOpen, onClose, reservation, onUpdate, onDelete }: Props) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    gender: "" as Gender | "",
    grade: "",
    status: "예정" as TrialStatus,
    note: "",
  })

  useEffect(() => {
    if (reservation && isOpen) {
      setEditForm({
        name: reservation.name,
        phone: reservation.phone,
        gender: reservation.gender,
        grade: reservation.grade,
        status: reservation.status,
        note: reservation.note,
      })
      setIsEditMode(false)
    }
  }, [reservation, isOpen])

  const handleSave = useCallback(() => {
    if (!reservation) return
    onUpdate({
      ...reservation,
      ...editForm,
    })
    setIsEditMode(false)
  }, [reservation, editForm, onUpdate])

  const handleCancel = useCallback(() => {
    if (!reservation) return
    setEditForm({
      name: reservation.name,
      phone: reservation.phone,
      gender: reservation.gender,
      grade: reservation.grade,
      status: reservation.status,
      note: reservation.note,
    })
    setIsEditMode(false)
  }, [reservation])

  const handleDelete = useCallback(() => {
    if (!reservation) return
    if (confirm(`${reservation.name} 체험 예약을 삭제하시겠습니까?`)) {
      onDelete(reservation.id)
      onClose()
    }
  }, [reservation, onDelete, onClose])

  if (!reservation) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>체험자 정보</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              {isEditMode ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="max-w-[180px] h-8 text-base font-semibold"
                />
              ) : (
                <span>{reservation.name}</span>
              )}
              {isEditMode ? (
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as TrialStatus }))}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <TrialStatusBadge status={reservation.status} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">성별:</span>
                {isEditMode ? (
                  <div className="mt-1 flex gap-2">
                    <Button type="button" variant={editForm.gender === "남" ? "default" : "outline"} size="sm" onClick={() => setEditForm((f) => ({ ...f, gender: "남" }))}>남</Button>
                    <Button type="button" variant={editForm.gender === "여" ? "default" : "outline"} size="sm" onClick={() => setEditForm((f) => ({ ...f, gender: "여" }))}>여</Button>
                  </div>
                ) : (
                  <span className="ml-2">{reservation.gender || "-"}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">학년:</span>
                {isEditMode ? (
                  <Select value={editForm.grade} onValueChange={(v) => setEditForm((f) => ({ ...f, grade: v }))}>
                    <SelectTrigger className="mt-1 h-8">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="ml-2">{reservation.grade || "-"}</span>
                )}
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">전화번호:</span>
              {isEditMode ? (
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1 h-8" />
              ) : (
                <span className="ml-2">{reservation.phone}</span>
              )}
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">메모:</span>
              {isEditMode ? (
                <Textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                  className="mt-1"
                  rows={3}
                  placeholder="메모 입력"
                />
              ) : (
                <span className="ml-2">{reservation.note || "-"}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          {isEditMode ? (
            <>
              <Button variant="destructive" size="sm" onClick={handleDelete}>삭제</Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleCancel}>취소</Button>
              <Button size="sm" onClick={handleSave}>저장</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>편집</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
