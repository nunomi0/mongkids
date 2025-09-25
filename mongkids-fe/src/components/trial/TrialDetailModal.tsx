import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { supabase } from "../../lib/supabase"
import { GroupType } from "../../types/student"
import { getGradeLabel } from "../../utils/grade"
import MemoEditor from "../MemoEditor"
import { Input } from "../ui/input"
import { Trash2 } from "lucide-react"

type TrialReservation = {
  id: number
  name: string
  phone: string
  status: '예정' | '노쇼' | '미등록' | '등록'
  student_id: number | null
  created_at: string
  class_id: number | null
  note: string | null
  gender: string | null
  grade: string | null
  classes?: {
    id: number
    date: string
    time: string
    group_type: GroupType
  }
}

export default function TrialDetailModal({ 
  isOpen, 
  onClose, 
  reservationId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  reservationId: number | null 
}) {
  const [reservation, setReservation] = useState<TrialReservation | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    gender: '',
    grade: '',
    status: '예정' as '예정' | '노쇼' | '미등록' | '등록',
    note: '',
    trial_date: '',
    trial_time: ''
  })
  const [deleteName, setDeleteName] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && reservationId) {
      loadReservation(reservationId)
    }
  }, [isOpen, reservationId])

  const loadReservation = async (id: number) => {
    try {
      setLoading(true)
      
      // 체험 예약 정보 로드 (클래스 정보 포함)
      const { data: reservationData, error: reservationError } = await supabase
        .from('trial_reservations')
        .select('*, classes:classes(id, date, time, group_type)')
        .eq('id', id)
        .single()
      
      if (reservationError) throw reservationError
      setReservation(reservationData)
      
      // 편집 폼 초기화
      setEditForm({
        name: reservationData.name || '',
        phone: reservationData.phone || '',
        gender: reservationData.gender || '',
        grade: reservationData.grade || '',
        status: reservationData.status || '예정',
        note: reservationData.note || '',
        trial_date: reservationData.classes?.date || '',
        trial_time: reservationData.classes?.time || ''
      })
    } catch (error) {
      console.error('체험 예약 정보 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!reservation) return
    
    try {
      setLoading(true)
      
      // 1) 클래스 정보가 변경되었는지 확인하고 업데이트
      let finalClassId = reservation.class_id
      
      if (editForm.trial_date && editForm.trial_time) {
        // 기존 클래스 정보와 비교
        const isClassChanged = 
          editForm.trial_date !== reservation.classes?.date ||
          editForm.trial_time !== reservation.classes?.time
        
        if (isClassChanged) {
          // 새로운 클래스 찾기 또는 생성
          const { data: existingClass } = await supabase
            .from('classes')
            .select('id')
            .eq('date', editForm.trial_date)
            .eq('time', editForm.trial_time)
            .eq('group_type', '체험')
            .maybeSingle()
          
          if (existingClass?.id) {
            finalClassId = existingClass.id
          } else {
            // 새 클래스 생성
            const { data: newClass, error: createError } = await supabase
              .from('classes')
              .insert({
                date: editForm.trial_date,
                time: editForm.trial_time,
                group_type: '체험'
              })
              .select('id')
              .single()
            
            if (createError || !newClass?.id) {
              throw new Error('클래스 생성에 실패했습니다.')
            }
            
            finalClassId = newClass.id
          }
        }
      }
      
      // 2) 체험 예약 정보 업데이트
      const updateData = {
        name: editForm.name,
        phone: editForm.phone,
        gender: editForm.gender,
        grade: editForm.grade,
        status: editForm.status,
        note: editForm.note,
        class_id: finalClassId
      }
      
      console.log('업데이트할 데이터:', updateData)
      console.log('업데이트 대상 ID:', reservation.id)
      
      const { error } = await supabase
        .from('trial_reservations')
        .update(updateData)
        .eq('id', reservation.id)
      
      console.log('업데이트 결과 에러:', error)
      
      if (error) {
        console.error('Supabase 에러 상세:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      // 데이터 다시 로드
      await loadReservation(reservation.id)
      setIsEditMode(false)
    } catch (error) {
      console.error('체험자 정보 수정 실패:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert(`정보 수정에 실패했습니다: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!reservation) return
    if (deleteName.trim() !== reservation.name) return
    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('trial_reservations')
        .delete()
        .eq('id', reservation.id)
      if (error) throw error
      alert('체험자 예약이 삭제되었습니다.')
      onClose()
    } catch (e) {
      console.error('체험자 삭제 실패:', e)
      alert('삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    if (!reservation) return
    
    // 원래 값으로 되돌리기
    setEditForm({
      name: reservation.name || '',
      phone: reservation.phone || '',
      gender: reservation.gender || '',
      grade: reservation.grade || '',
      status: reservation.status || '예정',
      note: reservation.note || '',
      trial_date: reservation.classes?.date || '',
      trial_time: reservation.classes?.time || ''
    })
    setIsEditMode(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="m">
        <DialogHeader>
          <DialogTitle>체험자 정보</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">로딩 중...</div>
        ) : reservation ? (
          <div className="space-y-4">
            {/* 기본 정보 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(f => ({...f, name: e.target.value}))}
                      className="text-lg font-semibold border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    reservation.name
                  )}
                  {isEditMode ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(f => ({...f, status: e.target.value as '예정' | '노쇼' | '미등록' | '등록'}))}
                      className="px-2 py-1 text-sm border rounded"
                    >
                      <option value="예정">예정</option>
                      <option value="노쇼">노쇼</option>
                      <option value="미등록">미등록</option>
                      <option value="등록">등록</option>
                    </select>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className={
                        reservation.status === '예정' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        reservation.status === '노쇼' ? 'bg-red-50 text-red-700 border-red-200' :
                        reservation.status === '미등록' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        reservation.status === '등록' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }
                    >
                      {reservation.status}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">성별:</span>
                    {isEditMode ? (
                      <div className="ml-2 flex gap-2">
                        <Button
                          type="button"
                          variant={editForm.gender === '남' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditForm(f => ({...f, gender: '남'}))}
                        >
                          남
                        </Button>
                        <Button
                          type="button"
                          variant={editForm.gender === '여' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditForm(f => ({...f, gender: '여'}))}
                        >
                          여
                        </Button>
                      </div>
                    ) : (
                      <span className="ml-2">{reservation.gender || '-'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">학년:</span>
                    {isEditMode ? (
                      <select
                        value={editForm.grade}
                        onChange={(e) => setEditForm(f => ({...f, grade: e.target.value}))}
                        className="ml-2 px-2 py-1 border rounded text-sm"
                      >
                        <option value="">선택</option>
                        <option value="6세">6세</option>
                        <option value="7세">7세</option>
                        <option value="초1">초1</option>
                        <option value="초2">초2</option>
                        <option value="초3">초3</option>
                        <option value="초4">초4</option>
                        <option value="초5">초5</option>
                        <option value="초6">초6</option>
                        <option value="중1">중1</option>
                        <option value="중2">중2</option>
                        <option value="중3">중3</option>
                        <option value="고1">고1</option>
                        <option value="고2">고2</option>
                        <option value="고3">고3</option>
                      </select>
                    ) : (
                      <span className="ml-2">{reservation.grade || '-'}</span>
                    )}
                  </div>
                </div>

                {/* 삭제 섹션 */}
                <div className="mt-2 p-3 rounded border bg-red-50/50">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <Trash2 className="w-4 h-4" /> 체험자 삭제
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">안전 확인을 위해 체험자 이름을 입력하세요.</p>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={reservation.name}
                      value={deleteName}
                      onChange={(e)=> setDeleteName(e.target.value)}
                      className="h-8"
                    />
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-100"
                      disabled={deleteName.trim() !== reservation.name || isDeleting}
                      onClick={handleDelete}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">전화번호:</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(f => ({...f, phone: e.target.value}))}
                      className="ml-2 px-2 py-1 border rounded text-sm"
                      placeholder="010-1234-5678"
                    />
                  ) : (
                    <span className="ml-2">{reservation.phone}</span>
                  )}
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">체험 날짜:</span>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={editForm.trial_date}
                      onChange={(e) => setEditForm(f => ({...f, trial_date: e.target.value}))}
                      className="ml-2 px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    <span className="ml-2">{reservation.classes?.date || '-'}</span>
                  )}
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">체험 시간:</span>
                  {isEditMode ? (
                    <select
                      value={editForm.trial_time}
                      onChange={(e) => setEditForm(f => ({...f, trial_time: e.target.value}))}
                      className="ml-2 px-2 py-1 border rounded text-sm"
                    >
                      <option value="">시간 선택</option>
                      {Array.from({length:14}, (_,i)=> {
                        const h = (i + 9).toString().padStart(2,'0')
                        return <option key={i} value={`${h}:00`}>{h}:00</option>
                      })}
                    </select>
                  ) : (
                    <span className="ml-2">{reservation.classes?.time || '-'}</span>
                  )}
                </div>

                <div className="text-sm flex items-center">
                  <span className="text-muted-foreground">메모: </span>
                  <div className="ml-2 flex items-center gap-2">
                    <span className="flex-1">{reservation.note || '-'}</span>
                    <MemoEditor
                      hasNote={!!reservation.note}
                      note={reservation.note || ''}
                      label={`${reservation.name} 체험자 메모`}
                      meta={`체험일: ${reservation.classes?.date || ''} ${reservation.classes?.time || ''}`}
                      onSave={async (next) => {
                        try {
                          await supabase
                            .from('trial_reservations')
                            .update({ note: next })
                            .eq('id', reservation.id)
                          await loadReservation(reservation.id) // 데이터 다시 로드
                        } catch (e) {
                          console.error('메모 업데이트 실패:', e)
                        }
                      }}
                    />
                  </div>
                </div>

                {reservation.student_id && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">연결된 학생 ID:</span>
                    <span className="ml-2">{reservation.student_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    취소
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditMode(true)}>
                    편집
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">체험자 정보를 찾을 수 없습니다.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

