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
import type { TrialReservation, TrialStatus } from "@/types/student"

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
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

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

  const handleRowClick = useCallback((id: number) => setSelectedId(id), [])
  const handleDetailClose = useCallback(() => setSelectedId(null), [])

  const handleAdd = useCallback((reservation: TrialReservation) => {
    setTrials((prev) => [reservation, ...prev])
  }, [])

  const handleUpdate = useCallback((updated: TrialReservation) => {
    setTrials((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }, [])

  const handleDelete = useCallback((id: number) => {
    setTrials((prev) => prev.filter((t) => t.id !== id))
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
        <TrialsTable trials={filtered} onRowClick={handleRowClick} />
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
      />
    </>
  )
}
