'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays, Loader2 } from 'lucide-react'
import { generateMonthlySchedule } from '@/lib/queries'

function getDefaultMonth(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

function getMonthOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = -1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
    options.push({ value, label })
  }
  return options
}

type Result = {
  classesCreated: number
  attendancesCreated: number
  studentsProcessed: number
  errors: string[]
}

export default function ScheduleGenerateSection() {
  const [targetMonth, setTargetMonth] = useState(getDefaultMonth())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await generateMonthlySchedule(targetMonth)
      setResult(res)
    } catch (err) {
      setResult({ classesCreated: 0, attendancesCreated: 0, studentsProcessed: 0, errors: [`오류: ${err}`] })
    } finally {
      setLoading(false)
    }
  }

  const monthOptions = getMonthOptions()
  const selectedLabel = monthOptions.find(o => o.value === targetMonth)?.label ?? targetMonth

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">월별 시간표 생성</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          재원 학생의 수업 스케줄을 기반으로 선택한 달의 수업과 출석 예정 레코드를 생성합니다.
          이미 생성된 레코드는 그대로 유지하고 누락된 것만 추가합니다.
        </p>

        <div className="flex items-center gap-3">
          <Select value={targetMonth} onValueChange={setTargetMonth}>
            <SelectTrigger className="w-40">
              <SelectValue>{selectedLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4 mr-1.5" />
            )}
            시간표 생성
          </Button>
        </div>

        {result && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            {(result.classesCreated > 0 || result.attendancesCreated > 0) ? (
              <p className="text-green-700">
                재원 학생 {result.studentsProcessed}명 처리 완료 —
                수업 {result.classesCreated}개 생성,
                출석 예정 {result.attendancesCreated}건 추가
              </p>
            ) : (
              <p className="text-muted-foreground">
                재원 학생 {result.studentsProcessed}명 처리 완료 — 새로 추가할 레코드 없음
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="text-red-600 space-y-0.5 mt-1">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
