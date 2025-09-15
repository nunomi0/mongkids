import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import { Student, ClassType, StudentStatus } from "../../../types/student"

export default function EditStudentDialog({ open, onOpenChange, editStudent, setEditStudent, classTypes, onSubmit }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editStudent: { name: string; birth_date: string; phone: string; shoe_size: string; status: StudentStatus; class_type_id: string; current_level: '' | 'WHITE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'BLACK' | 'GOLD' | 'NONE' } | null
  setEditStudent: React.Dispatch<React.SetStateAction<any>>
  classTypes: ClassType[]
  onSubmit: () => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="s">
        <DialogHeader>
          <DialogTitle>학생 정보 수정</DialogTitle>
        </DialogHeader>
        {editStudent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">이름</label>
              <Input value={editStudent.name} onChange={(e)=>setEditStudent((s:any)=>s?{...s, name:e.target.value}:s)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">생년월일</label>
              <Input type="date" value={editStudent.birth_date} onChange={(e)=>setEditStudent((s:any)=>s?{...s, birth_date:e.target.value}:s)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">전화번호</label>
              <Input value={editStudent.phone} onChange={(e)=>setEditStudent((s:any)=>s?{...s, phone:e.target.value}:s)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">신발 사이즈</label>
              <Input value={editStudent.shoe_size} onChange={(e)=>setEditStudent((s:any)=>s?{...s, shoe_size:e.target.value}:s)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">상태</label>
              <select className="w-full p-2 border rounded" value={editStudent.status} onChange={(e)=>setEditStudent((s:any)=>s?{...s, status:e.target.value as StudentStatus}:s)}>
                <option value="재원">재원</option>
                <option value="휴원">휴원</option>
                <option value="퇴원">퇴원</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">현재 레벨</label>
              <select className="w-full p-2 border rounded" value={editStudent.current_level} onChange={(e)=>setEditStudent((s:any)=>s?{...s, current_level:e.target.value as any}:s)}>
                {['', 'WHITE','YELLOW','GREEN','BLUE','RED','BLACK','GOLD','NONE'].map(l=> (
                  <option key={l} value={l}>{l || '선택 없음'}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">등록반</label>
              <select className="w-full p-2 border rounded" value={editStudent.class_type_id} onChange={(e)=>setEditStudent((s:any)=>s?{...s, class_type_id:e.target.value}:s)}>
                <option value="">선택</option>
                {classTypes.map(ct=> (
                  <option key={ct.id} value={ct.id}>{ct.category} 주 {ct.sessions_per_week}회</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={()=>onOpenChange(false)}>취소</Button>
          <Button onClick={onSubmit}>수정</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


