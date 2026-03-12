import ExcelJS from 'exceljs'
import type { Gender, CategoryType, LevelType, GroupType } from '@/types/student'
import {
  sanitizeExcelBuffer,
  excelSerialToDate,
  cellToString,
  cellToNumber,
  parseGender,
  parseCategory,
  parseSessionsPerWeek,
  parseLevelText,
  parseScheduleString,
  parseMonthFromSheetName,
} from './utils'

// ============================================================
// 파싱 결과 타입
// ============================================================

export type ParsedStudent = {
  name: string
  birth_date: string
  gender: Gender
  phone: string
  shoe_size: string
  category: CategoryType
  sessions_per_week: number
  current_level: LevelType | null
  memo: string
  schedules: { weekday: number; time: string; group_type: GroupType }[]
}

export type ParsedPayment = {
  /** 학생 식별 (이름+생년월일) */
  student_key: string
  payment_date: string
  target_month: string
  amount: number
  discounts: { type: string; amount: number }[]
  memo: string
}

export type MemberParseResult = {
  students: Map<string, ParsedStudent> // key: name+birth_date
  payments: ParsedPayment[]
  errors: string[]
}

// ============================================================
// 메인 파싱 함수
// ============================================================

export async function parseMemberExcel(buffer: ArrayBuffer): Promise<MemberParseResult> {
  const workbook = new ExcelJS.Workbook()
  const sanitized = await sanitizeExcelBuffer(buffer)
  await workbook.xlsx.load(sanitized)

  const students = new Map<string, ParsedStudent>()
  const payments: ParsedPayment[] = []
  const errors: string[] = []

  // 시트를 순서대로 처리 (1월~12월)
  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name
    const month = parseMonthFromSheetName(sheetName)
    if (month === null) {
      continue // N월 형식이 아닌 시트는 무시
    }

    // 데이터는 row 5부터 (0-indexed row 4가 헤더)
    const headerRowNum = 5 // 1-indexed
    const dataStartRow = headerRowNum + 1

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < dataStartRow) return

      try {
        const name = cellToString(row.getCell(2).value)
        if (!name || name.length < 1) return

        // 성별
        const genderText = cellToString(row.getCell(3).value)
        const gender = parseGender(genderText)

        // 생년월일 (toISOString은 UTC 변환으로 하루 밀릴 수 있어 로컬 날짜 사용)
        const birthRaw = row.getCell(4).value
        let birthDate = ''
        if (typeof birthRaw === 'number') {
          birthDate = excelSerialToDate(birthRaw)
        } else if (birthRaw instanceof Date) {
          const y = birthRaw.getFullYear()
          const m = String(birthRaw.getMonth() + 1).padStart(2, '0')
          const d = String(birthRaw.getDate()).padStart(2, '0')
          birthDate = `${y}-${m}-${d}`
        } else if (typeof birthRaw === 'string') {
          birthDate = birthRaw
        }

        // 생년월일 없으면 빈칸으로 진행

        const studentKey = `${name}_${birthDate}`

        // 암벽화 사이즈
        const shoeSize = cellToString(row.getCell(7).value)

        // 등급
        const levelText = cellToString(row.getCell(8).value)
        const currentLevel = parseLevelText(levelText)

        // 연락처
        const phone = cellToString(row.getCell(9).value)

        // 등록반 → sessions_per_week
        const classTypeText = cellToString(row.getCell(11).value)
        const sessionsPerWeek = parseSessionsPerWeek(classTypeText)

        // 수업시간 → schedules
        const schedules: { weekday: number; time: string; group_type: GroupType }[] = []
        const sched1Text = cellToString(row.getCell(12).value)
        const sched2Text = cellToString(row.getCell(13).value)

        // 등록한 수업 → category
        const categoryText = cellToString(row.getCell(14).value)
        const category = parseCategory(categoryText)
        const groupType: GroupType = category === '스페셜' ? '스페셜' : '일반1'

        const s1 = parseScheduleString(sched1Text)
        if (s1) schedules.push({ ...s1, group_type: groupType })
        const s2 = parseScheduleString(sched2Text)
        if (s2) schedules.push({ ...s2, group_type: groupType })

        // 메모
        const memo = cellToString(row.getCell(21).value)

        // 학생 데이터 (최신 월로 갱신)
        students.set(studentKey, {
          name,
          birth_date: birthDate,
          gender,
          phone,
          shoe_size: shoeSize,
          category,
          sessions_per_week: sessionsPerWeek,
          current_level: currentLevel,
          memo,
          schedules,
        })

        // 결제 데이터
        const paymentDateRaw = row.getCell(10).value
        let paymentDate = ''
        if (typeof paymentDateRaw === 'number') {
          paymentDate = excelSerialToDate(paymentDateRaw)
        } else if (paymentDateRaw instanceof Date) {
          const py = paymentDateRaw.getFullYear()
          const pm = String(paymentDateRaw.getMonth() + 1).padStart(2, '0')
          const pd = String(paymentDateRaw.getDate()).padStart(2, '0')
          paymentDate = `${py}-${pm}-${pd}`
        } else if (typeof paymentDateRaw === 'string' && paymentDateRaw.trim()) {
          paymentDate = paymentDateRaw.trim()
        }

        const amount = cellToNumber(row.getCell(15).value)
        const discountAmount = cellToNumber(row.getCell(20).value)

        if (amount > 0 || paymentDate) {
          // target_month: 시트의 월
          const year = paymentDate ? parseInt(paymentDate.split('-')[0]) : new Date().getFullYear()
          const targetMonth = `${year}-${String(month).padStart(2, '0')}`

          const discounts: { type: string; amount: number }[] = []
          if (discountAmount > 0) {
            discounts.push({ type: '할인', amount: discountAmount })
          }

          payments.push({
            student_key: studentKey,
            payment_date: paymentDate || `${targetMonth}-01`,
            target_month: targetMonth,
            amount,
            discounts,
            memo: cellToString(row.getCell(21).value),
          })
        }
      } catch (err) {
        errors.push(`시트 "${sheetName}" ${rowNumber}행 파싱 오류: ${err}`)
      }
    })
  }

  return { students, payments, errors }
}
