import React, { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Calendar } from "../ui/calendar"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabase } from "../../lib/supabase"

export default function TrialAddDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean)=>void; onAdded: ()=>void }) {
	const [form, setForm] = useState<{ name: string; gender: '남'|'여'; grade: string; phone: string; trial_date: Date }>({
		name: '', gender: '남', grade: '', phone: '', trial_date: new Date()
	})
	const [time, setTime] = useState<string>('09:00')
	const [submitting, setSubmitting] = useState(false)

	const canSubmit = useMemo(()=>{
		return !!form.name && !!form.grade && !!form.phone && !!form.trial_date && !!time
	}, [form, time])

	async function handleSubmit() {
		if (!canSubmit || submitting) return
		setSubmitting(true)
		try {
			// 1) 날짜, 시간, 그룹 넘버로 class_id 찾기 또는 생성
			const dateStr = format(form.trial_date, 'yyyy-MM-dd')
			let finalClassId: number
			
			// 먼저 기존 클래스 조회
			console.log('클래스 검색 조건:', { date: dateStr, time: time, group_no: 3 })
			
			const { data: existingClass, error: findError } = await supabase
				.from('classes')
				.select('id, date, time, group_no')
				.eq('date', dateStr)
				.eq('time', time)
				.eq('group_no', 3)
				.maybeSingle()
			
			console.log('기존 클래스 조회 결과:', { existingClass, findError })
			
			if (existingClass && existingClass.id) {
				// 기존 클래스가 있으면 해당 ID 사용
				finalClassId = existingClass.id
				console.log('기존 클래스 사용 - ID:', finalClassId, 'Type:', typeof finalClassId)
			} else {
				// 기존 클래스가 없으면 새로 생성
				console.log('새 클래스 생성 시작')
				
				const { data: newClass, error: createError } = await supabase
					.from('classes')
					.insert({
						date: dateStr,
						time: time,
						group_no: 3
					})
					.select('id, date, time, group_no')
					.single()
				
				console.log('클래스 생성 결과:', { newClass, createError })
				
				if (createError || !newClass || !newClass.id) {
					console.error('클래스 생성 실패:', createError)
					throw new Error('클래스 생성에 실패했습니다.')
				}
				
				finalClassId = newClass.id
				console.log('새 클래스 생성 완료 - ID:', finalClassId, 'Type:', typeof finalClassId)
			}
			
			// finalClassId 최종 검증
			console.log('최종 finalClassId:', finalClassId, 'Type:', typeof finalClassId)

			// 2) 체험 예약 등록 (trial_reservations 테이블)
			const reservationData = {
				name: form.name,
				phone: form.phone,
				gender: form.gender,
				grade: form.grade,
				class_id: finalClassId,
				status: '예정' as const,
				note: `체험일: ${dateStr}, 시간: ${time}`
			}
			
			console.log('체험 예약 데이터:', reservationData)
			
			const { data: reservation, error: reservationError } = await supabase
				.from('trial_reservations')
				.insert(reservationData)
				.select()
				.single()
			
			if (reservationError) {
				console.error('체험 예약 등록 실패:', reservationError)
				throw reservationError
			}
			
			console.log('체험 예약 등록 성공:', reservation)
			
			// 3) 저장된 데이터 검증을 위해 다시 조회
			if (reservation?.id) {
				const { data: savedReservation, error: verifyError } = await supabase
					.from('trial_reservations')
					.select('*, classes:classes(id, date, time, group_no)')
					.eq('id', reservation.id)
					.single()
				
				console.log('저장된 예약 데이터 검증:', { savedReservation, verifyError })
			}
			
			onOpenChange(false)
			onAdded()
			setForm({ name: '', gender: '남', grade: '', phone: '', trial_date: new Date() })
			setTime('09:00')
		} catch (e) {
			console.error('체험 예약 등록 실패:', e)
			alert('체험 예약 등록에 실패했습니다.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>체험자 등록</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label className="text-xs text-muted-foreground">이름</label>
						<Input value={form.name} onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} placeholder="이름" />
					</div>
					<div>
						<label className="text-xs text-muted-foreground">성별</label>
						<div className="flex gap-2 mt-1">
							<Button type="button" variant={form.gender==='남'?'default':'outline'} size="sm" onClick={()=>setForm(f=>({...f, gender:'남'}))}>남</Button>
							<Button type="button" variant={form.gender==='여'?'default':'outline'} size="sm" onClick={()=>setForm(f=>({...f, gender:'여'}))}>여</Button>
						</div>
					</div>
					<div>
						<label className="text-xs text-muted-foreground">학년</label>
						<select value={form.grade} onChange={(e)=> setForm(f=>({...f, grade: e.target.value}))} className="w-full p-2 border rounded">
							<option value="">학년 선택</option>
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
					</div>
					<div>
						<label className="text-xs text-muted-foreground">전화번호</label>
						<Input value={form.phone} onChange={(e)=>setForm(f=>({...f, phone: e.target.value}))} placeholder="010-1234-5678" />
					</div>
					<div>
						<label className="text-xs text-muted-foreground">체험 날짜</label>
						<div className="mt-1">
							<Calendar
								mode="single"
								selected={form.trial_date}
								onSelect={(date) => date && setForm(f=>({...f, trial_date: date}))}
								initialFocus
								className="rounded-md border"
							/>
						</div>
					</div>
					<div>
						<label className="text-xs text-muted-foreground">수업 시간</label>
						<select value={time} onChange={(e)=> setTime(e.target.value)} className="w-full p-2 border rounded">
							{Array.from({length:14}, (_,i)=> {
								const h = (i + 9).toString().padStart(2,'0')
								return <option key={i} value={`${h}:00`}>{h}:00</option>
							})}
						</select>
					</div>
				</div>
				<div className="flex justify-end gap-2 mt-4">
					<Button variant="outline" onClick={()=> onOpenChange(false)}>취소</Button>
					<Button onClick={handleSubmit} disabled={!canSubmit || submitting}>등록</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
