import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import TrialAddDialog from "./TrialAddDialog"
import TrialDetailModal from "./TrialDetailModal"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Plus } from "lucide-react"
import { supabase } from "../../lib/supabase"
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
}

export default function TrialManagement() {
  const [trialReservations, setTrialReservations] = useState<TrialReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  
  // 체험 예약 상세 정보 다이얼로그
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null)

  useEffect(() => {
    loadTrialReservations()
  }, [])

  const loadTrialReservations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('trial_reservations')
        .select('*')
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
        <div className="flex justify-end">
          <Button onClick={()=> setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            체험 예약 등록
          </Button>
          <TrialAddDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdded={loadTrialReservations} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>체험 예약 목록 ({trialReservations.length}건)</CardTitle>
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
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : trialReservations.length > 0 ? (
                    trialReservations.map((reservation) => (
                      <TableRow key={reservation.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openReservationDetail(reservation.id)}>
                        <TableCell className="font-medium">{reservation.name}</TableCell>
                        <TableCell>{reservation.gender || '-'}</TableCell>
                        <TableCell>{reservation.grade || '-'}</TableCell>
                        <TableCell>{reservation.phone}</TableCell>
                        <TableCell>{new Date(reservation.created_at).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        체험 예약이 없습니다.
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
