import StudentsClient from "./students-client"

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { query?: string }
}) {
  const searchQuery = searchParams.query || ""

  const students = [
    { id: 1, name: "김민준", gender: "남", grade: "초3", level: "GREEN", className: "어린이 주 3회", classTime: "월수금 15:00", phone: "010-1234-5678", lastPayment: "2026-01-05", paymentAmount: "150,000원", status: "재원" },
    { id: 2, name: "이서윤", gender: "여", grade: "초4", level: "BLUE", className: "어린이 주 2회", classTime: "화목 16:00", phone: "010-2345-6789", lastPayment: "2026-01-03", paymentAmount: "120,000원", status: "재원" },
    { id: 3, name: "박지호", gender: "남", grade: "초2", level: "YELLOW", className: "어린이 주 2회", classTime: "월수 15:00", phone: "010-3456-7890", lastPayment: "2025-12-28", paymentAmount: "120,000원", status: "재원" },
    { id: 4, name: "최수아", gender: "여", grade: "초5", level: "RED", className: "어린이 주 3회", classTime: "월수금 16:00", phone: "010-4567-8901", lastPayment: "2026-01-10", paymentAmount: "150,000원", status: "재원" },
    { id: 5, name: "정예준", gender: "남", grade: "초1", level: "WHITE", className: "어린이 주 2회", classTime: "화목 15:00", phone: "010-5678-9012", lastPayment: "2026-01-08", paymentAmount: "120,000원", status: "재원" },
    { id: 6, name: "강하늘", gender: "여", grade: "초3", level: "GREEN", className: "어린이 주 3회", classTime: "월수금 17:00", phone: "010-6789-0123", lastPayment: "2026-01-12", paymentAmount: "150,000원", status: "재원" },
    { id: 7, name: "윤서진", gender: "여", grade: "초6", level: "BLACK", className: "어린이 주 2회", classTime: "화목 17:00", phone: "010-7890-1234", lastPayment: "2025-12-20", paymentAmount: "120,000원", status: "휴원" },
    { id: 8, name: "임도윤", gender: "남", grade: "성인", level: "GOLD", className: "성인 주 3회", classTime: "월수금 19:00", phone: "010-8901-2345", lastPayment: "2026-01-15", paymentAmount: "180,000원", status: "재원" },
    { id: 9, name: "한소율", gender: "여", grade: "초4", level: "BLUE", className: "어린이 주 2회", classTime: "월수 16:00", phone: "010-9012-3456", lastPayment: "2025-11-30", paymentAmount: "120,000원", status: "퇴원" },
    { id: 10, name: "송지안", gender: "남", grade: "초3", level: "GREEN", className: "어린이 주 3회", classTime: "월수금 15:00", phone: "010-0123-4567", lastPayment: "2026-01-07", paymentAmount: "150,000원", status: "재원" },
    { id: 11, name: "오하린", gender: "여", grade: "초2", level: "YELLOW", className: "어린이 주 2회", classTime: "화목 15:00", phone: "010-1111-2222", lastPayment: "2026-01-20", paymentAmount: "120,000원", status: "재원" },
    { id: 12, name: "배준서", gender: "남", grade: "초5", level: "RED", className: "어린이 주 3회", classTime: "월수금 16:00", phone: "010-3333-4444", lastPayment: "2025-12-15", paymentAmount: "150,000원", status: "휴원" },
    { id: 13, name: "조은우", gender: "남", grade: "성인", level: "GREEN", className: "성인 주 2회", classTime: "화목 20:00", phone: "010-5555-6666", lastPayment: "2026-01-18", paymentAmount: "140,000원", status: "재원" },
    { id: 14, name: "신유나", gender: "여", grade: "초1", level: "WHITE", className: "체험", classTime: "토 14:00", phone: "010-7777-8888", lastPayment: "", paymentAmount: "", status: "체험" },
    { id: 15, name: "권태현", gender: "남", grade: "초4", level: "BLUE", className: "어린이 주 2회", classTime: "월수 17:00", phone: "010-9999-0000", lastPayment: "2026-01-22", paymentAmount: "120,000원", status: "재원" },
  ]

  return (
    <div className="p-6">
      <StudentsClient students={students} initialQuery={searchQuery} />
    </div>
  )
}
