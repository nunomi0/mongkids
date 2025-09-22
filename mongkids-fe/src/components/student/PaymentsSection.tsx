import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Edit, Trash2 } from "lucide-react"
import { PaymentItem, Student } from "../../types/student"
import { supabase } from "../../lib/supabase"

export default function PaymentsSection({ payments, student, onReload }: { payments: PaymentItem[]; student: Student; onReload: () => void }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null)
  const [editForm, setEditForm] = useState({
    payment_date: '',
    payment_month: '',
    total_amount: '',
    payment_method: 'account',
    shoe_discount: '0',
    sibling_discount: '0',
    additional_discount: '0'
  })

  const openEditModal = (payment: PaymentItem) => {
    setSelectedPayment(payment)
    setEditForm({
      payment_date: payment.payment_date,
      payment_month: payment.payment_month || '',
      total_amount: payment.total_amount.toString(),
      payment_method: payment.payment_method || 'account',
      shoe_discount: (payment.shoe_discount || 0).toString(),
      sibling_discount: (payment.sibling_discount || 0).toString(),
      additional_discount: (payment.additional_discount || 0).toString()
    })
    setIsEditOpen(true)
  }

  const handleSave = async () => {
    if (!selectedPayment) return
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          payment_date: editForm.payment_date,
          payment_month: editForm.payment_month || null,
          total_amount: parseInt(editForm.total_amount),
          payment_method: editForm.payment_method,
          shoe_discount: parseInt(editForm.shoe_discount),
          sibling_discount: parseInt(editForm.sibling_discount),
          additional_discount: parseInt(editForm.additional_discount)
        })
        .eq('id', selectedPayment.id)
      
      if (error) throw error
      
      setIsEditOpen(false)
      setSelectedPayment(null)
      onReload()
    } catch (error) {
      console.error('결제 정보 수정 실패:', error)
      alert('결제 정보 수정에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!selectedPayment) return
    
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', selectedPayment.id)
      
      if (error) throw error
      
      setIsDeleteOpen(false)
      setSelectedPayment(null)
      onReload()
    } catch (error) {
      console.error('결제 정보 삭제 실패:', error)
      alert('결제 정보 삭제에 실패했습니다.')
    }
  }

  return (
    <>
      <Card className="shrink-0">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm">결제 내역</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-1">결제일</TableHead>
                    <TableHead className="text-xs p-1">해당월</TableHead>
                    <TableHead className="text-xs p-1">금액</TableHead>
                    <TableHead className="text-xs p-1">결제수단</TableHead>
                    <TableHead className="text-xs p-1">할인</TableHead>
                    <TableHead className="text-xs p-1 w-16">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    let yearMonth = ''
                    if (payment.payment_month) {
                      const [y, m] = payment.payment_month.split('-')
                      yearMonth = `${y}년 ${parseInt(m)}월`
                    } else {
                      const d = new Date(payment.payment_date)
                      yearMonth = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
                    }
                    const methodText = payment.payment_method === 'account' ? '계좌이체' : payment.payment_method === 'card' ? '카드결제' : payment.payment_method === 'voucher' ? '스포츠바우처' : '미지정'
                    const shoe = payment.shoe_discount || 0
                    const sibling = payment.sibling_discount || 0
                    const add = payment.additional_discount || 0
                    const discountSum = shoe + sibling + add
                    const gross = payment.total_amount + discountSum
                    const keywordBadges: string[] = []
                    if (shoe > 0) keywordBadges.push('신발')
                    if (sibling > 0) keywordBadges.push('형제자매')
                    if (add > 0) keywordBadges.push('추가')
                    return (
                      <TableRow key={payment.id} className="text-xs">
                        <TableCell className="py-1 px-1">{payment.payment_date}</TableCell>
                        <TableCell className="py-1 px-1 font-medium text-blue-600">{yearMonth}</TableCell>
                        <TableCell className="py-1 px-1 font-medium">
                          {payment.total_amount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="py-1 px-1">{methodText}</TableCell>
                        <TableCell className="py-1 px-1">
                          {keywordBadges.length === 0 ? (
                            <div className="text-gray-400">-</div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="text-[11px] text-gray-600">
                                {shoe > 0 && <span>신발 -{shoe.toLocaleString()} </span>}
                                {sibling > 0 && <span>형제자매 -{sibling.toLocaleString()} </span>}
                                {add > 0 && <span>추가 -{add.toLocaleString()}</span>}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => openEditModal(payment)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setIsDeleteOpen(true)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <div className="text-2xl mb-1">📄</div>
              <div className="text-xs">결제 내역이 없습니다.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 편집 모달 */}
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent type="m">
        <DialogHeader>
          <DialogTitle>결제 정보 수정</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div>
            <label className="text-xs text-muted-foreground">결제일 <span className="text-red-500">*</span></label>
            <Input
              type="date"
              value={editForm.payment_date}
              onChange={(e) => setEditForm({...editForm, payment_date: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">해당월</label>
            <Input
              type="month"
              value={editForm.payment_month}
              onChange={(e) => setEditForm({...editForm, payment_month: e.target.value})}
              className="mt-1"
              placeholder="YYYY-MM"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">결제금액 <span className="text-red-500">*</span></label>
            <Input
              type="number"
              value={editForm.total_amount}
              onChange={(e) => setEditForm({...editForm, total_amount: e.target.value})}
              className="mt-1"
              min="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">결제수단</label>
            <select
              value={editForm.payment_method}
              onChange={(e) => setEditForm({...editForm, payment_method: e.target.value})}
              className="w-full p-2 border rounded mt-1"
            >
              <option value="account">계좌이체</option>
              <option value="card">카드결제</option>
              <option value="voucher">스포츠바우처</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">신발할인</label>
            <Input
              type="number"
              value={editForm.shoe_discount}
              onChange={(e) => setEditForm({...editForm, shoe_discount: e.target.value})}
              className="mt-1"
              min="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">형제자매할인</label>
            <Input
              type="number"
              value={editForm.sibling_discount}
              onChange={(e) => setEditForm({...editForm, sibling_discount: e.target.value})}
              className="mt-1"
              min="0"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">추가할인</label>
            <Input
              type="number"
              value={editForm.additional_discount}
              onChange={(e) => setEditForm({...editForm, additional_discount: e.target.value})}
              className="mt-1"
              min="0"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0 border-t">
          <Button variant="outline" onClick={() => setIsEditOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* 삭제 확인 모달 */}
    <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DialogContent type="s">
        <DialogHeader>
          <DialogTitle>결제 정보 삭제</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            정말로 이 결제 정보를 삭제하시겠습니까?
          </p>
          {selectedPayment && (
            <div className="bg-muted/50 p-3 rounded text-sm">
              <div><strong>결제일:</strong> {selectedPayment.payment_date}</div>
              <div><strong>금액:</strong> {selectedPayment.total_amount.toLocaleString()}원</div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0 border-t">
          <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}


