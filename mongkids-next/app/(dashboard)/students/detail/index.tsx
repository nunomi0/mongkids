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
import AttendanceSection from "./sections/attendance"
import PaymentsSection from "./sections/payments"
import EditStudentModal from "./edit-student-modal"
import AddPaymentModal from "./add-payment-modal"
import type { Student, ClassType, PaymentFormData } from "@/types/student"

// 임시 더미 데이터 - 나중에 Supabase에서 가져올 예정
const DUMMY_CLASS_TYPES: ClassType[] = [
  { id: 1, category: "성인 주 2회", sessions_per_week: 2 },
  { id: 2, category: "성인 주 3회", sessions_per_week: 3 },
  { id: 3, category: "어린이 주 2회", sessions_per_week: 2 },
  { id: 4, category: "어린이 주 3회", sessions_per_week: 3 },
  { id: 5, category: "체험", sessions_per_week: 1 },
]

// 임시 더미 학생 데이터
const DUMMY_STUDENT: Student = {
  id: 1,
  name: "박지영",
  birth_date: "1992-09-07",
  phone: "010-1234-5697",
  class_type_id: 1,
  gender: "여",
  status: "재원",
  shoe_size: "",
  memo: "",
  schedules: [
    { weekday: 3, time: "19:00", group_type: "일반2" },
    { weekday: 5, time: "19:00", group_type: "일반1" },
  ],
}

export default function StudentDetailModal({
  isOpen,
  onClose,
  studentId,
}: {
  isOpen: boolean
  onClose: () => void
  studentId: number | null
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [student, setStudent] = useState<Student>(DUMMY_STUDENT)

  const handleStudentSaved = (updatedStudent: Student) => {
    setStudent(updatedStudent)
    console.log("학생 정보 수정됨:", updatedStudent)
  }

  const handlePaymentSaved = (paymentData: PaymentFormData) => {
    console.log("결제 추가됨:", paymentData)
  }

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

      {/* 학생 정보 수정 모달 */}
      <EditStudentModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleStudentSaved}
        student={student}
        classTypes={DUMMY_CLASS_TYPES}
      />

      {/* 결제 추가 모달 */}
      <AddPaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSaved={handlePaymentSaved}
        studentName={student.name}
      />
    </>
  )
}