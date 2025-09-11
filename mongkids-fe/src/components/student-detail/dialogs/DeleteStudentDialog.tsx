import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"

export default function DeleteStudentDialog({ open, onOpenChange, confirmName, setConfirmName, studentName, onConfirm }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  confirmName: string
  setConfirmName: (v: string) => void
  studentName: string
  onConfirm: () => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>학생 삭제 확인</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">정말로 <strong>{studentName}</strong> 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          <p className="text-sm text-muted-foreground">확인을 위해 학생 이름을 입력하세요.</p>
          <Input value={confirmName} onChange={(e)=>setConfirmName(e.target.value)} placeholder="학생 이름" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>{ onOpenChange(false); setConfirmName('') }}>취소</Button>
            <Button variant="destructive" disabled={confirmName !== studentName} onClick={onConfirm}>삭제</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


