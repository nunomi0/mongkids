import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"

export default function AddPaymentDialog({ open, onOpenChange, newPayment, setNewPayment, onSubmit }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  newPayment: { payment_date: string; payment_month: string; total_amount: string; payment_method: string; shoe_discount: string; sibling_discount: string; additional_discount: string }
  setNewPayment: React.Dispatch<React.SetStateAction<any>>
  onSubmit: () => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="s">
        <DialogHeader>
          <DialogTitle>결제 추가</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">결제일</label>
            <Input type="date" value={newPayment.payment_date} onChange={(e)=>setNewPayment((p:any)=>({...p, payment_date: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">해당월</label>
            <Input type="month" value={newPayment.payment_month} onChange={(e)=>setNewPayment((p:any)=>({...p, payment_month: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">정가</label>
            <Input type="number" value={newPayment.total_amount} onChange={(e)=>setNewPayment((p:any)=>({...p, total_amount: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">결제수단</label>
            <select className="w-full p-2 border rounded" value={newPayment.payment_method} onChange={(e)=>setNewPayment((p:any)=>({...p, payment_method: e.target.value}))}>
              <option value="account">계좌이체</option>
              <option value="card">카드결제</option>
              <option value="voucher">스포츠바우처</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">신발 할인</label>
            <div className="flex gap-2 mt-1">
              <Button type="button" variant={newPayment.shoe_discount==='0'?'default':'outline'} size="sm" onClick={()=>setNewPayment((p:any)=>({...p, shoe_discount: '0'}))}>0</Button>
              <Button type="button" variant={newPayment.shoe_discount==='10000'?'default':'outline'} size="sm" onClick={()=>setNewPayment((p:any)=>({...p, shoe_discount: '10000'}))}>10,000</Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">형제자매 할인</label>
            <div className="flex gap-2 mt-1">
              <Button type="button" variant={newPayment.sibling_discount==='0'?'default':'outline'} size="sm" onClick={()=>setNewPayment((p:any)=>({...p, sibling_discount: '0'}))}>0</Button>
              <Button type="button" variant={newPayment.sibling_discount==='10000'?'default':'outline'} size="sm" onClick={()=>setNewPayment((p:any)=>({...p, sibling_discount: '10000'}))}>10,000</Button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">추가 할인</label>
            <Input type="number" value={newPayment.additional_discount} onChange={(e)=>setNewPayment((p:any)=>({...p, additional_discount: e.target.value}))} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={()=>onOpenChange(false)}>취소</Button>
          <Button onClick={onSubmit}>추가</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


