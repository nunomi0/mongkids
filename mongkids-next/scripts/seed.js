#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_BRANCH_ID = 'b0000000-0000-0000-0000-000000000001'
const BRANCH_NAME = '몽키즈클라이밍 고양화정점'
const LEVELS = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD']

const START_DATE = '2026-01-01'
const END_DATE = '2026-02-28'
const TODAY = '2026-02-21'

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  const raw = fs.readFileSync(filePath, 'utf8')

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }

  return out
}

function uuidFrom(group, index) {
  const groupHex = group.toString(16).padStart(4, '0')
  const tail = index.toString(16).padStart(12, '0')
  return `00000000-0000-0000-${groupHex}-${tail}`
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(random, arr) {
  return arr[Math.floor(random() * arr.length)]
}

function shuffle(random, arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function formatDate(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(dateStr, days) {
  const dt = new Date(`${dateStr}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + days)
  return formatDate(dt)
}

function randomBirthDate(random, startYear, endYear) {
  const year = Math.floor(random() * (endYear - startYear + 1)) + startYear
  const month = Math.floor(random() * 12) + 1
  const day = Math.floor(random() * 28) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function randomPhone(i) {
  const middle = String(1000 + ((i * 37) % 9000)).padStart(4, '0')
  const end = String(1000 + ((i * 91) % 9000)).padStart(4, '0')
  return `010-${middle}-${end}`
}

function chunk(arr, size = 500) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function insertBatched(supabase, table, rows, options = {}) {
  if (!rows.length) return 0
  let inserted = 0
  for (const batch of chunk(rows, 500)) {
    let q = supabase.from(table)
    if (options.upsert) {
      q = q.upsert(batch, {
        onConflict: options.onConflict,
        ignoreDuplicates: Boolean(options.ignoreDuplicates),
      })
    } else {
      q = q.insert(batch)
    }
    const { data, error } = await q.select('id')
    if (error) throw new Error(`${table} insert/upsert failed: ${error.message}`)
    inserted += data ? data.length : 0
  }
  return inserted
}

async function deleteAll(supabase, table) {
  const { error } = await supabase.from(table).delete().not('id', 'is', null)
  if (error) throw new Error(`${table} delete failed: ${error.message}`)
}

function nextLevel(level) {
  const idx = LEVELS.indexOf(level)
  if (idx < 0 || idx >= LEVELS.length - 1) return null
  return LEVELS[idx + 1]
}

function paymentAmount(student) {
  if (student.category === '스페셜') return 200000
  if (student.category === '성인' && student.sessions_per_week === 3) return 180000
  if (student.sessions_per_week === 1) return 90000
  if (student.sessions_per_week === 2) return 120000
  return 150000
}

function buildStudents(random) {
  const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '임', '한', '오', '서', '배', '권', '신', '유', '장', '송']
  const givens = ['민준', '서윤', '지호', '수아', '예준', '하늘', '서진', '도윤', '소율', '지안', '하린', '준서', '은우', '태현', '유나', '태호', '하은', '서준', '예린', '우진']

  const segmentMeta = {
    A: { range: [1, 42], status: '재원', category: '어린이' },
    B: { range: [43, 55], status: '재원', category: '청소년' },
    C: { range: [56, 65], status: '재원', category: '성인' },
    D: { range: [66, 70], status: '재원', category: '스페셜' },
    E: { range: [71, 85], status: '휴원', category: '혼합' },
    F: { range: [86, 95], status: '퇴원', category: '혼합' },
    G: { range: [96, 100], status: '체험', category: '혼합' },
  }

  const students = []
  for (const [segment, meta] of Object.entries(segmentMeta)) {
    for (let i = meta.range[0]; i <= meta.range[1]; i++) {
      let category = meta.category
      if (category === '혼합') {
        const pool = segment === 'G' ? ['어린이', '청소년'] : ['어린이', '청소년', '성인', '스페셜']
        category = pool[(i - 1) % pool.length]
      }

      let sessions = 2
      if (category === '스페셜') sessions = 3
      else if (meta.status === '체험') sessions = 1
      else sessions = (i % 3 === 0) ? 3 : 2

      const gender = i % 2 === 0 ? '여' : '남'
      const surname = surnames[i % surnames.length]
      const given = givens[(i * 3) % givens.length]
      const name = `${surname}${given}`

      const birthDate = category === '어린이'
        ? randomBirthDate(random, 2013, 2018)
        : category === '청소년'
          ? randomBirthDate(random, 2009, 2012)
          : category === '성인'
            ? randomBirthDate(random, 1985, 2003)
            : randomBirthDate(random, 2010, 2016)

      students.push({
        key: `S${String(i).padStart(3, '0')}`,
        id: uuidFrom(0x1000, i),
        branch_id: DEFAULT_BRANCH_ID,
        name,
        birth_date: birthDate,
        gender,
        phone: randomPhone(i),
        shoe_size: String(200 + (i % 10) * 5),
        status: meta.status,
        category,
        sessions_per_week: sessions,
        current_level: null,
        memo: segment === 'G' ? '체험 문의 리드' : `${segment} 세그먼트`,
      })
    }
  }

  const byKey = new Map(students.map((s) => [s.key, s]))

  function applyLevels(keys, distribution) {
    let cursor = 0
    for (const [level, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        const key = keys[cursor++]
        byKey.get(key).current_level = level
      }
    }
  }

  const A = students.filter((s) => s.key >= 'S001' && s.key <= 'S042').map((s) => s.key)
  const B = students.filter((s) => s.key >= 'S043' && s.key <= 'S055').map((s) => s.key)
  const C = students.filter((s) => s.key >= 'S056' && s.key <= 'S065').map((s) => s.key)
  const D = students.filter((s) => s.key >= 'S066' && s.key <= 'S070').map((s) => s.key)

  applyLevels(A, { WHITE: 6, YELLOW: 8, GREEN: 8, BLUE: 7, RED: 5, BLACK: 4, GOLD: 4 })
  applyLevels(B, { YELLOW: 3, GREEN: 4, BLUE: 3, RED: 3 })
  applyLevels(C, { GREEN: 3, BLUE: 3, RED: 2, BLACK: 1, GOLD: 1 })
  applyLevels(D, { BLUE: 2, RED: 2, BLACK: 1 })

  // 휴원/퇴원 혼합 레벨
  for (const s of students.filter((x) => x.key >= 'S071' && x.key <= 'S095')) {
    s.current_level = pick(random, ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD'])
  }

  // 체험은 레벨 없음
  for (const s of students.filter((x) => x.key >= 'S096' && x.key <= 'S100')) {
    s.current_level = null
  }

  // QA 시나리오 고정 매핑
  const scenarios = {
    // 대상자 (15+)
    L01: 'S002', L02: 'S005', L03: 'S008', L04: 'S011', L05: 'S014', // YELLOW
    L06: 'S017', L07: 'S020', L08: 'S023', L09: 'S026', L10: 'S029', // GREEN
    L11: 'S032', L12: 'S035', L13: 'S038', // BLUE
    L14: 'S040', L15: 'S042', // RED
    // 비대상
    B01: 'S044', B02: 'S047', B03: 'S050', // YELLOW 1개월
    B04: 'S053', B05: 'S056', // GREEN 1개월
    G01: 'S058', G02: 'S061', G03: 'S064', // GOLD
    P01: 'S066', P02: 'S068', P03: 'S070', // 이번 달 승급
  }

  for (const key of [scenarios.L01, scenarios.L02, scenarios.L03, scenarios.L04, scenarios.L05, scenarios.B01, scenarios.B02, scenarios.B03]) {
    byKey.get(key).current_level = 'YELLOW'
  }
  for (const key of [scenarios.L06, scenarios.L07, scenarios.L08, scenarios.L09, scenarios.L10, scenarios.B04, scenarios.B05, scenarios.P01, scenarios.P02, scenarios.P03]) {
    byKey.get(key).current_level = 'GREEN'
  }
  for (const key of [scenarios.L11, scenarios.L12, scenarios.L13]) byKey.get(key).current_level = 'BLUE'
  for (const key of [scenarios.L14, scenarios.L15]) byKey.get(key).current_level = 'RED'
  for (const key of [scenarios.G01, scenarios.G02, scenarios.G03]) byKey.get(key).current_level = 'GOLD'

  return { students, scenarios }
}

function buildSchedules(random, students) {
  // 평일: 14:00~20:00, 주말: 10:00~18:00, 12~13시는 제외
  const childSlots = [
    [1, '14:00', '일반1'], [2, '14:00', '일반1'], [3, '14:00', '일반1'], [4, '14:00', '일반1'], [5, '14:00', '일반1'],
    [1, '15:00', '일반1'], [2, '15:00', '일반1'], [3, '15:00', '일반1'], [4, '15:00', '일반1'], [5, '15:00', '일반1'],
    [1, '16:00', '일반2'], [2, '16:00', '일반2'], [3, '16:00', '일반2'], [4, '16:00', '일반2'], [5, '16:00', '일반2'],
    [1, '17:00', '일반2'], [2, '17:00', '일반2'], [3, '17:00', '일반2'], [4, '17:00', '일반2'], [5, '17:00', '일반2'],
    [0, '10:00', '일반1'], [6, '10:00', '일반1'], [0, '11:00', '일반1'], [6, '11:00', '일반1'],
    [0, '14:00', '일반2'], [6, '14:00', '일반2'], [0, '15:00', '일반2'], [6, '15:00', '일반2'],
  ]
  const teenSlots = [
    [1, '16:00', '일반1'], [2, '16:00', '일반1'], [3, '16:00', '일반1'], [4, '16:00', '일반1'], [5, '16:00', '일반1'],
    [1, '17:00', '일반1'], [2, '17:00', '일반1'], [3, '17:00', '일반1'], [4, '17:00', '일반1'], [5, '17:00', '일반1'],
    [1, '18:00', '일반2'], [2, '18:00', '일반2'], [3, '18:00', '일반2'], [4, '18:00', '일반2'], [5, '18:00', '일반2'],
    [1, '19:00', '일반2'], [2, '19:00', '일반2'], [3, '19:00', '일반2'], [4, '19:00', '일반2'], [5, '19:00', '일반2'],
    [0, '11:00', '일반1'], [6, '11:00', '일반1'], [0, '14:00', '일반1'], [6, '14:00', '일반1'],
    [0, '16:00', '일반2'], [6, '16:00', '일반2'], [0, '18:00', '일반2'], [6, '18:00', '일반2'],
  ]
  const adultSlots = [
    [1, '18:00', '일반1'], [2, '18:00', '일반1'], [3, '18:00', '일반1'], [4, '18:00', '일반1'], [5, '18:00', '일반1'],
    [1, '19:00', '일반1'], [2, '19:00', '일반1'], [3, '19:00', '일반1'], [4, '19:00', '일반1'], [5, '19:00', '일반1'],
    [1, '20:00', '일반2'], [2, '20:00', '일반2'], [3, '20:00', '일반2'], [4, '20:00', '일반2'], [5, '20:00', '일반2'],
    [0, '10:00', '일반1'], [6, '10:00', '일반1'], [0, '11:00', '일반1'], [6, '11:00', '일반1'],
    [0, '14:00', '일반2'], [6, '14:00', '일반2'], [0, '17:00', '일반2'], [6, '17:00', '일반2'],
  ]
  const specialSlots = [
    [1, '17:00', '스페셜'], [2, '17:00', '스페셜'], [3, '17:00', '스페셜'], [4, '17:00', '스페셜'], [5, '17:00', '스페셜'],
    [1, '18:00', '스페셜'], [2, '18:00', '스페셜'], [3, '18:00', '스페셜'], [4, '18:00', '스페셜'], [5, '18:00', '스페셜'],
    [1, '19:00', '스페셜'], [3, '19:00', '스페셜'], [5, '19:00', '스페셜'],
    [0, '10:00', '스페셜'], [6, '10:00', '스페셜'], [0, '14:00', '스페셜'], [6, '14:00', '스페셜'], [0, '16:00', '스페셜'], [6, '16:00', '스페셜'],
  ]

  const slotsByCategory = {
    어린이: childSlots,
    청소년: teenSlots,
    성인: adultSlots,
    스페셜: specialSlots,
  }

  const slotOccupancy = new Map() // key -> count
  const scheduleRows = []
  let seq = 1

  for (const s of students) {
    if (s.status === '체험') continue

    const pool = slotsByCategory[s.category] || childSlots
    const picked = []
    const usedWeekdays = new Set()

    while (picked.length < s.sessions_per_week) {
      const candidates = pool
        .filter(([weekday, time, group_type]) => {
          const key = `${weekday}|${time}|${group_type}`
          const occ = slotOccupancy.get(key) || 0
          if (occ >= 6) return false
          if (picked.find((x) => x[0] === weekday && x[1] === time)) return false
          if (usedWeekdays.has(weekday)) return false
          return true
        })
        .sort((a, b) => {
          const ka = `${a[0]}|${a[1]}|${a[2]}`
          const kb = `${b[0]}|${b[1]}|${b[2]}`
          const oa = slotOccupancy.get(ka) || 0
          const ob = slotOccupancy.get(kb) || 0
          if (oa !== ob) return oa - ob
          return random() < 0.5 ? -1 : 1
        })

      if (!candidates.length) {
        // weekday 중복 허용 fallback
        const fallback = pool
          .filter(([weekday, time, group_type]) => {
            const key = `${weekday}|${time}|${group_type}`
            const occ = slotOccupancy.get(key) || 0
            if (occ >= 6) return false
            if (picked.find((x) => x[0] === weekday && x[1] === time)) return false
            return true
          })
          .sort((a, b) => {
            const ka = `${a[0]}|${a[1]}|${a[2]}`
            const kb = `${b[0]}|${b[1]}|${b[2]}`
            return (slotOccupancy.get(ka) || 0) - (slotOccupancy.get(kb) || 0)
          })
        if (!fallback.length) break
        picked.push(fallback[0])
        usedWeekdays.add(fallback[0][0])
        continue
      }

      picked.push(candidates[0])
      usedWeekdays.add(candidates[0][0])
    }

    for (const [weekday, time, group_type] of picked) {
      const occKey = `${weekday}|${time}|${group_type}`
      slotOccupancy.set(occKey, (slotOccupancy.get(occKey) || 0) + 1)
      scheduleRows.push({
        id: uuidFrom(0x2000, seq),
        student_id: s.id,
        weekday,
        time,
        group_type,
      })
      seq += 1
    }
  }

  return scheduleRows
}

function buildLevelHistories(random, students, scenarios) {
  const rows = []
  let idx = 1

  const scenarioDateByKey = new Map([
    [scenarios.L01, { YELLOW: '2025-11-05' }],
    [scenarios.L02, { YELLOW: '2025-10-20' }],
    [scenarios.L03, { YELLOW: '2025-09-15' }],
    [scenarios.L04, { YELLOW: '2025-08-25' }],
    [scenarios.L05, { YELLOW: '2025-11-12' }],

    [scenarios.L06, { GREEN: '2025-10-15' }],
    [scenarios.L07, { GREEN: '2025-09-30' }],
    [scenarios.L08, { GREEN: '2025-08-22' }],
    [scenarios.L09, { GREEN: '2025-11-01' }],
    [scenarios.L10, { GREEN: '2025-10-05' }],

    [scenarios.L11, { BLUE: '2025-09-01' }],
    [scenarios.L12, { BLUE: '2025-08-15' }],
    [scenarios.L13, { BLUE: '2025-07-20' }],

    [scenarios.L14, { RED: '2025-07-01' }],
    [scenarios.L15, { RED: '2025-06-10' }],

    [scenarios.B01, { YELLOW: '2026-01-10' }],
    [scenarios.B02, { YELLOW: '2026-01-08' }],
    [scenarios.B03, { YELLOW: '2026-01-03' }],

    [scenarios.B04, { GREEN: '2026-01-12' }],
    [scenarios.B05, { GREEN: '2026-01-16' }],

    [scenarios.P01, { GREEN: '2026-02-05' }],
    [scenarios.P02, { GREEN: '2026-02-08' }],
    [scenarios.P03, { GREEN: '2026-02-11' }],
  ])

  for (const s of students) {
    const currentIdx = s.current_level ? LEVELS.indexOf(s.current_level) : -1

    for (let levelIdx = 0; levelIdx < LEVELS.length; levelIdx++) {
      const level = LEVELS[levelIdx]
      let acquired_date = null

      if (currentIdx >= 0 && levelIdx <= currentIdx) {
        const fromScenario = scenarioDateByKey.get(s.key)
        if (fromScenario && fromScenario[level]) {
          acquired_date = fromScenario[level]
        } else if (s.current_level === 'GOLD' && level === 'GOLD') {
          acquired_date = '2024-12-15'
        } else {
          const monthOffset = (currentIdx - levelIdx + 1) * 2 + Math.floor(random() * 3)
          const year = 2026 - Math.floor(monthOffset / 12)
          const month = 2 - (monthOffset % 12)
          const norm = new Date(Date.UTC(year, month - 1, 10))
          acquired_date = formatDate(norm)
        }
      }

      rows.push({
        id: uuidFrom(0x3000, idx++),
        student_id: s.id,
        level,
        acquired_date,
      })
    }
  }

  return rows
}

function buildPayments(random, students) {
  const active = students.filter((s) => s.status === '재원')
  const pausedWithdrawn = students.filter((s) => s.status === '휴원' || s.status === '퇴원')

  const shuffled = shuffle(random, active)
  const normal = shuffled.slice(0, 40)
  const lateA = shuffled.slice(40, 60)
  const lateB = shuffled.slice(60, 70)

  const targetMonthsByGroup = new Map()
  for (const s of normal) targetMonthsByGroup.set(s.id, ['2025-11', '2025-12', '2026-01', '2026-02'])
  for (const s of lateA) targetMonthsByGroup.set(s.id, ['2025-11', '2025-12', '2026-01'])
  for (const s of lateB) targetMonthsByGroup.set(s.id, ['2025-11', '2025-12'])

  const rows = []
  let idx = 1

  let siblingLeft = 5
  let voucherLeft = 5

  for (const s of active) {
    const months = targetMonthsByGroup.get(s.id) || []
    const baseAmount = paymentAmount(s)

    for (const targetMonth of months) {
      const [y, m] = targetMonth.split('-').map(Number)
      const paymentDate = `${targetMonth}-${String(3 + ((idx % 6))).padStart(2, '0')}`
      const methods = ['계좌이체', '카드결제', '현금']
      let method = methods[idx % methods.length]
      const discounts = []

      if (siblingLeft > 0 && targetMonth === '2026-01') {
        discounts.push({ type: '형제자매', amount: 10000 })
        siblingLeft -= 1
      }

      if (voucherLeft > 0 && targetMonth === '2026-02') {
        discounts.push({ type: '스포츠바우처', amount: 10000 })
        method = '스포츠바우처'
        voucherLeft -= 1
      }

      const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0)

      rows.push({
        id: uuidFrom(0x4000, idx++),
        student_id: s.id,
        payment_date: paymentDate,
        target_month: `${y}-${String(m).padStart(2, '0')}`,
        amount: Math.max(baseAmount - discountTotal, 10000),
        method,
        discounts,
        memo: discounts.length ? '시뮬레이션 할인 적용' : '',
      })
    }
  }

  // 휴원/퇴원 일부 결제 이력
  for (const s of pausedWithdrawn.slice(0, 8)) {
    rows.push({
      id: uuidFrom(0x4000, idx++),
      student_id: s.id,
      payment_date: '2025-11-10',
      target_month: '2025-11',
      amount: paymentAmount(s),
      method: '계좌이체',
      discounts: [],
      memo: '휴/퇴원 이전 결제',
    })
  }

  return rows
}

function datesBetween(start, end) {
  const out = []
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  while (s <= e) {
    out.push(formatDate(s))
    s.setUTCDate(s.getUTCDate() + 1)
  }
  return out
}

function buildClassesAndAttendances(random, students, schedules) {
  const activeStudents = students.filter((s) => s.status === '재원')
  const activeSet = new Set(activeStudents.map((s) => s.id))

  const dates = datesBetween(START_DATE, END_DATE)
  const dayMap = new Map() // date -> weekday
  for (const d of dates) {
    const wk = new Date(`${d}T00:00:00Z`).getUTCDay()
    dayMap.set(d, wk)
  }

  const classKeySet = new Set()
  for (const sched of schedules) {
    if (!activeSet.has(sched.student_id)) continue
    for (const date of dates) {
      if (dayMap.get(date) === sched.weekday) {
        classKeySet.add(`${date}|${sched.time}|${sched.group_type}`)
      }
    }
  }

  // 체험 클래스: 2개월 동안 가끔 1~2건만 생성
  const trialClassSlots = [
    ['2026-01-18', '11:00', '체험'],
    ['2026-01-30', '16:00', '체험'],
    ['2026-02-08', '11:00', '체험'],
    ['2026-02-21', '14:00', '체험'],
    ['2026-02-27', '16:00', '체험'],
  ]
  for (const [d, t, g] of trialClassSlots) classKeySet.add(`${d}|${t}|${g}`)

  const classRows = []
  const classIdByKey = new Map()
  let classIdx = 1

  for (const key of [...classKeySet].sort()) {
    const [date, time, group_type] = key.split('|')
    const id = uuidFrom(0x5000, classIdx++)
    classRows.push({ id, branch_id: DEFAULT_BRANCH_ID, date, time, group_type })
    classIdByKey.set(key, id)
  }

  // 학생별 스케줄 인덱스
  const schedulesByStudent = new Map()
  for (const sched of schedules) {
    if (!schedulesByStudent.has(sched.student_id)) schedulesByStudent.set(sched.student_id, [])
    schedulesByStudent.get(sched.student_id).push(sched)
  }

  const attendanceRows = []
  let attIdx = 1

  for (const student of activeStudents) {
    const studentSchedules = schedulesByStudent.get(student.id) || []
    for (const sched of studentSchedules) {
      for (const date of dates) {
        if (dayMap.get(date) !== sched.weekday) continue
        const classKey = `${date}|${sched.time}|${sched.group_type}`
        const classId = classIdByKey.get(classKey)
        if (!classId) continue

        const r = random()
        let status = '출석'
        if (r < 0.70) status = '출석'
        else if (r < 0.85) status = '결석'
        else if (r < 0.95) status = '예정'
        else status = '출석'

        attendanceRows.push({
          id: uuidFrom(0x6000, attIdx++),
          student_id: student.id,
          class_id: classId,
          status,
          makeup_of_attendance_id: null,
          is_test: false,
          test_level: null,
          memo: '',
        })
      }
    }
  }

  // 결석 중 30건은 미처리 유지, 45건은 보강 연결(예정30/완료15)
  const absences = attendanceRows.filter((a) => a.status === '결석')
  if (absences.length < 75) {
    throw new Error(`결석 데이터가 부족합니다. generated=${absences.length}`)
  }

  const sortedByDate = [...attendanceRows].sort((a, b) => {
    const classA = classRows.find((c) => c.id === a.class_id)
    const classB = classRows.find((c) => c.id === b.class_id)
    return classA.date.localeCompare(classB.date)
  })

  const usedTargets = new Set()
  const linkSources = absences.slice(30, 75)

  function findMakeupTarget(source) {
    const sourceClass = classRows.find((c) => c.id === source.class_id)
    for (const cand of sortedByDate) {
      if (cand.student_id !== source.student_id) continue
      if (cand.id === source.id) continue
      if (cand.status === '결석') continue
      if (usedTargets.has(cand.id)) continue
      const candClass = classRows.find((c) => c.id === cand.class_id)
      if (candClass.date <= sourceClass.date) continue
      return cand
    }
    return null
  }

  let linkedScheduled = 0
  let linkedDone = 0

  for (let i = 0; i < linkSources.length; i++) {
    const source = linkSources[i]
    const target = findMakeupTarget(source)
    if (!target) continue
    target.makeup_of_attendance_id = source.id
    if (i < 30) {
      target.status = '보강예정'
      linkedScheduled += 1
    } else {
      target.status = '보강완료'
      linkedDone += 1
    }
    usedTargets.add(target.id)
  }

  // 레벨 테스트 기록 10건 (마지막 주)
  const studentMap = new Map(students.map((s) => [s.id, s]))
  const lastWeekCandidates = attendanceRows.filter((a) => {
    const cls = classRows.find((c) => c.id === a.class_id)
    if (cls.date < '2026-02-16' || cls.date > '2026-02-21') return false
    if (a.status !== '출석' && a.status !== '보강완료') return false
    const student = studentMap.get(a.student_id)
    if (!student || !student.current_level || student.current_level === 'GOLD') return false
    return true
  })

  for (const rec of shuffle(random, lastWeekCandidates).slice(0, 10)) {
    const student = studentMap.get(rec.student_id)
    rec.is_test = true
    rec.test_level = nextLevel(student.current_level)
  }

  const unresolvedAbsences = absences.slice(0, 30)

  return {
    classRows,
    attendanceRows,
    unresolvedAbsences,
    linkedScheduled,
    linkedDone,
    classIdByKey,
  }
}

function buildTrials(students, classIdByKey) {
  const trialPool = [
    '신유나', '김태호', '이하은', '박서준', '최예린', '정우진', '강지유', '윤도현', '서가은', '오민재',
    '정하연', '임시우', '한채린', '조도훈', '배소연', '권지후', '유승민', '장서우', '송유림', '신도윤'
  ]

  const slots = {
    planned: [
      ['2026-02-21', '14:00'],
      ['2026-02-27', '16:00'],
    ],
    noshow: [
      ['2026-01-18', '11:00'],
    ],
    unregistered: [
      ['2026-02-08', '11:00'],
    ],
    registered: [
      ['2026-01-30', '16:00'],
    ],
  }

  const byStatus = [
    ...slots.planned.map((x) => ({ status: '예정', slot: x })),
    ...slots.noshow.map((x) => ({ status: '노쇼', slot: x })),
    ...slots.unregistered.map((x) => ({ status: '미등록', slot: x })),
    ...slots.registered.map((x) => ({ status: '등록', slot: x })),
  ]

  const trialStudents = students.filter((s) => s.status === '체험')
  const rows = []

  for (let i = 0; i < byStatus.length; i++) {
    const item = byStatus[i]
    const [date, time] = item.slot
    const classId = classIdByKey.get(`${date}|${time}|체험`) || null
    const mappedStudent = item.status === '등록' ? trialStudents[i % trialStudents.length] : null

    rows.push({
      id: uuidFrom(0x7000, i + 1),
      branch_id: DEFAULT_BRANCH_ID,
      name: trialPool[i],
      phone: randomPhone(900 + i),
      gender: i % 2 === 0 ? '남' : '여',
      grade: i % 3 === 0 ? '초3' : i % 3 === 1 ? '초5' : '중1',
      status: item.status,
      class_id: classId,
      student_id: mappedStudent ? mappedStudent.id : null,
      note: item.status === '노쇼' ? '연락 두절' : item.status === '미등록' ? '상담 후 보류' : '',
      created_at: `${addDays(date, -2)}T09:00:00Z`,
    })
  }

  return rows
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local')
  const env = parseEnvFile(envPath)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKey = serviceRoleKey || anonKey

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL/KEY를 찾을 수 없습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY(권장) 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요.')
  }

  if (!serviceRoleKey) {
    console.warn('[경고] SUPABASE_SERVICE_ROLE_KEY가 없어 anon key를 사용합니다. RLS 정책에 따라 쓰기 실패 가능성이 있습니다.')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const random = mulberry32(20260221)

  console.log('--- 시뮬레이션 시드 시작 ---')

  // branch 보장 (유지)
  {
    const { error } = await supabase
      .from('branches')
      .upsert([{ id: DEFAULT_BRANCH_ID, name: BRANCH_NAME }], {
        onConflict: 'id',
        ignoreDuplicates: true,
      })
    if (error) throw new Error(`branches upsert failed: ${error.message}`)
  }

  // 초기화: 역방향 삭제
  const deleteOrder = [
    'attendance',
    'trial_reservations',
    'classes',
    'payments',
    'student_levels',
    'student_schedules',
    'students',
  ]

  for (const table of deleteOrder) {
    await deleteAll(supabase, table)
    console.log(`삭제 완료: ${table}`)
  }

  const { students, scenarios } = buildStudents(random)
  const schedules = buildSchedules(random, students)
  const levelRows = buildLevelHistories(random, students, scenarios)
  const paymentRows = buildPayments(random, students)
  const {
    classRows,
    attendanceRows,
    unresolvedAbsences,
    linkedScheduled,
    linkedDone,
    classIdByKey,
  } = buildClassesAndAttendances(random, students, schedules)
  const trialRows = buildTrials(students, classIdByKey)

  const classSizeMap = new Map()
  for (const a of attendanceRows) {
    classSizeMap.set(a.class_id, (classSizeMap.get(a.class_id) || 0) + 1)
  }
  const regularClassSizes = classRows
    .filter((c) => c.group_type !== '체험')
    .map((c) => classSizeMap.get(c.id) || 0)
    .filter((n) => n > 0)

  const minClassSize = regularClassSizes.length ? Math.min(...regularClassSizes) : 0
  const maxClassSize = regularClassSizes.length ? Math.max(...regularClassSizes) : 0

  if (minClassSize < 1 || maxClassSize > 6) {
    throw new Error(`반 정원 제약 위반: min=${minClassSize}, max=${maxClassSize}`)
  }

  for (const c of classRows) {
    const hour = Number(c.time.slice(0, 2))
    const weekday = new Date(`${c.date}T00:00:00Z`).getUTCDay()
    if (hour === 12 || hour === 13) {
      throw new Error(`금지 시간(12~13시) 수업 생성: ${c.date} ${c.time}`)
    }
    if (weekday >= 1 && weekday <= 5) {
      if (hour < 14 || hour > 20) {
        throw new Error(`평일 시간 제약 위반: ${c.date} ${c.time}`)
      }
    } else {
      if (hour < 10 || hour > 18) {
        throw new Error(`주말 시간 제약 위반: ${c.date} ${c.time}`)
      }
    }
  }

  // 삽입 순서
  const studentInsertRows = students.map(({ key, ...row }) => row)
  const studentsInserted = await insertBatched(supabase, 'students', studentInsertRows)
  const schedulesInserted = await insertBatched(supabase, 'student_schedules', schedules)
  const levelsInserted = await insertBatched(supabase, 'student_levels', levelRows)
  const paymentsInserted = await insertBatched(supabase, 'payments', paymentRows)
  const classesInserted = await insertBatched(supabase, 'classes', classRows, {
    upsert: true,
    onConflict: 'branch_id,date,time,group_type',
    ignoreDuplicates: true,
  })
  const attendanceInserted = await insertBatched(supabase, 'attendance', attendanceRows)
  const trialsInserted = await insertBatched(supabase, 'trial_reservations', trialRows)

  const counts = students.reduce((acc, s) => {
    acc.total += 1
    if (s.status === '재원') acc.active += 1
    if (s.status === '휴원') acc.paused += 1
    if (s.status === '퇴원') acc.withdrawn += 1
    if (s.status === '체험') acc.trial += 1
    return acc
  }, { total: 0, active: 0, paused: 0, withdrawn: 0, trial: 0 })

  const paymentsFeb = paymentRows.filter((p) => p.target_month === '2026-02')
  const paidActiveFeb = new Set(
    paymentsFeb
      .map((p) => students.find((s) => s.id === p.student_id))
      .filter((s) => s && s.status === '재원')
      .map((s) => s.id)
  )

  const trialToday = trialRows.filter((t) => t.status === '예정' && classRows.find((c) => c.id === t.class_id)?.date === TODAY)

  const testAttendances = attendanceRows.filter((a) => a.is_test)

  console.log('--- 시뮬레이션 시드 완료 ---')
  console.log(`학생: ${studentsInserted}명 (전체:${counts.total}, 재원:${counts.active}, 휴원:${counts.paused}, 퇴원:${counts.withdrawn}, 체험:${counts.trial})`)
  console.log(`시간표: ${schedulesInserted}건`)
  console.log(`레벨이력: ${levelsInserted}건`)
  console.log(`결제: ${paymentsInserted}건 (2026-02 재원 납부:${paidActiveFeb.size}, 미납:${counts.active - paidActiveFeb.size})`)
  console.log(`수업: ${classesInserted}건`)
  console.log(`반 정원(정규): 최소 ${minClassSize}명 / 최대 ${maxClassSize}명`)
  console.log(`출석: ${attendanceInserted}건 (미처리 결석:${unresolvedAbsences.length}, 보강예정 연결:${linkedScheduled}, 보강완료 연결:${linkedDone}, is_test:${testAttendances.length})`)
  console.log(`체험예약: ${trialsInserted}건 (오늘 ${TODAY} 예정:${trialToday.length})`)
}

main().catch((err) => {
  console.error('[seed] 실패:', err.message)
  process.exit(1)
})
