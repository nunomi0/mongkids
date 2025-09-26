import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import TrialAddDialog from "./TrialAddDialog"
import TrialDetailModal from "./TrialDetailModal"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Search, Plus } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { isKoreanMatch } from "../../utils/korean"
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
    group_type: string
  }
}

export default function TrialManagement() {
  const [trialReservations, setTrialReservations] = useState<TrialReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [statusFilter, setStatusFilter] = useState<Record<'전체'|'예정'|'노쇼'|'미등록'|'등록', boolean>>({ 전체: true, 예정: true, 노쇼: true, 미등록: true, 등록: true })
  
  // 체험 예약 상세 정보 다이얼로그
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null)

  useEffect(() => {
    loadTrialReservations()
  }, [month])

  const loadTrialReservations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('trial_reservations')
        .select('*, classes:classes(id, date, time)')
        .order('created_at', { ascending: false })
      if (error) throw error
      const reservationsData = (data as TrialReservation[]) || []
      setTrialReservations(reservationsData)
    } catch (error) {
      console.error('체험 예약 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }


  // 검색 필터링된 체험 예약 목록
  const filteredTrialReservations = useMemo(() => {
    const [y, m] = month.split('-').map(n=>parseInt(n,10))
    const monthStart = new Date(y, m-1, 1)
    const monthEnd = new Date(y, m, 0)
    const inMonth = (r: TrialReservation) => {
      const base = r.classes?.date ? new Date(r.classes.date) : new Date(r.created_at)
      return base >= monthStart && base <= monthEnd
    }
    const byMonth = trialReservations.filter(inMonth)
    const byStatus = byMonth.filter(r => statusFilter.전체 || statusFilter[r.status])
    if (!searchTerm.trim()) return byStatus
    return byStatus.filter(reservation => {
      const nameMatch = isKoreanMatch(reservation.name, searchTerm)
      const phoneMatch = reservation.phone.includes(searchTerm)
      const gradeMatch = reservation.grade ? isKoreanMatch(reservation.grade, searchTerm) : false
      return nameMatch || phoneMatch || gradeMatch
    })
  }, [trialReservations, searchTerm, month, statusFilter])

  const stats = useMemo(() => {
    const base = filteredTrialReservations
    const total = base.length
    const 예정 = base.filter(r => r.status === '예정').length
    const 노쇼 = base.filter(r => r.status === '노쇼').length
    const 미등록 = base.filter(r => r.status === '미등록').length
    const 등록 = base.filter(r => r.status === '등록').length
    return { total, 예정, 노쇼, 미등록, 등록 }
  }, [filteredTrialReservations])

  // 체험 예약 상세 정보 열기
  const openReservationDetail = (reservationId: number) => {
    setSelectedReservationId(reservationId)
    setIsDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>체험 관리</h1>
        <p className="text-muted-foreground">체험 수업 신청자들을 관리합니다.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/* 검색 */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름, 전화번호, 학년으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              className="border rounded px-2 py-1 text-sm"
              value={month}
              onChange={(e)=> setMonth(e.target.value)}
            />
            <Button onClick={()=> setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              체험 예약 등록
            </Button>
            <TrialAddDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdded={loadTrialReservations} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>체험 예약 목록 ({filteredTrialReservations.length}건)</span>
              <span className="text-xs text-muted-foreground">
                통계: 전체 {stats.total} / 예정 {stats.예정} · 노쇼 {stats.노쇼} · 미등록 {stats.미등록} · 등록 {stats.등록}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>성별</TableHead>
                    <TableHead>학년</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>예약일</TableHead>
                    <TableHead>수업 시간</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : filteredTrialReservations.length > 0 ? (
                    filteredTrialReservations.map((reservation) => (
                      <TableRow key={reservation.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openReservationDetail(reservation.id)}>
                        <TableCell className="font-medium">{reservation.name}</TableCell>
                        <TableCell>{reservation.gender || '-'}</TableCell>
                        <TableCell>{reservation.grade || '-'}</TableCell>
                        <TableCell>{reservation.phone}</TableCell>
                        <TableCell>{reservation.classes?.date || '-'}</TableCell>
                        <TableCell>{reservation.classes?.time ? reservation.classes.time.slice(0,5) : '-'}</TableCell>
                        <TableCell>
                          <Badge type="trialstatus">
                            {reservation.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {searchTerm ? '검색 결과가 없습니다.' : '체험 예약이 없습니다.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 체험자 상세 정보 모달 */}
      <TrialDetailModal
        reservationId={selectedReservationId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedReservationId(null)
        }}
      />
    </div>
  )
}
