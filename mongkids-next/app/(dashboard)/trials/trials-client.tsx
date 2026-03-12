"use client"

import { useState, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Users, Check, X, Clock, Ban } from "lucide-react"
import TrialsTable from "./trials-table"
import AddTrialModal from "./add-trial-modal"
import TrialDetailModal from "./trial-detail-modal"
import AddStudentModal from "../students/add-student-modal"
import {
  createTrial,
  updateTrial as updateTrialApi,
  deleteTrial as deleteTrialApi,
  createStudent as createStudentApi,
} from "@/lib/queries"
import type { TrialReservation, TrialStatus, StudentFormData, StudentSchedule, CategoryType } from "@/types/student"

type StatusFilterValue = TrialStatus | "all"

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "예정", label: "예정" },
  { value: "노쇼", label: "노쇼" },
  { value: "미등록", label: "미등록" },
  { value: "등록", label: "등록" },
]

export default function TrialsClient({
  trials: initialTrials,
}: {
  trials: TrialReservation[]
}) {
  const [trials, setTrials] = useState(initialTrials)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isStudentAddOpen, setIsStudentAddOpen] = useState(false)
  const [studentDraft, setStudentDraft] = useState<Partial<StudentFormData> | null>(null)

  const getCategoryFromGrade = useCallback((grade: string): CategoryType => {
    if (!grade) return "어린이"
    if (grade.includes("중") || grade.includes("고")) return "청소년"
    if (grade.includes("세") || grade.includes("초")) return "어린이"
    return "성인"
  }, [])

  // 필터링
  const filtered = useMemo(() => {
    return trials.filter((t) => {
      const matchesQuery =
        !query.trim() ||
        t.name.includes(query) ||
        t.phone.includes(query) ||
        t.grade.includes(query)
      const matchesStatus = statusFilter === "all" || t.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [trials, query, statusFilter])

  // 통계
  const stats = useMemo(() => {
    return {
      total: trials.length,
      예정: trials.filter((t) => t.status === "예정").length,
      노쇼: trials.filter((t) => t.status === "노쇼").length,
      미등록: trials.filter((t) => t.status === "미등록").length,
      등록: trials.filter((t) => t.status === "등록").length,
    }
  }, [trials])

  const selectedReservation = useMemo(() => {
    if (selectedId === null) return null
    return trials.find((t) => t.id === selectedId) ?? null
  }, [trials, selectedId])

  const handleRowClick = useCallback((id: string) => setSelectedId(id), [])
  const handleDetailClose = useCallback(() => setSelectedId(null), [])

  const handleAdd = useCallback(async (data: { name: string; phone: string; gender: string; grade: string }) => {
    const created = await createTrial(data)
    if (created) {
      setTrials((prev) => [created, ...prev])
    }
  }, [])

  const handleUpdate = useCallback(async (updated: TrialReservation) => {
    setTrials((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    await updateTrialApi(updated)
  }, [])

  const handleRegistered = useCallback((registeredTrial: TrialReservation) => {
    setStudentDraft({
      name: registeredTrial.name,
      phone: registeredTrial.phone,
      gender: registeredTrial.gender || "남",
      category: getCategoryFromGrade(registeredTrial.grade),
      status: "재원",
    })
    setIsStudentAddOpen(true)
  }, [getCategoryFromGrade])

  const handleDelete = useCallback(async (id: string) => {
    setTrials((prev) => prev.filter((t) => t.id !== id))
    await deleteTrialApi(id)
  }, [])

  const handleNoteChange = useCallback(async (id: string, note: string) => {
    setTrials((prev) => prev.map((t) => (t.id === id ? { ...t, note } : t)))
    const trial = trials.find((t) => t.id === id)
    if (trial) {
      await updateTrialApi({ ...trial, note })
    }
  }, [trials])

  const handleStudentSaved = useCallback(async (formData: StudentFormData, schedules: StudentSchedule[]) => {
    await createStudentApi(formData, schedules)
    setIsStudentAddOpen(false)
    setStudentDraft(null)
  }, [])

  const handleStudentModalClose = useCallback(() => {
    setIsStudentAddOpen(false)
    setStudentDraft(null)
  }, [])

  return (
    <>
      <div className="w-full space-y-4">
        {/* 통계 */}
        <Card className="border-dashed">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>전체 <strong className="text-foreground">{stats.total}</strong>건</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-blue-600">
                  <Clock className="h-3 w-3" />{stats.예정}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <Ban className="h-3 w-3" />{stats.노쇼}
                </span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <X className="h-3 w-3" />{stats.미등록}
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-3 w-3" />{stats.등록}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 필터 */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="이름 / 전화번호 / 학년 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            체험 예약 등록
          </Button>
        </div>

        {/* 테이블 */}
        <TrialsTable trials={filtered} onRowClick={handleRowClick} onNoteChange={handleNoteChange} />
      </div>

      {/* 체험 추가 모달 */}
      <AddTrialModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaved={handleAdd}
      />

      {/* 체험 상세 모달 */}
      <TrialDetailModal
        isOpen={selectedId !== null}
        onClose={handleDetailClose}
        reservation={selectedReservation}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRegistered={handleRegistered}
      />

      <AddStudentModal
        isOpen={isStudentAddOpen}
        onClose={handleStudentModalClose}
        onSaved={handleStudentSaved}
        initialData={studentDraft ?? undefined}
      />
    </>
  )
}
