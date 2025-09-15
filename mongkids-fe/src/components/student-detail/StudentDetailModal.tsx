import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import HeaderCard from "./HeaderCard.tsx"
import LevelHistoryCard from "./LevelHistoryCard.tsx"
import AttendanceSection from "./AttendanceSection.tsx"
import PaymentsSection from "./PaymentsSection.tsx"
import { useStudentDetailData } from "./useStudentDetailData"
import StudentEditModal from "./StudentEditModal"
import AddPaymentDialog from "./dialogs/AddPaymentDialog"
import { supabase } from "../../lib/supabase"

export default function StudentDetailModal({ isOpen, onClose, studentId }: { isOpen: boolean; onClose: () => void; studentId: number | null }) {
  const { student, classTypes, levelHistories, attendance, payments, attnYearMonth, setAttnYearMonth, loading, reload } = useStudentDetailData(studentId, isOpen)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [newPayment, setNewPayment] = useState<{ payment_date: string; payment_month: string; total_amount: string; payment_method: string; shoe_discount: string; sibling_discount: string; additional_discount: string }>({
    payment_date: new Date().toISOString().slice(0, 10),
    payment_month: new Date().toISOString().slice(0, 7),
    total_amount: "",
    payment_method: "account",
    shoe_discount: "0",
    sibling_discount: "0",
    additional_discount: "0",
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent type="m">
    {loading ? (
          <div className="p-6 text-center text-muted-foreground"></div>
        ) : student ? (
          <div className="flex flex-col gap-4">
            <HeaderCard student={student} classTypes={classTypes} onReload={reload} />
            <LevelHistoryCard levelHistories={levelHistories} student={student} onReload={reload} />
            <AttendanceSection attendance={attendance} attnYearMonth={attnYearMonth} setAttnYearMonth={setAttnYearMonth} student={student} onReload={reload} />
            <PaymentsSection payments={payments} student={student} onReload={reload} />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=> setIsEditOpen(true)}>정보 수정</Button>
              <Button onClick={()=> setIsPaymentOpen(true)}>결제 추가</Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">학생 정보를 찾을 수 없습니다.</div>
        )}
      </DialogContent>
    </Dialog>
    <StudentEditModal
      isOpen={isEditOpen}
      onClose={()=> setIsEditOpen(false)}
      student={student || null}
      classTypes={classTypes}
      onSaved={reload}
      onDeleted={reload}
    />
    <AddPaymentDialog
      open={isPaymentOpen}
      onOpenChange={setIsPaymentOpen}
      newPayment={newPayment}
      setNewPayment={setNewPayment}
      onSubmit={async ()=>{
        if (!student) return
        const totalAmount = parseInt(newPayment.total_amount || '0') || 0
        const shoe = parseInt(newPayment.shoe_discount || '0') || 0
        const sibling = parseInt(newPayment.sibling_discount || '0') || 0
        const add = parseInt(newPayment.additional_discount || '0') || 0
        const net = Math.max(0, totalAmount - shoe - sibling - add)
        await supabase.from('payments').insert({
          student_id: student.id,
          payment_date: newPayment.payment_date,
          payment_month: newPayment.payment_month,
          total_amount: net,
          shoe_discount: shoe,
          sibling_discount: sibling,
          additional_discount: add,
          payment_method: newPayment.payment_method,
        })
        setIsPaymentOpen(false)
        reload()
      }}
    />
    </>
  )
}


