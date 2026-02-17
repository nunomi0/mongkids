"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

import ProfileSection from "./sections/profile"
import LevelSection from "./sections/level"
import AttendanceSection from "./sections/attendance"
import PaymentsSection from "./sections/payments"
import EditStudentModal from "./edit-student-modal"
import AddPaymentModal from "./add-payment-modal"
import EditPaymentModal from "./edit-payment-modal"
import EditLevelModal from "./edit-level-modal"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import StatusBadge from "@/components/status-badge"
import {
  fetchStudent,
  fetchPayments,
  fetchLevelHistories,
  updateStudent as updateStudentApi,
  createPayment as createPaymentApi,
  updatePayment as updatePaymentApi,
  deletePayment as deletePaymentApi,
  saveLevelHistories,
} from "@/lib/queries"
import type {
  Student,
  PaymentFormData,
  Payment,
  LevelHistory,
  StudentStatus,
} from "@/types/student"

const STATUS_ACTIONS: { status: StudentStatus; label: string; description: string }[] = [
  { status: "재원", label: "재원으로 변경", description: "학생을 재원 상태로 변경합니다." },
  { status: "휴원", label: "휴원 처리", description: "학생을 휴원 처리합니다. 수업이 일시 중단됩니다." },
  { status: "퇴원", label: "퇴원 처리", description: "학생을 퇴원 처리합니다. 이 작업은 되돌릴 수 있습니다." },
  { status: "체험", label: "체험으로 변경", description: "학생을 체험 상태로 변경합니다." },
]

export default function StudentDetailModal({
  isOpen,
  onClose,
  studentId,
  student: studentFromList,
  onStatusChange,
}: {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
  student: any | null
  onStatusChange: (studentId: string, status: StudentStatus) => void
}) {
  const [student, setStudent] = useState<Student | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [levelHistories, setLevelHistories] = useState<LevelHistory[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch student detail data from Supabase
  useEffect(() => {
    if (!studentId || !isOpen) return

    const loadData = async () => {
      setLoading(true)
      const [studentData, paymentsData, levelsData] = await Promise.all([
        fetchStudent(studentId),
        fetchPayments(studentId),
        fetchLevelHistories(studentId),
      ])
      if (studentData) setStudent(studentData)
      setPayments(paymentsData)
      setLevelHistories(levelsData)
      setLoading(false)
    }

    loadData()
  }, [studentId, isOpen])

  // 모달 상태
  const [editOpen, setEditOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editPaymentOpen, setEditPaymentOpen] = useState(false)
  const [editLevelOpen, setEditLevelOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [pendingStatus, setPendingStatus] = useState<StudentStatus | null>(null)

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

  const closeStatusConfirm = useCallback(() => {
    setStatusConfirmOpen(false)
    setPendingStatus(null)
  }, [])

  const handleStudentSaved = useCallback(async (updatedStudent: Student) => {
    setStudent(updatedStudent)
    await updateStudentApi(updatedStudent.id, updatedStudent, updatedStudent.schedules)
  }, [])

  const handlePaymentAdded = useCallback(async (paymentData: PaymentFormData) => {
    if (!student) return
    const created = await createPaymentApi(student.id, paymentData)
    if (created) {
      setPayments((prev) => [created, ...prev])
    }
  }, [student])

  const handleEditPayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment)
    setEditPaymentOpen(true)
  }, [])

  const handlePaymentUpdated = useCallback(async (updatedPayment: Payment) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
    )
    setSelectedPayment(null)
    await updatePaymentApi(updatedPayment)
  }, [])

  const handleDeletePayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment)
    setDeleteConfirmOpen(true)
  }, [])

  const handlePaymentDeleted = useCallback(async () => {
    if (!selectedPayment) return
    setPayments((prev) => prev.filter((p) => p.id !== selectedPayment.id))
    await deletePaymentApi(selectedPayment.id)
    setSelectedPayment(null)
  }, [selectedPayment])

  const handleLevelHistoriesSaved = useCallback(async (histories: LevelHistory[]) => {
    setLevelHistories(histories)
    if (student) {
      await saveLevelHistories(student.id, histories)
    }
  }, [student])

  const handleStatusChangeRequest = useCallback((newStatus: StudentStatus) => {
    if (!student || student.status === newStatus) return
    setPendingStatus(newStatus)
    setStatusConfirmOpen(true)
  }, [student])

  const handleStatusChangeConfirm = useCallback(async () => {
    if (!student || !pendingStatus) return
    setStudent((prev) => prev ? { ...prev, status: pendingStatus } : null)
    onStatusChange(student.id, pendingStatus)
    setPendingStatus(null)
  }, [student, pendingStatus, onStatusChange])

  const deleteDescription = selectedPayment
    ? `${selectedPayment.payment_date} 결제 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
    : ""

  const statusAction = STATUS_ACTIONS.find((a) => a.status === pendingStatus)
  const statusDescription = statusAction?.description || ""

  if (!student) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl p-0">
          <div className="h-[90vh] overflow-y-auto p-6 space-y-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DialogTitle>학생 상세 정보</DialogTitle>
                  <StatusBadge status={student.status} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      상태 변경
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_ACTIONS.map((action) => (
                      <DropdownMenuItem
                        key={action.status}
                        onClick={() => handleStatusChangeRequest(action.status)}
                        disabled={student.status === action.status}
                      >
                        {action.label}
                        {student.status === action.status && (
                          <span className="ml-2 text-muted-foreground">(현재)</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </DialogHeader>

            <div className="flex gap-4 items-stretch">
              <div className="flex-1">
                <ProfileSection className="h-full" student={student} />
              </div>
              <div className="flex-1">
                <LevelSection
                  className="h-full"
                  histories={levelHistories}
                  onEdit={openEditLevelModal}
                />
              </div>
            </div>

            <AttendanceSection studentId={student.id} />

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

      <EditStudentModal
        isOpen={editOpen}
        onClose={closeEditModal}
        onSaved={handleStudentSaved}
        student={student}
      />

      <AddPaymentModal
        isOpen={paymentOpen}
        onClose={closePaymentModal}
        onSaved={handlePaymentAdded}
        studentName={student.name}
      />

      <EditPaymentModal
        isOpen={editPaymentOpen}
        onClose={closeEditPaymentModal}
        onSaved={handlePaymentUpdated}
        payment={selectedPayment}
      />

      <EditLevelModal
        isOpen={editLevelOpen}
        onClose={closeEditLevelModal}
        onSaved={handleLevelHistoriesSaved}
        histories={levelHistories}
      />

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

      <ConfirmDialog
        isOpen={statusConfirmOpen}
        onClose={closeStatusConfirm}
        onConfirm={handleStatusChangeConfirm}
        title={statusAction?.label || "상태 변경"}
        description={statusDescription}
        confirmText="변경"
        cancelText="취소"
        variant="default"
      />
    </>
  )
}
