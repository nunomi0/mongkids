import ExcelJS from 'exceljs'
import type { LevelType } from '@/types/student'

// ============================================================
// 타입
// ============================================================

export type ExportStudent = {
  name: string
  gender: string
  birth_date: string
  shoe_size: string
  current_level: LevelType | null
  phone: string
  category: string
  sessions_per_week: number
  memo: string
  schedules: { weekday: number; time: string }[]
  last_payment?: {
    payment_date: string
    target_month: string
    amount: number
    discounts: { type: string; amount: number }[]
  }
}

// ============================================================
// 등급 한글 매핑
// ============================================================

const LEVEL_KO: Record<string, string> = {
  WHITE: '화이트',
  YELLOW: '옐로우',
  GREEN: '그린',
  BLUE: '블루',
  RED: '레드',
  BLACK: '블랙',
  GOLD: '골드',
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

function scheduleToString(weekday: number, time: string): string {
  const day = WEEKDAY_KO[weekday] || ''
  const hour = time.split(':')[0]
  return `${day}${parseInt(hour)}`
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function categoryToKo(category: string): string {
  if (category === '어린이') return '키즈'
  return category
}

// ============================================================
// 엑셀 생성
// ============================================================

export async function generateMemberExcel(students: ExportStudent[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()

  const worksheet = workbook.addWorksheet('등록회원명단')

  // 헤더 스타일
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 10 }
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  }

  // 빈 행 3줄 (원본 형식 맞추기)
  worksheet.addRow([])
  worksheet.addRow([])
  worksheet.addRow([])

  // 타이틀
  worksheet.addRow(['', '등록회원명단'])
  worksheet.getRow(4).font = { bold: true, size: 14 }

  // 헤더 (row 5)
  const headers = [
    '연번', '성명', '성별', '생년월일', '소속', '학년',
    '암벽화', '등급', '연락처', '결제일', '등록반',
    '수업시간1', '수업시간2', '등록한 수업', '등록개월 금액',
    '등록개월 수', '암벽화대여비 제외', '암벽화제외 횟수',
    '총 등록금액', '제외금액', '참고',
  ]
  const headerRow = worksheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = headerFont
    cell.border = thinBorder
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // 데이터 행
  students.forEach((s, index) => {
    const sched1 = s.schedules[0] ? scheduleToString(s.schedules[0].weekday, s.schedules[0].time) : ''
    const sched2 = s.schedules[1] ? scheduleToString(s.schedules[1].weekday, s.schedules[1].time) : ''

    const sessionsText = `주${s.sessions_per_week}회`
    const age = calculateAge(s.birth_date)

    const row = worksheet.addRow([
      index + 1,
      s.name,
      s.gender,
      s.birth_date,
      '', // 소속
      `${age}세`,
      s.shoe_size,
      s.current_level ? LEVEL_KO[s.current_level] || s.current_level : '',
      s.phone,
      s.last_payment?.payment_date || '',
      sessionsText,
      sched1,
      sched2,
      categoryToKo(s.category),
      s.last_payment?.amount || '',
      '', // 등록개월 수
      '', // 암벽화대여비 제외
      '', // 암벽화제외 횟수
      '', // 총 등록금액
      s.last_payment?.discounts?.reduce((sum, d) => sum + d.amount, 0) || '',
      s.memo,
    ])

    row.eachCell((cell) => {
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle' }
    })
  })

  // 열 너비 설정
  worksheet.columns = [
    { width: 5 },   // 연번
    { width: 10 },  // 성명
    { width: 5 },   // 성별
    { width: 12 },  // 생년월일
    { width: 8 },   // 소속
    { width: 6 },   // 학년
    { width: 8 },   // 암벽화
    { width: 8 },   // 등급
    { width: 15 },  // 연락처
    { width: 12 },  // 결제일
    { width: 8 },   // 등록반
    { width: 8 },   // 수업시간1
    { width: 8 },   // 수업시간2
    { width: 10 },  // 등록한 수업
    { width: 12 },  // 등록개월 금액
    { width: 10 },  // 등록개월 수
    { width: 14 },  // 암벽화대여비 제외
    { width: 12 },  // 암벽화제외 횟수
    { width: 12 },  // 총 등록금액
    { width: 10 },  // 제외금액
    { width: 20 },  // 참고
  ]

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(arrayBuffer as ArrayBuffer)
}
