import JSZip from 'jszip'
import type { LevelType, GroupType, Gender, CategoryType } from '@/types/student'

// ============================================================
// ExcelJS 호환성 전처리
// 1. docProps/app.xml 파싱 크래시 우회
// 2. sharedStrings.xml 네임스페이스 접두사 제거 (x:sst → sst)
//    ExcelJS는 접두사 없는 태그명만 지원
//    다른 XML은 건드리지 않음 (워크북 구조 깨짐 방지)
// ============================================================

/** XML 네임스페이스 접두사를 제거 (예: <x:sst> → <sst>, </x:si> → </si>) */
function stripXmlNamespacePrefixes(xml: string): string {
  return xml
    .replace(/<([a-zA-Z][a-zA-Z0-9]*):([a-zA-Z])/g, '<$2')
    .replace(/<\/([a-zA-Z][a-zA-Z0-9]*):([a-zA-Z])/g, '</$2')
}

export async function sanitizeExcelBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(buffer)

  // docProps/app.xml 제거 (파싱 크래시 우회)
  zip.remove('docProps/app.xml')

  // xl/ 하위 모든 XML 파일에서 네임스페이스 접두사 제거
  // (일부 xlsx 파일은 x:workbook, x:worksheet, x:sst 등 접두사를 사용해
  //  ExcelJS 파싱 실패 → undefined 반환 → 프로퍼티 접근 에러 발생)
  const xmlFiles = Object.keys(zip.files).filter(
    f => f.startsWith('xl/') && f.endsWith('.xml') && !zip.files[f].dir
  )
  for (const xmlFile of xmlFiles) {
    const content = await zip.file(xmlFile)?.async('string')
    if (content) {
      zip.file(xmlFile, stripXmlNamespacePrefixes(content))
    }
  }

  return await zip.generateAsync({ type: 'arraybuffer' })
}

// ============================================================
// Excel Serial Date ↔ JS Date
// ============================================================

/** Excel serial number → 'YYYY-MM-DD' string */
export function excelSerialToDate(serial: number): string {
  // Excel epoch is 1900-01-01, but has a bug treating 1900 as leap year
  const epoch = new Date(1899, 11, 30) // 1899-12-30
  const date = new Date(epoch.getTime() + serial * 86400000)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ============================================================
// Excel 시간 분수 → HH:MM
// ============================================================

/** Excel time fraction (0~1) → "HH:00" */
export function excelTimeToString(fraction: number): string {
  const totalMinutes = Math.round(fraction * 24 * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// ============================================================
// 셀 배경색 판별
// ============================================================

/** ARGB 문자열에서 노란색 계열인지 판별 */
export function isYellowBackground(argb: string | undefined): boolean {
  if (!argb) return false
  // Remove alpha prefix if present (FFRRGGBB → RRGGBB)
  const hex = argb.length === 8 ? argb.slice(2) : argb
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // Yellow-ish: high R, high G, low B
  return r > 180 && g > 180 && b < 130
}

/** ARGB 문자열에서 회색 계열인지 판별 */
export function isGrayBackground(argb: string | undefined): boolean {
  if (!argb) return false
  const hex = argb.length === 8 ? argb.slice(2) : argb
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // Gray: all similar values, not too bright, not too dark
  const avg = (r + g + b) / 3
  const maxDiff = Math.max(Math.abs(r - avg), Math.abs(g - avg), Math.abs(b - avg))
  return maxDiff < 30 && avg > 100 && avg < 220
}

/** 셀에서 ARGB 배경색 추출 */
export function getCellBgColor(cell: any): string | undefined {
  const fill = cell?.style?.fill || cell?.fill
  if (!fill) return undefined
  if (fill.type === 'pattern' && fill.fgColor) {
    return fill.fgColor.argb || fill.fgColor.theme !== undefined ? fill.fgColor.argb : undefined
  }
  return undefined
}

// ============================================================
// 수업시간 파싱 (화17 → weekday=2, time="17:00")
// ============================================================

const WEEKDAY_MAP: Record<string, number> = {
  '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0,
}

export function parseScheduleString(schedule: string): { weekday: number; time: string } | null {
  if (!schedule || typeof schedule !== 'string') return null
  const trimmed = schedule.trim()
  if (trimmed.length < 2) return null

  const dayChar = trimmed[0]
  const weekday = WEEKDAY_MAP[dayChar]
  if (weekday === undefined) return null

  const hourStr = trimmed.slice(1).trim()
  const hour = parseInt(hourStr)
  if (isNaN(hour)) return null

  return { weekday, time: `${String(hour).padStart(2, '0')}:00` }
}

// ============================================================
// 등급 매핑
// ============================================================

const LEVEL_MAP: Record<string, LevelType> = {
  '화이트': 'WHITE',
  '옐로우': 'YELLOW',
  '그린': 'GREEN',
  '블루': 'BLUE',
  '레드': 'RED',
  '블랙': 'BLACK',
  '골드': 'GOLD',
  '마스터': 'GOLD',
}

export function parseLevelText(text: string): LevelType | null {
  if (!text) return null
  const trimmed = text.trim()
  return LEVEL_MAP[trimmed] || null
}

/** 이니셜 → LevelType 매핑 (출석표 레벨테스트) */
const LEVEL_INITIAL_MAP: Record<string, LevelType> = {
  'W': 'WHITE',
  'Y': 'YELLOW',
  'G': 'GREEN',
  'B': 'BLUE',
  'R': 'RED',
  'K': 'BLACK',
}

export function parseLevelInitial(text: string): LevelType | null {
  if (!text || text.length !== 1) return null
  return LEVEL_INITIAL_MAP[text.toUpperCase()] || null
}

// ============================================================
// 성별 변환
// ============================================================

export function parseGender(text: string): Gender {
  const t = text?.trim()
  if (t === '남' || t === 'M' || t === '남자') return '남'
  if (t === '여' || t === 'F' || t === '여자') return '여'
  return '남' // default
}

// ============================================================
// 카테고리 매핑
// ============================================================

export function parseCategory(text: string): CategoryType {
  const t = text?.trim()
  if (t?.includes('키즈') || t?.includes('어린이')) return '어린이'
  if (t?.includes('청소년')) return '청소년'
  if (t?.includes('성인')) return '성인'
  if (t?.includes('스페셜')) return '스페셜'
  return '어린이' // default
}

// ============================================================
// 주 횟수 파싱
// ============================================================

export function parseSessionsPerWeek(text: string): number {
  if (!text) return 2
  const t = text.trim()
  if (t.includes('1') || t.includes('주1')) return 1
  if (t.includes('3') || t.includes('주3')) return 3
  return 2 // default: 주2회
}

// ============================================================
// 셀 값 안전하게 문자열로 변환
// ============================================================

export function cellToString(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && value.text) return value.text
  if (typeof value === 'object' && value.richText) {
    return value.richText.map((r: any) => r.text || '').join('')
  }
  return String(value).trim()
}

export function cellToNumber(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const parsed = parseFloat(String(value).replace(/[,원]/g, ''))
  return isNaN(parsed) ? 0 : parsed
}

// ============================================================
// 요일 시트명 → weekday 번호
// ============================================================

const SHEET_WEEKDAY_MAP: Record<string, number> = {
  '월요일': 1, '월': 1,
  '화요일': 2, '화': 2,
  '수요일': 3, '수': 3,
  '목요일': 4, '목': 4,
  '금요일': 5, '금': 5,
  '토요일': 6, '토': 6,
  '일요일': 0, '일': 0,
}

export function sheetNameToWeekday(name: string): number | null {
  const trimmed = name.trim()
  // 시트명에서 요일 추출 (예: "월요일 수업" → "월요일")
  for (const [key, value] of Object.entries(SHEET_WEEKDAY_MAP)) {
    if (trimmed.startsWith(key)) return value
  }
  return null
}

// ============================================================
// 월 이름 → 월 번호
// ============================================================

const MONTH_MAP: Record<string, number> = {
  '1월': 1, '2월': 2, '3월': 3, '4월': 4, '5월': 5, '6월': 6,
  '7월': 7, '8월': 8, '9월': 9, '10월': 10, '11월': 11, '12월': 12,
  'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
  'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12,
}

export function parseMonthFromSheetName(name: string): number | null {
  const trimmed = name.trim()
  // Try direct match
  if (MONTH_MAP[trimmed]) return MONTH_MAP[trimmed]
  // Try extracting number + 월
  const match = trimmed.match(/(\d{1,2})월/)
  if (match) return parseInt(match[1])
  return null
}

// ============================================================
// 강사명 / 무시할 텍스트
// ============================================================

const IGNORE_NAMES = ['합계', '주현', '소현', '강사', '합', 'Total', 'total']

export function shouldIgnoreRow(name: string): boolean {
  if (!name) return true
  return IGNORE_NAMES.some(ig => name.includes(ig))
}
