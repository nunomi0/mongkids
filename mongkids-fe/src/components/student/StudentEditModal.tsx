import React, { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { supabase } from "../../lib/supabase"
import { ClassType, Student, StudentSchedule, GroupType } from "../../types/student"
import DeleteStudentDialog from "./DeleteStudentDialog"

type Props = {
  isOpen: boolean
  onClose: () => void
  student: Student | null
  classTypes: ClassType[]
  onSaved: () => void
  onDeleted: () => void
}

export default function StudentEditModal({ isOpen, onClose, student, classTypes, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<{ name: string; birth_date: string; phone: string; class_type_id: string; gender: '남'|'여'; status: '재원'|'휴원'|'퇴원'; shoe_size: string } | null>(null)
  const [schedules, setSchedules] = useState<Array<{ weekday: number; time: string; group_type: GroupType }>>([])
  const [levelDates, setLevelDates] = useState<Record<string, string>>({})
  const weekdayNames = ['월','화','수','목','금','토','일']
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState("")
  const selectedClassType = React.useMemo(()=>{
    if (!form) return null
    const id = form.class_type_id ? parseInt(form.class_type_id) : NaN
    if (Number.isNaN(id)) return null
    return classTypes.find(c=> c.id === id) || null
  }, [form, classTypes])
  const scheduleValidation = React.useMemo(()=>{
    // 중복 검사 (요일-시간-그룹 단위)
    const keySet = new Set<string>()
    let hasDuplicate = false
    for (const s of schedules) {
      const key = `${s.weekday}-${s.time}-${s.group_type}`
      if (keySet.has(key)) { hasDuplicate = true; break }
      keySet.add(key)
    }
    // 주 n회와 일치 검사
    const required = selectedClassType?.sessions_per_week
    const countMismatch = !!required && schedules.length !== required
    return { hasDuplicate, countMismatch, required: required ?? null }
  }, [schedules, selectedClassType])

  useEffect(() => {
    if (!student) { setForm(null); setSchedules([]); return }
    setForm({
      name: student.name,
      birth_date: student.birth_date,
      phone: student.phone,
      class_type_id: student.class_type_id ? String(student.class_type_id) : '',
      gender: (student.gender || '남'),
      status: student.status,
      shoe_size: student.shoe_size ? String(student.shoe_size) : ''
    })
    setSchedules((student.schedules || []).map(s => ({ weekday: s.weekday, time: s.time, group_type: s.group_type })))
    ;(async ()=>{
      if (!student) return
      const { data, error } = await supabase.from('student_levels').select('level, acquired_date').eq('student_id', student.id)
      if (!error && data) {
        const map: Record<string, string> = {}
        data.forEach((row: any)=>{ map[row.level] = row.acquired_date?.slice(0,10) || '' })
        setLevelDates(map)
      } else {
        setLevelDates({})
      }
    })()
  }, [student])

  const addSchedule = () => setSchedules(prev => [...prev, { weekday: 0, time: '00:00', group_type: '일반1' }])
  const removeSchedule = (idx: number) => setSchedules(prev => prev.filter((_, i) => i !== idx))
  const updateSchedule = (idx: number, key: 'weekday'|'time'|'group_type', value: number|string) => setSchedules(prev => {
    const next = [...prev]; (next[idx] as any)[key] = value; return next
  })

  const handleSave = async () => {
    if (!student || !form) return
    if (scheduleValidation.hasDuplicate || scheduleValidation.countMismatch) return
    try {
      const payload: any = {
        name: form.name,
        birth_date: form.birth_date,
        phone: form.phone,
        class_type_id: form.class_type_id ? parseInt(form.class_type_id) : null,
        gender: form.gender,
        status: form.status,
        shoe_size: form.shoe_size || null,
      }
      {
        const { error } = await supabase.from('students').update(payload).eq('id', student.id)
        if (error) throw error
      }
      // 스케줄 재작성(간단 처리)
      {
        const { error } = await supabase.from('student_schedules').delete().eq('student_id', student.id)
        if (error) throw error
        const rows = schedules.map(s => ({ student_id: student.id, weekday: s.weekday, time: s.time, group_type: s.group_type }))
        console.log('삽입할 스케줄 데이터:', rows)
        if (rows.length) {
          const { error: insErr } = await supabase.from('student_schedules').insert(rows as any)
          if (insErr) {
            console.error('스케줄 삽입 에러:', insErr)
            throw insErr
          }
        }
      }
      // 레벨 이력 재작성(간단 처리)
      {
        const { error } = await supabase.from('student_levels').delete().eq('student_id', student.id)
        if (error) throw error
        const levels = ['WHITE','YELLOW','GREEN','BLUE','RED','BLACK','GOLD']
        const rows = levels
          .filter(l => levelDates[l])
          .map(l => ({ student_id: student.id, level: l, acquired_date: levelDates[l] }))
        if (rows.length) {
          const { error: insErr } = await supabase.from('student_levels').insert(rows as any)
          if (insErr) throw insErr
        }
      }
      onSaved()
      onClose()
    } catch (e) {
      console.error('학생 저장 실패:', e)
      console.error('에러 상세:', JSON.stringify(e, null, 2))
    }
  }

  const handleDelete = async () => {
    if (!student) return
    try {
      // 참조 데이터 선삭제
      const delTables = ['attendance','payments','student_schedules','student_levels']
      for (const tbl of delTables) {
        const { error } = await supabase.from(tbl).delete().eq('student_id', student.id)
        if (error) throw error
      }
      // 학생 삭제
      {
        const { error } = await supabase.from('students').delete().eq('id', student.id)
        if (error) throw error
      }
      onDeleted(); onClose()
    } catch (e) { console.error('학생 삭제 실패:', e) }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="m">
        <DialogHeader>
          <DialogTitle>학생 정보 수정</DialogTitle>
        </DialogHeader>
        {!form ? (
          <div className="p-6 text-center text-muted-foreground">불러오는 중...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 상단 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-2">
              <div>
                <label className="text-xs text-muted-foreground">이름</label>
                <Input 
                  value={form.name} 
                  onChange={(e)=>setForm(f=>f?{...f, name: e.target.value}:f)} 
                  placeholder="학생 이름"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">생년월일</label>
                <Input 
                  type="date"
                  inputMode="numeric"
                  value={form.birth_date}
                  max={new Date().toISOString().slice(0,10)}
                  min={"2000-01-01"}
                  onChange={(e)=>{
                    const v = (e.target.value || '').slice(0,10)
                    setForm(f=>f?{...f, birth_date: v}:f)
                  }} 
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">성별</label>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant={form.gender==='남'?'default':'outline'} size="sm" onClick={()=>setForm(f=>f?{...f, gender:'남'}:f)}>남</Button>
                  <Button type="button" variant={form.gender==='여'?'default':'outline'} size="sm" onClick={()=>setForm(f=>f?{...f, gender:'여'}:f)}>여</Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">전화번호</label>
                <Input 
                  value={form.phone} 
                  onChange={(e)=>setForm(f=>f?{...f, phone: e.target.value}:f)} 
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">재원 상태</label>
                <select className="w-full p-2 border rounded" value={form.status} onChange={(e)=>setForm(f=>f?{...f, status: e.target.value as any}:f)}>
                  <option value="재원">재원</option>
                  <option value="휴원">휴원</option>
                  <option value="퇴원">퇴원</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">신발 사이즈</label>
                <Input 
                  placeholder="mm" 
                  value={form.shoe_size} 
                  onChange={(e)=>setForm(f=>f?{...f, shoe_size: e.target.value}:f)} 
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">등록반</label>
                <select className="w-full p-2 border rounded" value={form.class_type_id} onChange={(e)=>setForm(f=>f?{...f, class_type_id: e.target.value}:f)}>
                  <option value="">선택</option>
                  {classTypes.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.category} 주 {ct.sessions_per_week}회</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 수업 시간 */}
            <div className="px-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">수업 시간</div>
                <Button type="button" variant="outline" size="sm" onClick={addSchedule}>시간 추가</Button>
              </div>
              {scheduleValidation.hasDuplicate && (
                <div className="text-xs text-red-600 mb-2">수업 시간이 중복되었습니다. 요일/시간/그룹이 동일한 항목이 있습니다.</div>
              )}
              {scheduleValidation.countMismatch && (
                <div className="text-xs text-red-600 mb-2">현재 선택한 반은 주 {scheduleValidation.required}회 수업입니다. 시간 수가 일치하지 않습니다.</div>
              )}
              <div className="space-y-2">
                {schedules.map((sch, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                    <select value={sch.weekday} onChange={(e)=>updateSchedule(idx, 'weekday', parseInt(e.target.value))} className="p-1 text-sm border rounded">
                      {weekdayNames.map((n,i)=> (<option key={i} value={i}>{n}</option>))}
                    </select>
                    <select value={sch.time} onChange={(e)=>updateSchedule(idx, 'time', e.target.value)} className="p-1 text-sm border rounded">
                      {Array.from({length: 24}, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return <option key={i} value={`${hour}:00`}>{hour}:00</option>
                      })}
                    </select>
                    <select value={sch.group_type} onChange={(e)=>updateSchedule(idx, 'group_type', e.target.value)} className="p-1 text-sm border rounded">
                      {(['일반1', '일반2', '스페셜', '체험'] as GroupType[]).map(type => (<option key={type} value={type}>{type}</option>))}
                    </select>
                    <Button type="button" variant="outline" size="sm" className="text-red-600" onClick={()=>removeSchedule(idx)}>삭제</Button>
                  </div>
                ))}
                {schedules.length === 0 && (
                  <div className="text-sm text-muted-foreground">수업 시간을 추가해주세요</div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2">수업 시간 변경은 다음 출석부 생성부터 반영됩니다.</div>
            </div>

            {/* 레벨 이력 날짜 수정 */}
            <div className="px-4">
              <div className="text-sm font-medium mb-2">레벨 이력</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['WHITE','YELLOW','GREEN','BLUE','RED','BLACK','GOLD'].map(level => (
                  <div key={level} className="p-2 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs font-medium">{level}</div>
                    </div>
                    <Input type="date" value={levelDates[level] || ''} onChange={(e)=> setLevelDates(prev=>({ ...prev, [level]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">빈 값이면 해당 레벨 이력은 삭제됩니다.</div>
            </div>

            {/* 액션 */}
            <div className="flex items-center justify-end gap-2">
              <Button 
                variant="destructive" 
                onClick={()=>{ setConfirmName(''); setDeleteOpen(true) }}
              >
                학생 삭제
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>취소</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={scheduleValidation.hasDuplicate || scheduleValidation.countMismatch} 
                  title={(scheduleValidation.hasDuplicate||scheduleValidation.countMismatch)?'수업 시간 검증 오류로 저장할 수 없습니다.':''}
                >
                  저장
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      <DeleteStudentDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        confirmName={confirmName}
        setConfirmName={setConfirmName}
        studentName={student?.name || ''}
        onConfirm={async ()=>{ await handleDelete(); setDeleteOpen(false); setConfirmName('') }}
      />
    </Dialog>
  )
}


