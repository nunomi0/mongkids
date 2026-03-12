import ExcelJS from 'exceljs'
import type { GroupType, LevelType, AttendanceStatus } from '@/types/student'

// ============================================================
// 타입
// ============================================================

export type ExportClassAttendance = {
  class_date: string
  class_time: string
  group_type: GroupType
  student_name: string
  student_age: number
  student_gender: string
  status: AttendanceStatus
  is_test: boolean
  test_level: LevelType | null
  memo: string
}

// ============================================================
// 레벨 이니셜 매핑
// ============================================================

const LEVEL_INITIAL: Record<string, string> = {
  WHITE: 'W',
  YELLOW: 'Y',
  GREEN: 'G',
  BLUE: 'B',
  RED: 'R',
  BLACK: 'K',
  GOLD: 'GOLD',
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

// ============================================================
// 엑셀 생성
// ============================================================

export async function generateAttendanceExcel(
  attendances: ExportClassAttendance[],
  year: number,
  startMonth: number,
  endMonth: number
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()

  // 요일별로 그룹
  const byWeekday = new Map<number, ExportClassAttendance[]>()
  for (const att of attendances) {
    const date = new Date(att.class_date)
    const weekday = date.getDay()
    if (!byWeekday.has(weekday)) byWeekday.set(weekday, [])
    byWeekday.get(weekday)!.push(att)
  }

  // 스타일 정의
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  }
  const yellowFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' },
  }
  const grayFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC0C0C0' },
  }
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 9 }

  // 정렬된 요일 순서 (월~일)
  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]

  for (const weekday of weekdayOrder) {
    const dayAtts = byWeekday.get(weekday)
    if (!dayAtts || dayAtts.length === 0) continue

    const sheetName = `${WEEKDAY_KO[weekday]}요일`
    const worksheet = workbook.addWorksheet(sheetName)

    // 날짜 목록 구축 (해당 요일의 모든 날짜, 정렬)
    const allDates = [...new Set(dayAtts.map((a) => a.class_date))].sort()

    // 월별 날짜 그룹
    const monthDates = new Map<number, string[]>()
    for (const d of allDates) {
      const m = parseInt(d.split('-')[1])
      if (m < startMonth || m > endMonth) continue
      if (!monthDates.has(m)) monthDates.set(m, [])
      monthDates.get(m)!.push(d)
    }

    // 시간대+그룹별 학생 목록
    type StudentSlot = {
      time: string
      group_type: GroupType
      name: string
      age: number
      gender: string
      attendanceByDate: Map<string, { status: AttendanceStatus; is_test: boolean; test_level: LevelType | null; memo: string }>
    }

    const slotKey = (time: string, gt: GroupType) => `${time}_${gt}`
    const studentsBySlot = new Map<string, StudentSlot[]>()

    for (const att of dayAtts) {
      const key = slotKey(att.class_time, att.group_type)
      if (!studentsBySlot.has(key)) studentsBySlot.set(key, [])

      const slotStudents = studentsBySlot.get(key)!
      let student = slotStudents.find((s) => s.name === att.student_name)
      if (!student) {
        student = {
          time: att.class_time,
          group_type: att.group_type,
          name: att.student_name,
          age: att.student_age,
          gender: att.student_gender,
          attendanceByDate: new Map(),
        }
        slotStudents.push(student)
      }
      student.attendanceByDate.set(att.class_date, {
        status: att.status,
        is_test: att.is_test,
        test_level: att.test_level,
        memo: att.memo,
      })
    }

    // Row 1: 시트 타이틀
    worksheet.addRow([`${WEEKDAY_KO[weekday]}요일 수업`])
    worksheet.getRow(1).font = { bold: true, size: 12 }

    // Row 2: 월 헤더
    const monthHeaderRow: string[] = ['시간', '이름', '나이', '성별']
    const dateColumnMap: { col: number; date: string }[] = []
    let colIndex = 5

    const sortedMonths = [...monthDates.keys()].sort((a, b) => a - b)
    for (const month of sortedMonths) {
      const dates = monthDates.get(month)!
      monthHeaderRow.push(`${month}월`)
      // 나머지 날짜 열은 빈 값
      for (let i = 1; i < dates.length; i++) {
        monthHeaderRow.push('')
      }
      for (const date of dates) {
        dateColumnMap.push({ col: colIndex, date })
        colIndex++
      }
    }

    const row2 = worksheet.addRow(monthHeaderRow)
    row2.eachCell((cell) => {
      cell.fill = headerFill
      cell.font = headerFont
      cell.border = thinBorder
      cell.alignment = { horizontal: 'center' }
    })

    // Row 3: 날짜 숫자
    const dateNumRow: (string | number)[] = ['', '', '', '']
    for (const dc of dateColumnMap) {
      const day = parseInt(dc.date.split('-')[2])
      dateNumRow.push(day)
    }
    const row3 = worksheet.addRow(dateNumRow)
    row3.eachCell((cell, colNum) => {
      if (colNum >= 5) {
        cell.fill = headerFill
        cell.font = headerFont
        cell.border = thinBorder
        cell.alignment = { horizontal: 'center' }
      }
    })

    // 시간대별 학생 데이터
    const sortedSlots = [...studentsBySlot.entries()].sort(([a], [b]) => a.localeCompare(b))

    for (const [, students] of sortedSlots) {
      if (students.length === 0) continue

      // 그룹 타입 표시
      if (students[0].group_type === '스페셜') {
        const specialRow = worksheet.addRow(['', '스페셜'])
        specialRow.font = { bold: true, color: { argb: 'FFFF0000' } }
      }

      for (const student of students) {
        const rowData: (string | number)[] = [
          student.time,
          student.name,
          student.age,
          student.gender,
        ]

        // 각 날짜 컬럼 데이터
        for (const dc of dateColumnMap) {
          const att = student.attendanceByDate.get(dc.date)
          if (!att) {
            rowData.push('')
          } else if (att.is_test && att.test_level) {
            rowData.push(LEVEL_INITIAL[att.test_level] || '')
          } else if (att.status === '보강예정') {
            rowData.push('보강예정')
          } else if (att.status === '결석') {
            rowData.push('결석')
          } else {
            rowData.push('') // 출석은 배경색으로 표시
          }
        }

        const dataRow = worksheet.addRow(rowData)

        // 셀 스타일 적용
        dataRow.eachCell((cell, colNum) => {
          cell.border = thinBorder
          cell.alignment = { horizontal: 'center', vertical: 'middle' }

          if (colNum >= 5) {
            const dcIndex = colNum - 5
            if (dcIndex >= 0 && dcIndex < dateColumnMap.length) {
              const dc = dateColumnMap[dcIndex]
              const att = student.attendanceByDate.get(dc.date)
              if (att) {
                if (att.status === '출석') {
                  cell.fill = yellowFill
                } else if (att.status === '결석') {
                  cell.fill = grayFill
                  if (!att.is_test) {
                    cell.font = { color: { argb: 'FFFF0000' } }
                  }
                }
              }
            }
          }
        })
      }
    }

    // 열 너비
    worksheet.getColumn(1).width = 7  // 시간
    worksheet.getColumn(2).width = 10 // 이름
    worksheet.getColumn(3).width = 5  // 나이
    worksheet.getColumn(4).width = 5  // 성별
    for (let i = 5; i <= colIndex; i++) {
      worksheet.getColumn(i).width = 5
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(arrayBuffer as ArrayBuffer)
}
