import React, { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { supabase } from "../../lib/supabase"
import { ClassType } from "../../types/student"

type Props = {
  isOpen: boolean
  onClose: () => void
  classTypes: ClassType[]
  onSaved: () => void
}

export default function AddStudentModal({ isOpen, onClose, classTypes, onSaved }: Props) {
  const [form, setForm] = useState<{ 
    name: string; 
    birth_date: string; 
    phone: string; 
    class_type_id: string; 
    gender: '남'|'여'; 
    status: '재원'|'휴원'|'퇴원'; 
    shoe_size: string 
  }>({
    name: '',
    birth_date: '',
    phone: '',
    class_type_id: '',
    gender: '남',
    status: '재원',
    shoe_size: ''
  })
  const [schedules, setSchedules] = useState<Array<{ weekday: number; time: string; group_no: number }>>([])
  const [levelDates, setLevelDates] = useState<Record<string, string>>({})
  const weekdayNames = ['월','화','수','목','금','토','일']
  const [hasSubmitted, setHasSubmitted] = useState(false)

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
      const key = `${s.weekday}-${s.time}-${s.group_no}`
      if (keySet.has(key)) { hasDuplicate = true; break }
      keySet.add(key)
    }
    // 주 n회와 일치 검사
    const required = selectedClassType?.sessions_per_week
    const countMismatch = !!required && schedules.length !== required
    return { hasDuplicate, countMismatch, required: required ?? null }
  }, [schedules, selectedClassType])

  const addSchedule = () => setSchedules(prev => [...prev, { weekday: 0, time: '00:00', group_no: 1 }])
  const removeSchedule = (idx: number) => setSchedules(prev => prev.filter((_, i) => i !== idx))
  const updateSchedule = (idx: number, key: 'weekday'|'time'|'group_no', value: number|string) => setSchedules(prev => {
    const next = [...prev]; (next[idx] as any)[key] = value; return next
  })

  const handleSave = async () => {
    if (!form.name || !form.birth_date || !form.phone || !form.class_type_id) {
      setHasSubmitted(true)
      return
    }
    if (scheduleValidation.hasDuplicate || scheduleValidation.countMismatch) return
    
    try {
      // 학생 생성
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          name: form.name,
          birth_date: form.birth_date,
          phone: form.phone,
          class_type_id: parseInt(form.class_type_id),
          gender: form.gender,
          status: form.status,
          shoe_size: form.shoe_size || null,
          registration_date: new Date().toISOString().slice(0, 10)
        })
        .select()
        .single()

      if (studentError) throw studentError

      // 스케줄 생성
      if (schedules.length > 0) {
        const scheduleRows = schedules.map(s => ({ 
          student_id: studentData.id, 
          weekday: s.weekday, 
          time: s.time, 
          group_no: s.group_no 
        }))
        const { error: scheduleError } = await supabase.from('student_schedules').insert(scheduleRows)
        if (scheduleError) throw scheduleError
      }

      // 레벨 이력 생성
      const levels = ['WHITE','YELLOW','GREEN','BLUE','RED','BLACK','GOLD']
      const levelRows = levels
        .filter(l => levelDates[l])
        .map(l => ({ student_id: studentData.id, level: l, acquired_date: levelDates[l] }))
      if (levelRows.length > 0) {
        const { error: levelError } = await supabase.from('student_levels').insert(levelRows)
        if (levelError) throw levelError
      }

      onSaved()
      onClose()
      // 폼 초기화
      setForm({
        name: '',
        birth_date: '',
        phone: '',
        class_type_id: '',
        gender: '남',
        status: '재원',
        shoe_size: ''
      })
      setSchedules([])
      setLevelDates({})
      setHasSubmitted(false)
    } catch (e) {
      console.error('학생 추가 실패:', e)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className>
        <DialogHeader>
          <DialogTitle>학생 추가</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* 상단 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground">이름 <span className="text-red-500">*</span></label>
              <Input 
                value={form.name} 
                onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} 
                className={!form.name && hasSubmitted ? 'border-red-300' : ''}
                placeholder="학생 이름"
              />
              {!form.name && hasSubmitted && <p className="text-xs text-red-500">이름을 입력해주세요</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">생년월일 <span className="text-red-500">*</span></label>
              <Input 
                type="date"
                inputMode="numeric"
                value={form.birth_date}
                max={new Date().toISOString().slice(0,10)}
                min={"2000-01-01"}
                onChange={(e)=>{
                  const v = (e.target.value || '').slice(0,10)
                  setForm(f=>({...f, birth_date: v}))
                }} 
                className={!form.birth_date && hasSubmitted ? 'border-red-300' : ''}
              />
              {!form.birth_date && hasSubmitted && <p className="text-xs text-red-500">생년월일을 선택해주세요</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">성별</label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={form.gender==='남'?'default':'outline'} size="sm" onClick={()=>setForm(f=>({...f, gender:'남'}))}>남</Button>
                <Button type="button" variant={form.gender==='여'?'default':'outline'} size="sm" onClick={()=>setForm(f=>({...f, gender:'여'}))}>여</Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">전화번호 <span className="text-red-500">*</span></label>
              <Input 
                value={form.phone} 
                onChange={(e)=>setForm(f=>({...f, phone: e.target.value}))} 
                className={!form.phone && hasSubmitted ? 'border-red-300' : ''}
                placeholder="010-1234-5678"
              />
              {!form.phone && hasSubmitted && <p className="text-xs text-red-500">전화번호를 입력해주세요</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">재원 상태</label>
              <select className="w-full p-2 border rounded" value={form.status} onChange={(e)=>setForm(f=>({...f, status: e.target.value as any}))}>
                <option value="재원">재원</option>
                <option value="휴원">휴원</option>
                <option value="퇴원">퇴원</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">신발 사이즈</label>
              <Input placeholder="mm" value={form.shoe_size} onChange={(e)=>setForm(f=>({...f, shoe_size: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">등록반 <span className="text-red-500">*</span></label>
              <select 
                className={`w-full p-2 border rounded ${!form.class_type_id && hasSubmitted ? 'border-red-300' : ''}`} 
                value={form.class_type_id} 
                onChange={(e)=>setForm(f=>({...f, class_type_id: e.target.value}))}
              >
                <option value="">선택</option>
                {classTypes.map(ct => (
                  <option key={ct.id} value={ct.id}>{ct.category} 주 {ct.sessions_per_week}회</option>
                ))}
              </select>
              {!form.class_type_id && hasSubmitted && <p className="text-xs text-red-500">등록반을 선택해주세요</p>}
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
                  <select value={sch.group_no} onChange={(e)=>updateSchedule(idx, 'group_no', parseInt(e.target.value))} className="p-1 text-sm border rounded">
                    {[1,2,3].map(n => (<option key={n} value={n}>{n}반</option>))}
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

          {/* 액션 */}
          <div className="flex items-center justify-end gap-2 p-4 pt-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button 
              onClick={handleSave} 
              disabled={
                !form.name || 
                !form.birth_date || 
                !form.phone || 
                !form.class_type_id ||
                scheduleValidation.hasDuplicate || 
                scheduleValidation.countMismatch
              }
            >
              추가
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
