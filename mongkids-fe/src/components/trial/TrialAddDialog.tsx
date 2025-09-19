import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Calendar } from "../ui/calendar"
import { supabase } from "../../lib/supabase"
import { getGradeLabel } from "../../utils/grade"

type Props = {
	isOpen: boolean
	onClose: () => void
	onAdded: () => void
}

export default function TrialAddDialog({ isOpen, onClose, onAdded }: Props) {
	const [form, setForm] = useState({
		name: "",
		phone: "",
		gender: "남" as "남" | "여",
		grade: "6세"
	})
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedTime, setSelectedTime] = useState("09:00")

	const handleSubmit = async () => {
		if (!form.name || !form.phone || !selectedDate) return

		try {
			const dateStr = selectedDate.toISOString().split('T')[0]
			const time = selectedTime + ':00'
			
			console.log('클래스 검색 조건:', { date: dateStr, time: time, group_type: '체험' })
			
			// 해당 날짜, 시간, 체험 그룹의 클래스 찾기
			const { data: existingClass } = await supabase
				.from('classes')
				.select('id')
				.eq('date', dateStr)
				.eq('time', time)
				.eq('group_type', '체험')
				.maybeSingle()

			let classId = existingClass?.id

			if (!classId) {
				// 클래스가 없으면 생성
				const { data: newClass, error: classError } = await supabase
					.from('classes')
					.insert([{
						date: dateStr,
						time: time,
						group_type: '체험'
					}])
					.select('id')
					.single()

				if (classError) throw classError
				classId = newClass?.id
			}

			if (!classId) {
				throw new Error('클래스 ID를 가져올 수 없습니다')
			}

			// 체험 예약 등록
			const { error: trialError } = await supabase
				.from('trial_reservations')
				.insert([{
					name: form.name,
					phone: form.phone,
					gender: form.gender,
					grade: form.grade,
					class_id: classId,
					status: '예정'
				}])

			if (trialError) throw trialError

			alert('체험자가 등록되었습니다!')
			setForm({ name: "", phone: "", gender: "남", grade: "6세" })
			setSelectedDate(undefined)
			setSelectedTime("09:00")
			onAdded()
			onClose()
		} catch (error) {
			console.error('체험자 등록 실패:', error)
			alert('체험자 등록에 실패했습니다.')
		}
	}

	const gradeOptions = [
		"6세", "7세",
		"초1", "초2", "초3", "초4", "초5", "초6",
		"중1", "중2", "중3",
		"고1", "고2", "고3"
	]

	const timeOptions = Array.from({ length: 14 }, (_, i) => {
		const hour = 9 + i
		return `${hour.toString().padStart(2, '0')}:00`
	})

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent type="m">
				<DialogHeader>
					<DialogTitle>체험자 등록</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-2">
				{/* 왼쪽 열: 기본 정보 */}
					<div className="space-y-4">
						<div>
							<label className="text-xs text-muted-foreground">이름 <span className="text-red-500">*</span></label>
							<Input
								value={form.name}
								onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
								placeholder="체험자 이름"
							/>
						</div>
						<div>
							<label className="text-xs text-muted-foreground">전화번호 <span className="text-red-500">*</span></label>
							<Input
								value={form.phone}
								onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
								placeholder="010-1234-5678"
							/>
						</div>
						<div>
							<label className="text-xs text-muted-foreground">성별</label>
							<div className="flex gap-2 mt-1">
								<Button
									type="button"
									variant={form.gender === "남" ? "default" : "outline"}
									size="sm"
									onClick={() => setForm(prev => ({ ...prev, gender: "남" }))}
								>
									남
								</Button>
								<Button
									type="button"
									variant={form.gender === "여" ? "default" : "outline"}
									size="sm"
									onClick={() => setForm(prev => ({ ...prev, gender: "여" }))}
								>
									여
								</Button>
							</div>
						</div>
						<div>
							<label className="text-xs text-muted-foreground">학년</label>
							<select
								value={form.grade}
								onChange={(e) => setForm(prev => ({ ...prev, grade: e.target.value }))}
								className="w-full p-2 border rounded"
							>
								{gradeOptions.map(grade => (
									<option key={grade} value={grade}>{grade}</option>
								))}
							</select>
						</div>
					</div>

					{/* 오른쪽 열: 체험 일정 */}
					<div className="space-y-4">
						<div>
							<label className="text-xs text-muted-foreground">체험 날짜 <span className="text-red-500">*</span></label>
							<div className="mt-1">
								<Calendar
									mode="single"
									selected={selectedDate}
									onSelect={setSelectedDate}
									className="rounded-md border"
								/>
							</div>
						</div>
						<div>
							<label className="text-xs text-muted-foreground">수업 시간 <span className="text-red-500">*</span></label>
							<select
								value={selectedTime}
								onChange={(e) => setSelectedTime(e.target.value)}
								className="w-full p-2 border rounded mt-1"
							>
								{timeOptions.map(time => (
									<option key={time} value={time}>{time}</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* 액션 */}
				<div className="flex items-center justify-end gap-2 p-4 pt-0">
					<Button variant="outline" onClick={onClose}>
						취소
					</Button>
					<Button 
						onClick={handleSubmit}
						disabled={!form.name || !form.phone || !selectedDate}
					>
						등록
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}