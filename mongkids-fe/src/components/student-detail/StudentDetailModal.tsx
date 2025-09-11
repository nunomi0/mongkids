import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Card } from "../ui/card"
import HeaderCard from "./HeaderCard"
import LevelHistoryCard from "./LevelHistoryCard"
import AttendanceSection from "./AttendanceSection"
import PaymentsSection from "./PaymentsSection"
import { useStudentDetailData } from "./useStudentDetailData"

export default function StudentDetailModal({ isOpen, onClose, studentId }: { isOpen: boolean; onClose: () => void; studentId: number | null }) {
  const { student, classTypes, levelHistories, attendance, payments, attnYearMonth, setAttnYearMonth, loading, reload } = useStudentDetailData(studentId, isOpen)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] p-0 overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">학생 상세 정보</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>
        ) : student ? (
          <div className="flex flex-col p-4 gap-4">
            <HeaderCard student={student} classTypes={classTypes} onReload={reload} />
            <LevelHistoryCard levelHistories={levelHistories} student={student} onReload={reload} />
            <AttendanceSection attendance={attendance} attnYearMonth={attnYearMonth} setAttnYearMonth={setAttnYearMonth} student={student} onReload={reload} />
            <PaymentsSection payments={payments} student={student} onReload={reload} />
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">학생 정보를 찾을 수 없습니다.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}


