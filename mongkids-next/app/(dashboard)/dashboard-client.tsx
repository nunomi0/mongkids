"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users, UserCheck, CalendarDays, CreditCard, UserPlus,
  Trophy, AlertCircle, BarChart3, TrendingUp, UserRoundPlus,
} from "lucide-react"
import LevelBadge from "@/components/level-badge"
import type { LevelValue } from "@/components/level-badge"
import TrialStatusBadge from "@/components/trial-status-badge"
import {
  fetchClassesByDate,
  fetchStudentStatusCounts,
  fetchTodayTrials,
  fetchUnpaidStudents,
  fetchLevelTestCandidates,
  fetchPendingMakeups,
  fetchStudentDistribution,
  fetchRecentChanges,
} from "@/lib/queries"
import type {
  ClassItem,
  AttendanceRecord,
  LevelType,
  TrialReservation,
} from "@/types/student"

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function toYearMonth(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "오늘"
  if (diff === 1) return "어제"
  return `${diff}일 전`
}

type StudentCounts = {
  total: number
  active: number
  paused: number
  withdrawn: number
  trial: number
}

type UnpaidStudent = {
  id: string
  name: string
  phone: string
  className: string
}

type LevelTestCandidate = {
  id: string
  name: string
  grade: string
  currentLevel: LevelType
  currentLevelDate: string
  targetLevel: LevelType
  monthsSince: number
  requiredMonths: number
}

type PendingMakeup = {
  id: string
  name: string
  grade: string
  phone: string
  className: string
  absences: { id: string; date: string; time: string; groupType: string }[]
}

type Distribution = {
  byCategory: { category: string; count: number }[]
  byLevel: { level: string; count: number }[]
}

type RecentChange = {
  type: "registration" | "level_up"
  studentId: string
  studentName: string
  grade: string
  date: string
  level?: LevelType
}

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"]

export default function DashboardClient() {
  const today = new Date()
  const dateStr = toDateStr(today)
  const yearMonth = toYearMonth(today)

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({})
  const [studentCounts, setStudentCounts] = useState<StudentCounts>({
    total: 0, active: 0, paused: 0, withdrawn: 0, trial: 0,
  })
  const [todayTrials, setTodayTrials] = useState<TrialReservation[]>([])
  const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([])
  const [testCandidates, setTestCandidates] = useState<LevelTestCandidate[]>([])
  const [pendingMakeups, setPendingMakeups] = useState<PendingMakeup[]>([])
  const [distribution, setDistribution] = useState<Distribution>({ byCategory: [], byLevel: [] })
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [classData, counts, trials, unpaid, candidates, makeups, dist, changes] =
        await Promise.all([
          fetchClassesByDate(dateStr),
          fetchStudentStatusCounts(),
          fetchTodayTrials(dateStr),
          fetchUnpaidStudents(yearMonth),
          fetchLevelTestCandidates(yearMonth),
          fetchPendingMakeups(),
          fetchStudentDistribution(),
          fetchRecentChanges(),
        ])
      setClasses(classData.classes)
      setAttendanceMap(classData.attendanceMap)
      setStudentCounts(counts)
      setTodayTrials(trials)
      setUnpaidStudents(unpaid)
      setTestCandidates(candidates)
      setPendingMakeups(makeups)
      setDistribution(dist)
      setRecentChanges(changes)
      setLoading(false)
    }
    load()
  }, [dateStr, yearMonth])

  // 출석 통계
  const attendanceStats = (() => {
    let total = 0, present = 0, absent = 0, pending = 0
    for (const cls of classes) {
      for (const student of cls.students) {
        const key = `${dateStr}-${cls.id}-${student.id}`
        const record = attendanceMap[key]
        total++
        if (!record || record.status === "예정" || record.status === "보강예정") pending++
        else if (record.status === "출석" || record.status === "보강완료") present++
        else if (record.status === "결석") absent++
      }
    }
    return { total, present, absent, pending }
  })()

  // 시간대별 그룹핑 (상단 카드용)
  const classesByTime = classes.reduce<Record<string, ClassItem[]>>((acc, cls) => {
    if (!acc[cls.time]) acc[cls.time] = []
    acc[cls.time].push(cls)
    return acc
  }, {})
  const sortedTimes = Object.keys(classesByTime).sort()

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── 상단 요약 카드 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 전체 학생 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 학생</p>
                <p className="text-3xl font-bold">{studentCounts.total}명</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              <span>재원 {studentCounts.active}</span>
              <span>휴원 {studentCounts.paused}</span>
              <span>퇴원 {studentCounts.withdrawn}</span>
              <span>체험 {studentCounts.trial}</span>
            </div>
          </CardContent>
        </Card>

        {/* 오늘 출석 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 출석</p>
                <p className="text-3xl font-bold">
                  {attendanceStats.present}
                  <span className="text-lg font-normal text-muted-foreground">/{attendanceStats.total}</span>
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              <span className="text-green-600">출석 {attendanceStats.present}</span>
              <span className="text-red-600">결석 {attendanceStats.absent}</span>
              <span>예정 {attendanceStats.pending}</span>
            </div>
          </CardContent>
        </Card>

        {/* 오늘 수업 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 수업</p>
                <p className="text-3xl font-bold">{classes.length}개</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <CalendarDays className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {sortedTimes.length > 0
                ? sortedTimes.map((t) => `${t} (${classesByTime[t].length})`).join(" · ")
                : "수업 없음"}
            </div>
          </CardContent>
        </Card>

        {/* 미결제 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{today.getMonth() + 1}월 미결제</p>
                <p className="text-3xl font-bold">
                  {unpaidStudents.length}
                  <span className="text-lg font-normal text-muted-foreground">명</span>
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              재원 학생 중 미결제
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 하단 상세 영역 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 왼쪽 2칸 */}
        <div className="lg:col-span-2 space-y-6">

          {/* 레벨 테스트 대상자 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                레벨 테스트 대상자
                {testCandidates.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{testCandidates.length}명</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">현재 테스트 대상자가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">이름</th>
                        <th className="pb-2 font-medium">학년</th>
                        <th className="pb-2 font-medium">현재</th>
                        <th className="pb-2 font-medium text-center">다음</th>
                        <th className="pb-2 font-medium text-right">경과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testCandidates.map((c) => (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="py-2.5 font-medium">{c.name}</td>
                          <td className="py-2.5 text-muted-foreground">{c.grade}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-1.5">
                              <LevelBadge level={c.currentLevel as LevelValue} size={12} />
                              <span>{c.currentLevel}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <LevelBadge level={c.targetLevel as LevelValue} size={12} />
                              <span>{c.targetLevel}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={c.monthsSince > c.requiredMonths ? "text-amber-600 font-medium" : ""}>
                              {c.monthsSince}개월
                            </span>
                            <span className="text-muted-foreground">/{c.requiredMonths}개월</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 미처리 보강 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                미처리 보강
                {pendingMakeups.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">{pendingMakeups.length}명</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingMakeups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">미처리 보강이 없습니다.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {pendingMakeups.map((student) => (
                    <div key={student.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{student.name}</span>
                          <span className="text-xs text-muted-foreground">{student.grade}</span>
                          <span className="text-xs text-muted-foreground">{student.className}</span>
                        </div>
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          {student.absences.length}건
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {student.absences.map((a) => (
                          <span key={a.id} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                            {a.date.slice(5)} {a.time}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 1칸 */}
        <div className="space-y-6">

          {/* 오늘 체험 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                오늘의 체험
                {todayTrials.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{todayTrials.length}건</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayTrials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">오늘 체험 예약이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {todayTrials.map((trial) => (
                    <div key={trial.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{trial.name}</span>
                          <span className="text-xs text-muted-foreground">{trial.grade}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{trial.trial_time}</span>
                      </div>
                      <TrialStatusBadge status={trial.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 미결제 학생 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {today.getMonth() + 1}월 미결제
                {unpaidStudents.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{unpaidStudents.length}명</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unpaidStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">모든 학생이 결제 완료했습니다.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unpaidStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-sm border rounded-lg p-2.5">
                      <div>
                        <span className="font-medium">{student.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{student.className}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{student.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 학생 분포 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                학생 분포
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 카테고리별 */}
              {distribution.byCategory.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">등록반</p>
                  <div className="flex flex-wrap gap-2">
                    {distribution.byCategory.map((c) => (
                      <div key={c.category} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1.5">
                        <span className="text-sm">{c.category}</span>
                        <span className="text-sm font-semibold">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 레벨별 */}
              {distribution.byLevel.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">레벨</p>
                  <div className="flex flex-wrap gap-2">
                    {distribution.byLevel.map((l) => (
                      <div key={l.level} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1.5">
                        <LevelBadge level={l.level as LevelValue} size={10} />
                        <span className="text-xs">{l.level}</span>
                        <span className="text-sm font-semibold">{l.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {distribution.byCategory.length === 0 && distribution.byLevel.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">재원 학생이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 최근 변동 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                최근 변동
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">최근 변동 내역이 없습니다.</p>
              ) : (
                <div className="space-y-2.5">
                  {recentChanges.map((change, i) => (
                    <div key={`${change.studentId}-${change.type}-${i}`} className="flex items-start gap-2.5">
                      <div className={`mt-0.5 p-1 rounded-full ${
                        change.type === "registration" ? "bg-blue-50" : "bg-green-50"
                      }`}>
                        {change.type === "registration" ? (
                          <UserRoundPlus className="h-3 w-3 text-blue-600" />
                        ) : (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium">{change.studentName}</span>
                          <span className="text-xs text-muted-foreground">({change.grade})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {change.type === "registration" ? (
                            <span>신규 등록</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <LevelBadge level={change.level as LevelValue} size={8} />
                              {change.level} 획득
                            </span>
                          )}
                          <span>· {daysAgo(change.date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
