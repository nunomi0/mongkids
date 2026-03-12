import ExcelJS from 'exceljs'
import type { GroupType, AttendanceStatus, LevelType } from '@/types/student'
import {
  sanitizeExcelBuffer,
  excelTimeToString,
  getCellBgColor,
  isYellowBackground,
  isGrayBackground,
  cellToString,
  sheetNameToWeekday,
  parseLevelInitial,
  shouldIgnoreRow,
} from './utils'

// ============================================================
// 파싱 결과 타입
// ============================================================

export type ParsedClass = {
  date: string       // YYYY-MM-DD
  time: string       // HH:MM
  group_type: GroupType
}

export type ParsedAttendance = {
  student_name: string
  class_date: string
  class_time: string
  group_type: GroupType
  status: AttendanceStatus
  is_test: boolean
  test_level: LevelType | null
  memo: string
}

export type AttendanceParseResult = {
  classes: ParsedClass[]
  attendances: ParsedAttendance[]
  errors: string[]
}

// ============================================================
// 날짜 컬럼 매핑 구축
// ============================================================

type DateColumnInfo = {
  colNumber: number
  date: string  // YYYY-MM-DD
}

function buildDateColumns(
  worksheet: ExcelJS.Worksheet,
  year: number,
  weekday: number
): DateColumnInfo[] {
  const result: DateColumnInfo[] = []

  // Row 3: 월 헤더 (7월, 8월, ... 형식)
  // Row 4: 날짜 숫자 (7, 14, 21, 28 등 문자열)
  // Col 1~8: 헤더/구형 rollbook 영역 → 건너뜀
  // Col 9~: 실제 출석 날짜 컬럼
  const monthRow = worksheet.getRow(3)
  const dateRow = worksheet.getRow(4)

  let currentMonth = 0

  const totalCols = worksheet.columnCount
  console.log(`  [buildDateColumns] totalCols=${totalCols}`)

  // 전체 열 스캔 로그 (최대 40열)
  const scanLog: string[] = []
  for (let col = 1; col <= Math.min(totalCols, 40); col++) {
    const mv = cellToString(monthRow.getCell(col).value)
    const dv = cellToString(dateRow.getCell(col).value)
    if (mv || dv) scanLog.push(`col${col}:[월행="${mv}"][날짜행="${dv}"]`)
  }
  console.log(`  [buildDateColumns] 헤더 스캔:`, scanLog.join(', '))

  for (let col = 9; col <= totalCols; col++) {
    // 월 헤더 확인 (merged cell일 수 있어서 값이 있는 셀에서만 월을 업데이트)
    const monthVal = cellToString(monthRow.getCell(col).value)
    if (monthVal) {
      const match = monthVal.match(/(\d{1,2})월/)
      if (match) {
        currentMonth = parseInt(match[1])
        console.log(`  [buildDateColumns] col${col} → 월 감지: ${currentMonth}월`)
      }
      // "Rollbook", "Note", "note", "메모" 같은 값이면 날짜 영역 끝
      if (
        monthVal.toLowerCase().includes('rollbook') ||
        monthVal.toLowerCase().includes('note') ||
        monthVal.includes('메모')
      ) {
        // 이 이후로 새로운 Rollbook 영역이 시작되므로 현재 값을 확인하고 계속
        // Rollbook 자체는 다음 달의 시작일 수 있음
        continue
      }
    }

    if (currentMonth === 0) continue

    // 날짜 숫자 확인
    const dateVal = dateRow.getCell(col).value
    let dayNum = 0
    if (typeof dateVal === 'number') {
      dayNum = dateVal
    } else if (typeof dateVal === 'string') {
      dayNum = parseInt(dateVal)
    }

    if (dayNum > 0 && dayNum <= 31 && currentMonth > 0) {
      const dateStr = `${year}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      result.push({ colNumber: col, date: dateStr })
    }
  }

  console.log(`  [buildDateColumns] 찾은 날짜 컬럼:`, result.map(d => `col${d.colNumber}(${d.date})`).join(', '))
  return result
}

// ============================================================
// 학생 행에서 시간 추출
// ============================================================

function parseTimeFromCell(value: any): string {
  if (typeof value === 'number') {
    // Excel time fraction
    return excelTimeToString(value)
  }
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  }
  const str = cellToString(value)
  // "16:00" 형식
  const timeMatch = str.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) return `${String(parseInt(timeMatch[1])).padStart(2, '0')}:${timeMatch[2]}`
  // "16시" 형식
  const hourMatch = str.match(/(\d{1,2})시/)
  if (hourMatch) return `${String(parseInt(hourMatch[1])).padStart(2, '0')}:00`
  return ''
}

// ============================================================
// 메인 파싱 함수
// ============================================================

export async function parseAttendanceExcel(
  buffer: ArrayBuffer,
  year: number
): Promise<AttendanceParseResult> {
  const workbook = new ExcelJS.Workbook()
  const sanitized = await sanitizeExcelBuffer(buffer)
  await workbook.xlsx.load(sanitized)

  const classesMap = new Map<string, ParsedClass>() // key: date_time_groupType
  const attendances: ParsedAttendance[] = []
  const errors: string[] = []

  console.log('=== 출석표 시트 목록 ===')
  for (const ws of workbook.worksheets) {
    console.log(`시트: "${ws.name}", 행 수: ${ws.rowCount}, 열 수: ${ws.columnCount}`)
  }

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name
    const weekday = sheetNameToWeekday(sheetName)
    console.log(`시트 "${sheetName}" → weekday: ${weekday}`)
    if (weekday === null) {
      continue // 요일 시트가 아니면 무시
    }

    // Row 1~3 내용 디버깅
    for (let r = 1; r <= Math.min(4, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r)
      const cells: string[] = []
      for (let c = 1; c <= Math.min(10, worksheet.columnCount); c++) {
        cells.push(`[${c}]${cellToString(row.getCell(c).value)}`)
      }
      console.log(`  Row ${r}: ${cells.join(' | ')}`)
    }

    // 날짜 컬럼 매핑 구축
    const dateColumns = buildDateColumns(worksheet, year, weekday)
    console.log(`  날짜 컬럼 수: ${dateColumns.length}`, dateColumns.slice(0, 5))
    if (dateColumns.length === 0) {
      errors.push(`시트 "${sheetName}": 날짜 컬럼을 찾을 수 없습니다.`)
      continue
    }

    // 학생 행 순회 (row 4+)
    let currentTime = ''
    let currentGroupType: GroupType = '일반1'
    let studentRowCount = 0

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 4) return

      // 시간 확인 (col 1)
      const timeVal = row.getCell(1).value
      const parsedTime = parseTimeFromCell(timeVal)
      if (parsedTime) {
        console.log(`  [행${rowNumber}] 시간 변경: ${currentTime} → ${parsedTime}`)
        currentTime = parsedTime
      }

      // 이름 확인 (col 2)
      const name = cellToString(row.getCell(2).value)
      if (!name) return

      // "스페셜" 라벨 체크
      if (name === '스페셜' || name.includes('스페셜')) {
        console.log(`  [행${rowNumber}] 그룹 변경: 일반1 → 스페셜`)
        currentGroupType = '스페셜'
        return
      }

      // 무시할 행
      if (shouldIgnoreRow(name)) {
        console.log(`  [행${rowNumber}] 무시: "${name}"`)
        return
      }
      if (!currentTime) {
        console.log(`  [행${rowNumber}] 시간 없음, 스킵: "${name}"`)
        return
      }

      studentRowCount++
      if (studentRowCount <= 20) {
        console.log(`  [행${rowNumber}] 학생: "${name}" | 시간: ${currentTime} | 그룹: ${currentGroupType}`)
      }

      // 각 날짜 컬럼 처리
      for (const dc of dateColumns) {
        const cell = row.getCell(dc.colNumber)
        const cellValue = cellToString(cell.value)
        const bgColor = getCellBgColor(cell)

        // 빈 셀은 무시
        const hasYellow = isYellowBackground(bgColor)
        const hasGray = isGrayBackground(bgColor)

        if (!cellValue && !hasYellow && !hasGray) continue

        const classKey = `${dc.date}_${currentTime}_${currentGroupType}`
        if (!classesMap.has(classKey)) {
          classesMap.set(classKey, {
            date: dc.date,
            time: currentTime,
            group_type: currentGroupType,
          })
        }

        // 셀 해석
        let status: AttendanceStatus = '예정'
        let isTest = false
        let testLevel: LevelType | null = null
        let memo = ''

        if (hasYellow) {
          status = '출석'
        } else if (cellValue === '결석') {
          status = '결석'
        } else if (cellValue === '보강예정' || cellValue === '보강요망') {
          status = '보강예정'
        } else if (cellValue === '시작') {
          status = '출석'
          memo = '수업 시작일'
        } else if (hasGray) {
          // 회색 배경 → 결석 또는 수업 없음
          status = '결석'
        } else {
          // 레벨 테스트 이니셜 확인
          const level = parseLevelInitial(cellValue)
          if (level) {
            status = '출석'
            isTest = true
            testLevel = level
          } else if (cellValue.match(/^\d{1,2}\/\d{1,2}$/)) {
            // 날짜 형식 (예: "8/14") → 보강 날짜
            status = '보강예정'
            memo = `보강일: ${cellValue}`
          } else if (cellValue && !hasYellow && !hasGray) {
            // 다른 학생 이름 또는 기타 텍스트
            // 2글자 이상 한글이면 보강 학생으로 간주
            if (cellValue.match(/^[가-힣]{2,4}$/)) {
              // 보강으로 참여한 학생 → 별도 출석 기록
              attendances.push({
                student_name: cellValue,
                class_date: dc.date,
                class_time: currentTime,
                group_type: currentGroupType,
                status: '출석',
                is_test: false,
                test_level: null,
                memo: `보강 (원래: ${name})`,
              })
              status = '결석' // 원래 학생은 결석
            } else {
              continue // 알 수 없는 텍스트는 무시
            }
          } else {
            continue
          }
        }

        // 셀 메모(노트) 파싱
        const cellNote = (cell as any).note
        if (cellNote) {
          const noteText = typeof cellNote === 'string'
            ? cellNote
            : cellNote.texts?.map((t: any) => t.text || '').join('') || ''
          if (noteText) {
            memo = memo ? `${memo} | ${noteText}` : noteText
          }
        }

        attendances.push({
          student_name: name,
          class_date: dc.date,
          class_time: currentTime,
          group_type: currentGroupType,
          status,
          is_test: isTest,
          test_level: testLevel,
          memo,
        })
      }
      console.log(`  [시트 완료] 처리된 학생 행 수: ${studentRowCount}`)
    })
  }

  const classes = Array.from(classesMap.values())
  console.log('=== 최종 파싱 결과 ===')
  console.log(`수업: ${classes.length}건, 출석: ${attendances.length}건, 에러: ${errors.length}건`)
  if (errors.length > 0) console.warn('에러 목록:', errors)
  return { classes, attendances, errors }
}
