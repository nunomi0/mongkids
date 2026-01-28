"use client"

import { useState, useCallback } from "react"
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
import EditPaymentModal from "./edit-payment-modal"
import EditLevelModal from "./edit-level-modal"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import type {
  Student,
  ClassType,
  PaymentFormData,
  Payment,
  LevelHistory,
} from "@/types/student"

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

// 임시 더미 결제 데이터
const DUMMY_PAYMENTS: Payment[] = [
  {
    id: 1,
    student_id: 1,
    payment_date: "2025-10-01",
    target_month: "2025-10",
    amount: 155000,
    method: "계좌이체",
    discounts: [],
    memo: "",
  },
  {
    id: 2,
    student_id: 1,
    payment_date: "2025-09-11",
    target_month: "2025-09",
    amount: 143123,
    method: "계좌이체",
    discounts: [
      { type: "신발", amount: 10000 },
      { type: "형제자매", amount: 10000 },
      { type: "추가", amount: 123123 },
    ],
    memo: "",
  },
  {
    id: 3,
    student_id: 1,
    payment_date: "2025-09-08",
    target_month: "2025-09",
    amount: 150000,
    method: "카드결제",
    discounts: [],
    memo: "",
  },
  {
    id: 4,
    student_id: 1,
    payment_date: "2025-08-05",
    target_month: "2025-08",
    amount: 145000,
    method: "스포츠바우처",
    discounts: [],
    memo: "",
  },
  {
    id: 5,
    student_id: 1,
    payment_date: "2025-07-02",
    target_month: "2025-07",
    amount: 140000,
    method: "계좌이체",
    discounts: [],
    memo: "",
  },
]

// 임시 더미 레벨 이력 데이터
const DUMMY_LEVEL_HISTORIES: LevelHistory[] = [
  { level: "WHITE", acquired_at: "2024-01-10" },
  { level: "YELLOW", acquired_at: "2024-03-02" },
  { level: "GREEN", acquired_at: "2024-06-18" },
  { level: "BLUE", acquired_at: null },
  { level: "RED", acquired_at: null },
  { level: "BLACK", acquired_at: null },
  { level: "GOLD", acquired_at: null },
]

export default function StudentDetailModal({
  isOpen,
  onClose,
  studentId,
}: {
  isOpen: boolean
  onClose: () => void
  studentId: number | null
}) {
  // 학생 정보
  const [student, setStudent] = useState<Student>(DUMMY_STUDENT)

  // 결제 내역
  const [payments, setPayments] = useState<Payment[]>(DUMMY_PAYMENTS)

  // 레벨 이력
  const [levelHistories, setLevelHistories] = useState<LevelHistory[]>(DUMMY_LEVEL_HISTORIES)

  // 모달 상태
  const [editOpen, setEditOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editPaymentOpen, setEditPaymentOpen] = useState(false)
  const [editLevelOpen, setEditLevelOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // 선택된 결제 (수정/삭제용)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  // 모달 열기/닫기 콜백 메모이제이션
  const openEditModal = useCallback(() => setEditOpen(true), [])
  const closeEditModal = useCallback(() => setEditOpen(false), [])

  const openPaymentModal = useCallback(() => setPaymentOpen(true), [])
  const closePaymentModal = useCallback(() => setPaymentOpen(false), [])

  const openEditLevelModal = useCallback(() => setEditLevelOpen(true), [])
  const closeEditLevelModal = useCallback(() => setEditLevelOpen(false), [])

  const closeEditPaymentModal = useCallback(() => {
    setEditPaymentOpen(false)
    setSelectedPayment(null)
  }, [])

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false)
    setSelectedPayment(null)
  }, [])

  // 학생 정보 수정
  const handleStudentSaved = useCallback((updatedStudent: Student) => {
    setStudent(updatedStudent)
  }, [])

  // 결제 추가
  const handlePaymentAdded = useCallback((paymentData: PaymentFormData) => {
    const newPayment: Payment = {
      id: Date.now(),
      student_id: student.id,
      payment_date: paymentData.payment_date,
      target_month: paymentData.target_month,
      amount: parseInt(paymentData.amount) || 0,
      method: paymentData.method,
      discounts: paymentData.discounts,
      memo: paymentData.memo,
    }
    setPayments((prev) => [newPayment, ...prev])
  }, [student.id])

  // 결제 수정 모달 열기
  const handleEditPayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment)
    setEditPaymentOpen(true)
  }, [])

  // 결제 수정 저장
  const handlePaymentUpdated = useCallback((updatedPayment: Payment) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
    )
    setSelectedPayment(null)
  }, [])

  // 결제 삭제 확인 모달 열기
  const handleDeletePayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment)
    setDeleteConfirmOpen(true)
  }, [])

  // 결제 삭제 실행
  const handlePaymentDeleted = useCallback(() => {
    if (!selectedPayment) return
    setPayments((prev) => prev.filter((p) => p.id !== selectedPayment.id))
    setSelectedPayment(null)
  }, [selectedPayment])

  // 레벨 이력 수정
  const handleLevelHistoriesSaved = useCallback((histories: LevelHistory[]) => {
    setLevelHistories(histories)
  }, [])

  // 삭제 확인 메시지
  const deleteDescription = selectedPayment
    ? `${selectedPayment.payment_date} 결제 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
    : ""

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
                <LevelSection
                  className="h-full"
                  histories={levelHistories}
                  onEdit={openEditLevelModal}
                />
              </div>
            </div>

            <AttendanceSection />

            <PaymentsSection
              payments={payments}
              onEdit={handleEditPayment}
              onDelete={handleDeletePayment}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={openEditModal}>정보 수정</Button>
              <Button onClick={openPaymentModal}>결제 추가</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 학생 정보 수정 모달 */}
      <EditStudentModal
        isOpen={editOpen}
        onClose={closeEditModal}
        onSaved={handleStudentSaved}
        student={student}
        classTypes={DUMMY_CLASS_TYPES}
      />

      {/* 결제 추가 모달 */}
      <AddPaymentModal
        isOpen={paymentOpen}
        onClose={closePaymentModal}
        onSaved={handlePaymentAdded}
        studentName={student.name}
      />

      {/* 결제 수정 모달 */}
      <EditPaymentModal
        isOpen={editPaymentOpen}
        onClose={closeEditPaymentModal}
        onSaved={handlePaymentUpdated}
        payment={selectedPayment}
      />

      {/* 레벨 이력 수정 모달 */}
      <EditLevelModal
        isOpen={editLevelOpen}
        onClose={closeEditLevelModal}
        onSaved={handleLevelHistoriesSaved}
        histories={levelHistories}
      />

      {/* 결제 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handlePaymentDeleted}
        title="결제 삭제"
        description={deleteDescription}
        confirmText="삭제"
        cancelText="취소"
        variant="destructive"
      />
    </>
  )
}
