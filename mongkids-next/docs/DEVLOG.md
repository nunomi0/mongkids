# 몽키즈 클라이밍 - 개발 로그

포트폴리오용 개발 과정 기록입니다.

---

## [2026-02-17] 세션 4: Supabase 연동 완료 — 모든 더미 데이터 제거

### 작업 내용

1. **타입 에러 일괄 수정 (37개)**
   - 이전 세션에서 변경한 타입(`AttendanceKind` 제거, `id: number→string`, `AttendanceRecord` 구조 변경)에 맞게 모든 컴포넌트 업데이트
   - `TrialReservation`에 `trial_date`/`trial_time` 필드 추가 (classes 테이블 조인으로 제공)
   - `fetchTrials`에 classes 테이블 조인 추가

2. **학생 추가 모달(`add-class-student-modal.tsx`) Supabase 연동**
   - `SEARCHABLE_STUDENTS` (하드코딩 8명) → `fetchSearchableStudents()` API 호출
   - `STUDENT_SCHEDULES` + `generateMonthlyAttendance()` → `fetchMonthlyAttendance()` API 호출
   - 정규/보강 추가 시 `upsertAttendance()`로 출석 레코드 DB 생성

3. **주차별 수업 페이지(`weekly/page.tsx`) Supabase 연동**
   - `DUMMY_STUDENTS` + `generateWeekClasses()` 완전 제거
   - `fetchClassesByWeek()` → attendanceMap 포함 반환하도록 확장 (daily 패턴과 동일)
   - 출석 토글/전체 출석/메모 모두 API 연동 (`upsertAttendance`, `markAllPresent`, `updateAttendanceMemo`)
   - 로딩 상태 + 빈 주 상태 UI 추가

4. **`fetchClassesByWeek` 쿼리 개선**
   - 기존: `ClassItem[]` 반환 (학생 목록만)
   - 변경: `{ classes, attendanceMap }` 반환 (출석 상태 + 메모 포함)

### 의사결정

- 주차별/일별 페이지 모두 동일한 패턴(fetchData → classes + attendanceMap → 로컬 state → API 호출)으로 통일
- 체험 학생 등록은 아직 로컬 추가만 수행 (students 테이블 연동은 추후)

### 결과

- **더미 데이터 사용 컴포넌트: 0개** (전체 Supabase 연동 완료)
- 타입 에러 0개, 빌드 성공

---

## [2026-02-11] 세션 1: 수업/체험 관리 기능 개선 및 체험 관리 구현

### 작업 내용

1. **주차별 수업 추가 시간 드롭다운 제거**
   - 이미 시간대를 알고 있는 상태에서 수업을 추가하므로 불필요한 시간 선택 UI 제거
   - `selectedTime` 상태 변수 제거, `time` prop을 직접 사용

2. **그룹 타입 중복 방지 로직 구현**
   - 의사결정: Supabase(백엔드) vs 프론트엔드 → **프론트엔드** 선택
     - 이유: 같은 시간대 기존 그룹만 필터링하면 되는 간단한 로직, Supabase 미연동 상태
   - `AddClassModal`에 `existingGroupTypes` prop 추가
   - 이미 존재하는 그룹 타입은 드롭다운에서 제외, 모든 일반 타입 존재 시 버튼 비활성화

3. **일별 수업 학생 추가 검색 결과 상세 정보 표시**
   - 기존: 이름 + 학년만 표시
   - 변경: 테이블 형태로 이름, 성별, 학년, 레벨, 등록반, 수업시간, 전화번호, 상태 모두 표시
   - 모달 너비 420px → 600px로 확대

4. **일별 수업 카드 전체 출석 버튼 추가**
   - `ClassDetailCard`에 `onMarkAllPresent` prop 추가
   - 모든 학생이 이미 출석이면 버튼 자동 숨김
   - `TimeSlotSection` → `ClassDetailCard`로 prop 전달 체인 구현

5. **학생 추가/수정 모달 시간 드롭다운 정렬 수정**
   - 문제: 드롭다운 3개(요일, 시간, 그룹)가 고정 너비(`w-20`, `w-24`, `w-24`)로 왼쪽 쏠림
   - 해결: `flex-1 min-w-0`으로 변경하여 균등 분배, 삭제 버튼 `shrink-0`

6. **체험 관리 탭 구현**
   - `mongkids-fe`의 체험 관리 기능 분석 후 구현
   - 새 타입: `TrialStatus`, `TrialReservation`
   - 컴포넌트: `TrialsClient`, `TrialsTable`, `AddTrialModal`, `TrialDetailModal`, `TrialStatusBadge`
   - 기능: 목록 조회(검색/필터), 통계 카드, 예약 등록, 상세 조회/편집/삭제

### 의사결정 기록
- 그룹 타입 중복 방지: 프론트에서 처리 (Supabase 연동 전이므로)
- 체험 관리: `mongkids-fe` 참고하되 Next.js/shadcn/ui 패턴에 맞게 재구현
- 수업 메모: 구현 방법 논의 필요 (아래 제안 참고)

### 수업 메모 UI 제안 (미구현)
일별 수업 카드에서 학생별 수업 메모 표시 방법:
- **방법 A**: 학생 이름 옆 작은 메모 아이콘, 호버 시 툴팁으로 표시
- **방법 B**: 학생 행 아래 접히는(collapsible) 메모 영역
- **방법 C**: 학생 행 클릭 시 인라인 확장으로 메모 표시/편집

### 기술 스택
- Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui

---

## [2026-02-12] 세션 2: Supabase 데이터베이스 스키마 설계

### 작업 내용

1. **Supabase 초기 스키마 설계 및 migration 파일 작성**
   - `supabase/migrations/001_initial_schema.sql` 생성
   - 9개 테이블: branches, students, student_schedules, student_levels, payments, classes, attendance, trial_reservations, level_test_configs
   - 멀티 지점 지원: 단일 DB + `branch_id`로 약 24개 지점 구분
   - `branch_id` 직접 배치: students, classes, trial_reservations (3개)
   - 나머지 테이블은 FK를 통해 간접 참조

2. **보강 상태 모델링**
   - attendance.status에 5가지 상태: 예정, 출석, 결석, 보강예정, 보강완료
   - `makeup_of_attendance_id` self-referencing FK로 보강 추적
   - 기존 `kind` (정규/보강) 필드 제거, status로 통합

3. **레벨 테스트 추적 간소화**
   - student_tests 테이블 제거
   - student_levels의 `acquired_date`로 합격 관리 (null = 미취득, 날짜 = 합격일)
   - level_test_configs 테이블로 레벨별 테스트 주기 설정 (전체 지점 공통)

4. **기타 설계 결정**
   - class_types 테이블 제거 → students에 category + sessions_per_week 직접 저장
   - student_contacts 제거 → students.phone으로 단순화
   - payments.discounts를 JSONB 배열로 저장
   - updated_at 자동 갱신 트리거 (students, payments)

### 의사결정 기록
- 멀티 지점: 별도 DB가 아닌 단일 DB + branch_id 방식 선택 (관리 용이성)
- RLS: 현재 비활성화, 지점별 데이터 격리 필요 시 추후 추가
- 시드 데이터: level_test_configs만 (테스트 주기 기본값)

### 기술 스택
- Supabase (PostgreSQL), SQL migration
