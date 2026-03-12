import { Payment, PaymentFormData, supabase } from "./shared"

export async function fetchPayments(studentId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("student_id", studentId)
    .order("payment_date", { ascending: false })

  if (error) {
    console.error("fetchPayments error:", error)
    return []
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    student_id: p.student_id,
    payment_date: p.payment_date,
    target_month: p.target_month,
    amount: p.amount,
    method: p.method,
    discounts: p.discounts || [],
    memo: p.memo || "",
  }))
}

export async function createPayment(
  studentId: string,
  data: PaymentFormData
): Promise<Payment | null> {
  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      student_id: studentId,
      payment_date: data.payment_date,
      target_month: data.target_month,
      amount: parseInt(data.amount) || 0,
      method: data.method,
      discounts: data.discounts,
      memo: data.memo,
    })
    .select()
    .single()

  if (error) {
    console.error("createPayment error:", error)
    return null
  }

  return {
    id: payment.id,
    student_id: payment.student_id,
    payment_date: payment.payment_date,
    target_month: payment.target_month,
    amount: payment.amount,
    method: payment.method,
    discounts: payment.discounts || [],
    memo: payment.memo || "",
  }
}

export async function updatePayment(payment: Payment): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({
      payment_date: payment.payment_date,
      target_month: payment.target_month,
      amount: payment.amount,
      method: payment.method,
      discounts: payment.discounts,
      memo: payment.memo,
    })
    .eq("id", payment.id)

  if (error) console.error("updatePayment error:", error)
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id)
  if (error) console.error("deletePayment error:", error)
}
