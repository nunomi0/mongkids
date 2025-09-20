import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabase } from "../../lib/supabase"
import { GroupType } from "../../types/student"
import LevelBadge from "../LevelBadge"
import { getGradeLabel } from "../../utils/grade"
import { getLevelColor } from "../../utils/level"
import MemoEditor from "../MemoEditor"
import { getDisplayStyle, canToggleStatus } from "../../utils/attendanceStatus"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { Plus, MoreHorizontal, Trash2 } from "lucide-react"
import TrialDetailModal from "../trial/TrialDetailModal"
import { filterByKoreanSearch } from "../../utils/korean"

interface Student {
  id: number
  name: string
  grade: string
  level: string
}

interface TrialReservation {
  id: number
  name: string
  grade: string
}

interface DailyClassCardProps {
  classItem: {
    class_id: number
    time: string
    group_type: GroupType
    students: Student[]
  }
  selectedDate: Date
  getStatusOnDate: (studentId: number, date: Date) => string
  getAttendanceDatesForCellByStatus: (studentId: number, baseDate: Date, index: number) => {
    present: string[]
    absent: string[]
    makeup: string[]
    makeup_done: string[]
  }
  toggleAttendanceForSelectedDate: (studentId: number, classId?: number) => void
  openStudentDetail: (studentId: number) => void
  toDateObjectsFromMonthDay: (baseDate: Date, monthDayList: string[]) => Date[]
  onClassUpdated?: () => void
  borderless?: boolean
  getDisplayStatus?: (studentId: number) => 'REGULAR_PLANNED'|'REGULAR_PRESENT'|'REGULAR_ABSENT'|'REGULAR_MAKEUP_PLANNED'|'REGULAR_MAKEUP_PRESENT'|'REGULAR_MAKEUP_ABSENT'|'MAKEUP_PLANNED'|'MAKEUP_PRESENT'|'MAKEUP_ABSENT'|'NONE'
  getDisplayStatusForCell?: (studentId: number, idx: number) => 'REGULAR_PLANNED'|'REGULAR_PRESENT'|'REGULAR_ABSENT'|'REGULAR_MAKEUP_PLANNED'|'REGULAR_MAKEUP_PRESENT'|'REGULAR_MAKEUP_ABSENT'|'MAKEUP_PLANNED'|'MAKEUP_PRESENT'|'MAKEUP_ABSENT'|'NONE'
  getAttendanceRecord?: (studentId: number) => { id: number; note?: string | null } | undefined
  updateAttendanceNote?: (attendanceId: number, note: string | null) => Promise<void>
}

export default function DailyClassCard({
  classItem,
  selectedDate,
  getStatusOnDate,
  getAttendanceDatesForCellByStatus,
  toggleAttendanceForSelectedDate,
  openStudentDetail,
  toDateObjectsFromMonthDay,
  onClassUpdated,
  borderless,
  getDisplayStatus,
  getDisplayStatusForCell,
  getAttendanceRecord,
  updateAttendanceNote
}: DailyClassCardProps) {
  const toHm = (t?: string) => (t && t.length >= 5 ? t.slice(0,5) : t || "")
  const [enriched, setEnriched] = useState<Student[] | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [allStudents, setAllStudents] = useState<{
    id: number
    name: string
    gender: string
    birth_date: string
    current_level: string | null
    class_type?: { category: string | null; sessions_per_week: number | null } | null
    schedules: { weekday: number; time: string; group_type: GroupType }[]
  }[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [pendingAddStudentId, setPendingAddStudentId] = useState<number | null>(null)
  const [regularConfirmOpen, setRegularConfirmOpen] = useState(false)
  const [regularPending, setRegularPending] = useState<{ id: number; name: string } | null>(null)
  const [sourceAttendances, setSourceAttendances] = useState<Array<{ id: number; status: '예정'|'출석'|'결석'; date: string; time: string; group_type: GroupType }>>([])
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [linkMonth, setLinkMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [monthOptions, setMonthOptions] = useState<Array<{ value: string; label: string }>>([])
  const [makeupNote, setMakeupNote] = useState<string>("")
  const [pendingAddStudentName, setPendingAddStudentName] = useState<string>("")
  const [memoOpen, setMemoOpen] = useState(false)
  const [memoStudentId, setMemoStudentId] = useState<number | null>(null)
  const [memoDraft, setMemoDraft] = useState<string>("")
  const [trialReservations, setTrialReservations] = useState<TrialReservation[]>([])
  const [isTrialDetailOpen, setIsTrialDetailOpen] = useState(false)
  const [selectedTrialId, setSelectedTrialId] = useState<number | null>(null)

  // 한국어 검색으로 필터링된 결과
  const searchResults = useMemo(() => {
    if (!studentSearch.trim()) return []
    return filterByKoreanSearch(allStudents, studentSearch, (student: any) => student.name)
  }, [allStudents, studentSearch])

  const studentsToRender = classItem.students
  
  const loadTrialReservations = async () => {
    if (classItem.group_type !== '체험') return

    try {
      const { data, error } = await supabase
        .from('trial_reservations')
        .select('id, name, grade')
        .eq('class_id', classItem.class_id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTrialReservations(data || [])
    } catch (error) {
      console.error('체험 예약 로드 실패:', error)
    }
  }

  useEffect(() => {
    loadTrialReservations()
  }, [classItem.class_id, classItem.group_type])

  return (
    <>
      <Card className={borderless ? 'border-none shadow-none' : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span>{format(selectedDate, 'MM/dd', { locale: ko })}</span>
              <span>{format(selectedDate, '(E)', { locale: ko })}</span>
              <span>{toHm(classItem.time)}</span>
              <Badge type="color" className={
                classItem.group_type === '일반1' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                classItem.group_type === '일반2' ? 'bg-green-50 text-green-700 border-green-200' :
                classItem.group_type === '스페셜' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                classItem.group_type === '체험' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-gray-50 text-gray-700 border-gray-200'
              }>
                {classItem.group_type}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {classItem.group_type === '체험' ? (
              trialReservations.map((trial) => (
                <div key={trial.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-3">
                    <span 
                      role="button"
                      tabIndex={0}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={() => {
                        setSelectedTrialId(trial.id)
                        setIsTrialDetailOpen(true)
                      }}
                    >
                      {trial.name}
                    </span>
                    <Badge type="grade">{trial.grade}</Badge>
                    <Badge type="studenttype">체험</Badge>
                  </div>
                </div>
              ))
            ) : (
              studentsToRender.map((student) => (
                <React.Fragment key={student.id}>
                  <div 
                    className="flex items-center justify-between p-2 rounded border transition-colors"
                    onClick={() => {
                      const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                      const kind = (rec?.kind || '정규') as '정규'|'보강'
                      const status = (rec?.status || '예정') as '예정'|'출석'|'결석'
                      const hasLinked = kind === '정규' && !!rec?.makeup_of_attendance_id
                      if (!canToggleStatus(kind, hasLinked)) return
                      toggleAttendanceForSelectedDate(student.id, classItem.class_id)
                    }}
                    style={(() => {
                      const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                      const kind = (rec?.kind || '정규') as '정규'|'보강'
                      const status = (rec?.status || '예정') as '예정'|'출석'|'결석'
                      const hasLinked = kind === '정규' && !!rec?.makeup_of_attendance_id
                      const { bg, border } = getDisplayStyle(kind, status, hasLinked)
                      return { backgroundColor: bg, borderColor: border, cursor: canToggleStatus(kind, hasLinked) ? 'pointer' : 'default' }
                    })()}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        role="button"
                        tabIndex={0}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); openStudentDetail(student.id) }}
                      >
                        {student.name}
                      </span>
                      <Badge type="grade">{student.grade}</Badge>
                      <LevelBadge level={student.level as any} />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 보강 수업 연결 정보 */}
                      {(() => {
                        const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                        if (rec?.kind === '보강' && rec?.makeup_of_attendance_id) {
                          return (
                            <span className="text-xs text-muted-foreground">
                              {format(selectedDate, 'MM/dd', { locale: ko })} {toHm(classItem.time)} 수업 보강
                            </span>
                          )
                        }
                        return null
                      })()}

                      {/* 수업 구분 뱃지 */}
                      {(() => {
                        const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                        const kind = rec?.kind || '정규'
                        return (
                          <Badge 
                            variant="outline"
                            className={
                              kind === '보강' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }
                          >
                            {kind}
                          </Badge>
                        )
                      })()}
                      
                      {/* 출석 상태 뱃지 */}
                      {(() => {
                        const rec = getAttendanceRecord ? (getAttendanceRecord(student.id) as any) : undefined
                        const status = rec?.status || '예정'
                        return (
                          <Badge 
                            variant="outline"
                            className={
                              status === '출석' ? 'bg-green-50 text-green-700 border-green-200' :
                              status === '결석' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }
                          >
                            {status}
                          </Badge>
                        )
                      })()}

                      {/* 메모 아이콘 */}
                      {(() => {
                        const meta = `${format(selectedDate, 'yyyy-MM-dd (E)', { locale: ko })} ${toHm(classItem.time)} - ${student.name} 메모`
                        const rec = getAttendanceRecord ? getAttendanceRecord(student.id) : undefined
                        const note = rec?.note || ''
                        const hasNote = !!note
                        return (
                          <MemoEditor
                            studentId={student.id}
                            classId={classItem.class_id}
                            hasNote={hasNote}
                            note={note}
                            meta={meta}
                          />
                        )
                      })()}

                    </div>
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 체험자 상세 모달 */}
      <TrialDetailModal
        isOpen={isTrialDetailOpen}
        onClose={() => {
          setIsTrialDetailOpen(false)
          setSelectedTrialId(null)
          loadTrialReservations()
        }}
        reservationId={selectedTrialId}
      />
    </>
  )
}
