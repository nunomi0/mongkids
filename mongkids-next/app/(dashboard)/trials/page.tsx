import TrialsClient from "./trials-client"
import type { TrialReservation } from "@/types/student"

export default function TrialsPage() {
  const trials: TrialReservation[] = [
    { id: 1, name: "신유나", phone: "010-7777-8888", gender: "여", grade: "초1", status: "예정", trial_date: "2026-02-15", trial_time: "15:00", note: "", created_at: "2026-02-10" },
    { id: 2, name: "김태호", phone: "010-1122-3344", gender: "남", grade: "초3", status: "예정", trial_date: "2026-02-16", trial_time: "16:00", note: "형제 할인 문의", created_at: "2026-02-09" },
    { id: 3, name: "이하은", phone: "010-5566-7788", gender: "여", grade: "초2", status: "등록", trial_date: "2026-02-08", trial_time: "15:00", note: "", created_at: "2026-02-05" },
    { id: 4, name: "박서준", phone: "010-9900-1122", gender: "남", grade: "7세", status: "노쇼", trial_date: "2026-02-07", trial_time: "16:00", note: "연락 안됨", created_at: "2026-02-04" },
    { id: 5, name: "최예린", phone: "010-3344-5566", gender: "여", grade: "초4", status: "미등록", trial_date: "2026-02-06", trial_time: "17:00", note: "다음 주 재방문 예정", created_at: "2026-02-03" },
    { id: 6, name: "정우진", phone: "010-7788-9900", gender: "남", grade: "초5", status: "등록", trial_date: "2026-02-05", trial_time: "15:00", note: "", created_at: "2026-02-02" },
    { id: 7, name: "강지유", phone: "010-2233-4455", gender: "여", grade: "6세", status: "예정", trial_date: "2026-02-18", trial_time: "15:00", note: "부모님 동행", created_at: "2026-02-11" },
    { id: 8, name: "윤도현", phone: "010-6677-8899", gender: "남", grade: "초1", status: "미등록", trial_date: "2026-02-04", trial_time: "16:00", note: "가격 문의 중", created_at: "2026-02-01" },
  ]

  return (
    <div className="p-6">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold">체험 관리</h1>
        <p className="text-sm text-muted-foreground">체험 수업 신청자들을 관리합니다.</p>
      </div>
      <TrialsClient trials={trials} />
    </div>
  )
}
