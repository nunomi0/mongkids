"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import ProfileSection from "./sections/profile"
import LevelSection from "./sections/level"
import AttendanceSection from "./sections/attendence"
import PaymentsSection from "./sections/payments"

export default function StudentDetailModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl p-0">

          <div className="h-[90vh] overflow-y-auto p-6 space-y-6">

            <DialogHeader>
              <DialogTitle>학생 상세 정보</DialogTitle>
            </DialogHeader>

            <div className="flex gap-4 items-stretch">
              <div className="flex-1">
                <ProfileSection className="h-full" />
              </div>
              <div className="flex-1">
                <LevelSection className="h-full" />
              </div>
            </div>

            <AttendanceSection />
            <PaymentsSection />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>정보 수정</Button>
              <Button onClick={() => setPaymentOpen(true)}>결제 추가</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}