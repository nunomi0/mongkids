import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import MemoEditor from "../MemoEditor"
import { AttendanceItem, Student } from "../../types/student"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { supabase } from "../../lib/supabase"

export default function AttendanceSection({ attendance, attnYearMonth, setAttnYearMonth, student, onReload }: { attendance: AttendanceItem[]; attnYearMonth: string; setAttnYearMonth: (v: string)=>void; student: Student; onReload: () => void }) {
  return (
    <Card className="shrink-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">출석 현황</CardTitle>
          {attendance.length > 0 && (
            <div className="w-40">
              <Select value={attnYearMonth} onValueChange={setAttnYearMonth}>
                <SelectTrigger className="h-8"><SelectValue placeholder="연-월 선택" /></SelectTrigger>
                <SelectContent>
                  {[...new Set(attendance.filter(a=>a.classes?.date).map(a => (a.classes!.date as string).slice(0,7)))].sort().reverse().map(ym => (
                    <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left p-2">날짜</TableHead>
                <TableHead className="text-left p-2">시간</TableHead>
                <TableHead className="text-left p-2">구분</TableHead>
                <TableHead className="text-left p-2">상태</TableHead>
                <TableHead className="text-left p-2">메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance
                .filter(a => a.classes?.date && (a.classes!.date as string).startsWith(attnYearMonth))
                .sort((a,b) => ((a.classes!.date as string)+(a.classes!.time||'' )).localeCompare((b.classes!.date as string)+(b.classes!.time||'')))
                .map((a) => (
                  <TableRow key={a.id} className="border-t">
                    <TableCell className="p-2 whitespace-nowrap">{a.classes?.date ? format(new Date(a.classes.date), 'MM/dd (E)', { locale: ko }) : '-'}</TableCell>
                    <TableCell className="p-2 whitespace-nowrap">{a.classes?.time ? (a.classes.time as string).slice(0,5) : '-'}</TableCell>
                    <TableCell className="p-2 whitespace-nowrap">{a.kind || ((a as any).makeup_of_attendance_id ? '보강' : '정규')}</TableCell>
                    <TableCell className="p-2 whitespace-nowrap">
                      <select
                        className="border rounded px-2 py-1 cursor-pointer hover:bg-accent/30"
                        value={a.status}
                        onChange={async (e)=>{
                          try {
                            await supabase.from('attendance').update({ status: e.target.value }).eq('id', a.id)
                            onReload()
                          } catch (err) { console.error(err) }
                        }}
                      >
                        {['예정','출석','결석'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="text-ellipsis overflow-hidden whitespace-nowrap max-w-[180px]" title={a.note || ''}>
                          {a.note}
                        </div>
                        <MemoEditor
                          hasNote={!!a.note}
                          note={a.note || ''}
                          label={`${student?.name || ''} 메모`}
                          meta={`${a.classes?.date ? format(new Date(a.classes.date), 'yyyy-MM-dd (E)', { locale: ko }) : ''}${a.classes?.time ? ' ' + (a.classes.time as string).slice(0,5) : ''}`}
                          onSave={async (next) => {
                            try { await supabase.from('attendance').update({ note: next }).eq('id', a.id); onReload() } catch (e) { console.error('메모 업데이트 실패:', e) }
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {attendance.filter(a => a.classes?.date && (a.classes!.date as string).startsWith(attnYearMonth)).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-4 text-center text-muted-foreground">기록 없음</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}


