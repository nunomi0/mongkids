# 몽키즈 클라이밍 - 개발 로그

개발 과정 기록입니다.

---

## [2026-03-12] 세션 23: 스크립트 정리

### 작업 내용

1. **불필요한 실행 보조 스크립트 제거**
   - `scripts/start-with-port.js` 삭제
   - `npm start`를 `next start`로 복원

2. **ExcelJS 패치 스크립트 제거**
   - `scripts/patch-exceljs.js` 삭제
   - `postinstall` 훅 제거
   - 엑셀 전처리 코드는 `lib/excel/utils.ts` 경로로 유지

3. **시드 구조 단순화**
   - `scripts/seed-simulation.js`를 `scripts/seed.js`로 변경
   - `scripts/seed.sql` 삭제
   - `npm run seed` 명령 추가
   - README와 QA 문서의 시드 실행 명령 수정

4. **의존성 명시**
   - `jszip`을 직접 의존성으로 추가
   - 전이 의존성에 기대지 않도록 정리

### 의사결정

- 포트 우회 로직은 기본 실행 규칙보다 우선하지 않음
- 라이브러리 패치는 설치 훅보다 애플리케이션 코드 안의 전처리로 관리
- 시드는 대표 명령 하나로 통일

---

## [2026-03-12] 세션 22: 운영 정책 문체 정리

### 작업 내용

1. **운영 정책 문장 전면 정리**
   - `docs/OPERATIONS_POLICY.md`를 설명형 문장 대신 정책 선언형 문장으로 재작성
   - `-이다` 문체로 통일

2. **문체 재조정**
   - `docs/OPERATIONS_POLICY.md`를 `-입니다`, `-합니다` 문체로 수정
   - `FEATURES.md`와 비슷한 읽기 흐름으로 정리

3. **정책 값 명시**
   - 학생 상태, 출결 상태, 체험 상태, 레벨명, 보강 가능 횟수, 결제월 형식을 직접 표기
   - 장황한 설명을 줄이고 기준값 중심으로 정리

4. **정책 범위 재정리**
   - 운영 목적을 프로젝트 궁극 목적 중심 3문장으로 축소
   - 구현 상세처럼 보이는 출결 처리, 출결 메모, 보강 가능 시간, 체험 등록 문장을 정책 중심 문장으로 재작성

### 의사결정

- 운영 정책 문서는 배경 설명보다 기준값과 규칙을 우선
- 부정형 설명보다 확정형 문장을 사용

---

## [2026-03-12] 세션 21: 마케팅 보조 문서 정리

### 작업 내용

1. **마케팅 컨텍스트 문서 제거**
   - `.agents/product-marketing-context.md` 삭제
   - 비즈니스 로직, 구현, 검증과 직접 관련 없는 보조 문서를 정리

2. **에이전트 안내 문서 정리**
   - `AGENTS.md`에서 삭제한 문서 참조 제거
   - 마케팅 스킬 목록에서 `product-marketing-context` 항목 제거

### 의사결정

- 저장소 내부 문서는 실제 프로젝트 운영과 개발에 필요한 범위로 유지
- 마케팅 보조 메모는 필요할 때 별도로 만들고 기본 구조에는 두지 않음

---

## [2026-03-12] 세션 20: README 재작성

### 작업 내용

1. **README 전면 정리**
   - `README.md`를 현재 프로젝트 구조에 맞게 다시 작성
   - 프로젝트 목적, 주요 문서, 실행 방법, 데이터 준비, 라우트 구조 중심으로 재구성

2. **문서 역할 반영**
   - 운영 기준은 `OPERATIONS_POLICY`
   - 개발 구현 설명은 `FEATURES`
   - 검증 흐름은 `QA-SIMULATION`
   - 개발 이력은 `DEVLOG`
   - 위 기준이 첫 화면에서 바로 보이도록 링크 정리

### 의사결정

- README는 세부 기능 명세서가 아니라 프로젝트 입구 문서로 유지
- 오래된 타입 정의나 과거 구조 설명은 제거하고, 현재 필요한 실행 정보와 문서 안내를 우선

---

## [2026-03-12] 세션 19: 로그 정리와 커밋 기록 자동화 기준 설정

### 작업 내용

1. **개발 로그 정리**
   - 프로젝트와 직접 관련 없는 과거 로그 항목을 제거
   - 운영 정책, 기능 구현, QA, 데이터 관리 흐름만 남기도록 정리

2. **커밋 기록 자동화 방향 정리**
   - 자동 커밋 대신 기능 단위 커밋 후보와 커밋 메시지를 제안하는 방식으로 자동화 기준 설정
   - 섞인 변경이 많은 워크트리에서도 잘못된 커밋을 만들지 않도록 안전성을 우선

### 의사결정

- `DEVLOG`는 프로젝트 개발 이력만 남기고, 프로젝트 바깥의 작업 내역은 제외
- 커밋 자동화는 실제 커밋보다 "기능별 분리 제안"이 먼저여야 커밋 히스토리 품질이 좋아짐

---

## [2026-03-12] 세션 18: 운영 정책 문서와 개발 문서 역할 분리

### 작업 내용

1. **운영 정책 문서 재작성**
   - `docs/OPERATIONS_POLICY.md`를 비개발자용 문서로 다시 정리
   - 학원 원장, 강사, 학부모가 읽어도 이해할 수 있게 운영 원칙과 학원 비즈니스 로직만 남김

2. **개발 문서 역할 명확화**
   - `docs/FEATURES.md` 상단에 문서 목적, 대상 독자, 사용 원칙을 추가
   - 운영 정책은 `OPERATIONS_POLICY`, 구현 상세는 `FEATURES`로 분리

### 의사결정

- 운영 정책 문서에는 DB, 테스트, 구현 차이, 리뷰 기준 같은 개발자 관점 내용을 넣지 않음
- 비즈니스 로직과 구현 문서를 섞으면 원장님이나 운영 담당자가 기준 문서로 보기 어려우므로 문서 역할을 명확히 분리

---

## [2026-03-12] 세션 9: 학원 운영 요구사항 기준서 초안 작성

### 작업 내용

1. **운영 로직 기준 문서 작성**
   - `docs/ACADEMY_OPERATIONS_REQUIREMENTS.md` 생성
   - 학생, 수업, 출석, 보강, 레벨, 결제, 체험, 엑셀 업로드 로직을 요구사항 형태로 정리

2. **리뷰/테스트 기준 추가**
   - 전역 불변식, 코드 리뷰 체크리스트, 최소 테스트 시나리오를 같이 문서화

3. **회색지대 명시**
   - 이름 기반 매칭, 휴원 학생 처리, 중복 결제 정책 차이, 체험→학생 전환 미연결 등 현재 구현상 애매한 정책을 별도 섹션으로 분리

### 의사결정

- 기능 소개 문서만으로는 리뷰 기준이 부족하므로, "현재 구현을 읽어낸 운영 규칙"을 요구사항 형식으로 재작성
- 이상적인 정책과 현재 구현을 혼동하지 않도록, 문서 초반에 "현재 코드 기준 1차 초안"이라는 성격을 명시
- 이후 테스트 자동화나 수동 QA로 이어질 수 있도록 최소 시나리오를 같이 포함

---

## [2026-03-12] 세션 10: 사용자 메모 기반 운영 로직 추출

### 작업 내용

1. **사용자 서술 기반 로직 문서화**
   - `docs/ACADEMY_OPERATION_LOGIC_FROM_NOTES.md` 생성
   - 개발 동기, 현재 업무 방식, 필요한 기능 설명에서 실제 정책과 계산 로직을 추출

2. **코드 기준 문서와 분리**
   - 현재 구현 기준 요구사항 문서와 혼동되지 않도록 사용자 의도 기준 문서로 분리

3. **검토 질문 정리**
   - 결제, 보강, 체험, 엑셀 정책에서 아직 확정되지 않은 질문을 문서 하단에 정리

### 의사결정

- 사용자의 서술에는 구현 사실과 희망 정책이 섞여 있으므로, 현재 코드 기준 문서와 별도로 관리
- 이후 코드 리뷰와 테스트는 "사용자 의도 기준"과 "현재 구현 기준"을 비교하는 방식으로 진행하는 것이 명확함

---

## [2026-03-12] 세션 11: 레벨 계산 정책 정정

### 작업 내용

1. **레벨 정책 문서 수정**
   - `docs/ACADEMY_OPERATIONS_REQUIREMENTS.md`의 현재 레벨 계산 기준을 "최고 급수"에서 "가장 최근 취득일" 기준으로 수정
   - 다운그레이드 가능 정책과 예시를 추가

2. **사용자 의도 문서 보강**
   - `docs/ACADEMY_OPERATION_LOGIC_FROM_NOTES.md`에 최근 취득일 기준 레벨 판단 정책 추가

3. **불일치 항목 명시**
   - 현재 코드가 최고 급수 기준으로 계산하고 있어 사용자 정책과 어긋난다는 점을 요구사항 문서에 명시

### 의사결정

- 레벨은 선형 승급 모델이 아니라 운영상 재조정 가능한 상태값으로 취급
- 따라서 `current_level`은 "최고 이력"이 아니라 "가장 최근에 확정된 이력"을 반영해야 함

---

## [2026-03-12] 세션 12: 학생 기본 레벨 정책 정정

### 작업 내용

1. **학생 생성 기본값 수정**
   - `lib/queries.ts`에서 학생 생성 시 기본 `current_level`을 `WHITE`에서 `null`로 변경
   - 초기 레벨 이력 생성 시 `WHITE`를 포함한 모든 급수를 미취득 상태로 초기화

2. **엑셀 신규 생성 로직 수정**
   - 엑셀에서 현재 레벨 정보가 없을 경우 신규 학생을 `null` 레벨로 생성하도록 수정

3. **문서 수정**
   - 요구사항 문서와 사용자 의도 문서에 "학생 생성 직후 기본 레벨은 NONE" 정책 반영
   - 테스트 시나리오를 `WHITE` 기본값 기준에서 `NONE(null)` 기준으로 수정

### 의사결정

- `WHITE`도 취득 이벤트가 있어야 부여되는 급수로 취급
- 따라서 학생 생성 자체와 급수 취득은 분리된 개념으로 유지

---

## [2026-03-12] 세션 13: 시간표 수정 반영 정책 정정

### 작업 내용

1. **시간표 수정 정책 문서 수정**
   - `docs/ACADEMY_OPERATIONS_REQUIREMENTS.md`에서 시간표 수정 시 모든 수업을 교체하는 표현을 제거
   - 이미 `출석`/`결석` 처리된 수업은 유지하고, `예정` 수업만 새 시간표 기준으로 재조정해야 한다는 정책 반영

2. **사용자 의도 문서 보강**
   - `docs/ACADEMY_OPERATION_LOGIC_FROM_NOTES.md`에 시간표 수정 영향 범위를 예정 수업으로 제한하는 정책 추가

3. **현재 구현 불일치 명시**
   - 현재 코드는 `student_schedules`만 교체하고 수업/출석을 예정 수업 기준으로 동기화하지 않는다는 점을 요구사항 문서에 추가

### 의사결정

- 시간표 수정은 과거 이력 보존이 핵심이므로, 확정된 출결 데이터는 절대 자동 수정 대상이 아니어야 함
- 실제 반영 대상은 미래 또는 미확정인 예정 수업으로 제한

---

## [2026-03-12] 세션 14: 체험 등록에서 학생 등록 흐름 연결

### 작업 내용

1. **체험 상세 모달 개선**
   - 체험 예약 상태를 `등록`으로 저장하면 학생 등록 모달이 자동으로 열리도록 연결

2. **학생 등록 모달 프리필 지원**
   - 이름, 전화번호, 성별, 카테고리 기본값을 외부에서 주입할 수 있게 수정

3. **체험→학생 전환 UX 보강**
   - 체험 예약 정보 일부를 학생 등록 화면으로 넘겨 수기 입력량을 줄임

### 의사결정

- 체험 예약을 `등록`으로 바꾸는 순간 사용자가 다음 단계로 바로 넘어가야 하므로, 별도 네비게이션보다 모달 연동이 빠름
- 학생 생성 자체는 여전히 사용자의 최종 저장을 거치게 두어, 필수 정보 보완 여지를 유지

---

## [2026-03-12] 세션 15: 운영 정책 기준서 통합

### 작업 내용

1. **기준 문서 통합**
   - `docs/OPERATIONS_POLICY.md` 생성
   - 운영 목적, 도메인, 정책, 구현 차이, 리뷰 기준, 테스트 기준을 한 문서에 통합

2. **문서 체계 정리**
   - `docs/ACADEMY_OPERATIONS_REQUIREMENTS.md`와 `docs/ACADEMY_OPERATION_LOGIC_FROM_NOTES.md`를 보조 문서로 재정의
   - 상단에 공식 기준 문서 안내 추가

### 의사결정

- 기존 문서들은 역할이 겹치고 기준 문서 역할을 못 하고 있어, 정책을 한 문서로 승격하는 방식으로 재구성
- 새 문서는 "정책", "현재 구현", "미결 항목", "검증 기준"을 한 번에 담아 실제 기준서 역할을 하도록 설계

---

## [2026-03-12] 세션 16: 중복 운영 문서 정리

### 작업 내용

1. **중복 초안 문서 제거**
   - `docs/ACADEMY_OPERATIONS_REQUIREMENTS.md` 삭제
   - `docs/ACADEMY_OPERATION_LOGIC_FROM_NOTES.md` 삭제

2. **기준 문서 정리**
   - `docs/OPERATIONS_POLICY.md`에서 삭제된 초안 문서 링크 제거

### 의사결정

- 운영 정책 기준은 `docs/OPERATIONS_POLICY.md` 하나로 유지
- 초안 문서 두 개는 역할이 완전히 겹쳐 혼선을 만들므로 보존 가치보다 정리 이점이 큼

---

## [2026-02-18] 세션 6: 엑셀 업로드/다운로드 기능 구현

### 작업 내용

1. **엑셀 업로드/다운로드 기능 전체 구현 (`/settings`)**
   - `lib/excel/utils.ts` — 공통 유틸 (Excel serial date, 시간 분수, 셀 배경색, 수업시간 파싱, 등급 매핑 등)
   - `lib/excel/member-parser.ts` — 등록회원명단 엑셀 파싱 (월별 시트 처리, 이름+생년월일 키)
   - `lib/excel/member-generator.ts` — 회원명단 엑셀 생성 (원본 형식 재현)
   - `lib/excel/attendance-parser.ts` — 출석표 엑셀 파싱 (요일별 시트, 날짜 컬럼 매핑, 셀 색상 기반 출석 판별)
   - `lib/excel/attendance-generator.ts` — 출석표 엑셀 생성 (요일별 시트, 출석/결석 셀 색상 적용)

2. **DB 쿼리 추가 (`lib/queries.ts`)**
   - `upsertStudentsFromExcel()` — 학생 bulk upsert (이름+생년월일 매칭, 스케줄/레벨/결제 포함)
   - `upsertAttendanceFromExcel()` — 수업+출석 bulk upsert
   - `fetchAllStudentsForExport()` — 회원명단 다운로드용 전체 조회
   - `fetchAttendanceForExport()` — 출석표 다운로드용 기간별 조회

3. **설정 페이지 UI**
   - `settings/page.tsx` — 서버 컴포넌트
   - `settings/settings-client.tsx` — 클라이언트 래퍼
   - `settings/member-upload-section.tsx` — 회원명단 업로드/다운로드 (파일선택, 결과 표시)
   - `settings/attendance-upload-section.tsx` — 출석표 업로드/다운로드 (연도/월 범위 선택)

4. **사이드바 업데이트 (`components/app-sidebar.tsx`)**
   - "데이터 관리" 메뉴 추가 (데이터베이스 아이콘)

### 의사결정
- `exceljs` 라이브러리 선택: 셀 배경색 읽기/쓰기 지원이 필수 (노란색=출석, 회색=결석)
- 회원 중복 판별은 이름+생년월일 조합으로 결정 (동명이인 대응)
- 결제 데이터는 같은 학생+target_month 조합이 이미 있으면 스킵 (중복 방지)
- 출석표 업로드 시 학생 이름으로 DB 조회 (사전에 회원명단 업로드 필요)

---

## [2026-02-17] 세션 5: 메인 대시보드 구현 및 리디자인

### 작업 내용

1. **메인 대시보드 페이지 구현 (`/`)**
   - `dashboard-client.tsx` 클라이언트 컴포넌트 신규 생성
   - 상단 요약 카드 4개: 전체 학생, 오늘 출석, 오늘 수업, 이번 달 미결제
   - 하단 좌측 (2/3):
     - **레벨 테스트 대상자**: `level_test_configs` 기반으로 테스트 시기가 된 학생 테이블 (이름/학년/현재→다음 레벨/경과 개월)
     - **미처리 보강**: 결석 후 보강 미완료 학생 목록 (최근 3개월, 결석 날짜/시간 표시)
   - 하단 우측 (1/3):
     - 오늘의 체험: 오늘 예약된 체험자 목록
     - 미결제 학생: 재원 학생 중 해당 월 미결제
     - **학생 분포**: 카테고리별/레벨별 구성 뱃지
     - **최근 변동**: 30일 내 신규 등록 + 레벨 승급 타임라인

2. **대시보드용 쿼리 함수 7개 추가 (`lib/queries.ts`)**
   - `fetchStudentStatusCounts()` — 학생 상태별 카운트
   - `fetchTodayTrials(date)` — 해당 날짜 체험 예약
   - `fetchUnpaidStudents(targetMonth)` — 미결제 학생
   - `fetchLevelTestCandidates(yearMonth)` — 레벨 테스트 대상자 (students + student_levels + level_test_configs 조인)
   - `fetchPendingMakeups()` — 미처리 보강 (attendance 결석 + 보강 매칭)
   - `fetchStudentDistribution()` — 카테고리/레벨 분포
   - `fetchRecentChanges()` — 최근 등록 + 레벨 승급

3. **CLAUDE.md 업데이트**
   - 기술 스택에 Supabase 추가
   - 기존 더미 데이터 중심 문구를 "Supabase 전체 연동 완료" 상태에 맞게 갱신
   - 데이터베이스 아키텍처 설명 추가
   - 주요 파일 참고 섹션에 대시보드, DB 쿼리, DB 스키마 추가

### 의사결정

- "오늘의 수업" 섹션 제거: `/classes/daily`와 중복되므로 학원 운영 특화 위젯으로 교체
- 레벨 테스트 대상자: `level_test_configs` 테이블의 `required_months`와 `student_levels.acquired_date`를 비교하여 자동 계산
- 미처리 보강: `attendance`의 self-referencing FK(`makeup_of_attendance_id`)로 보강 완료 여부 판별
- 학생 분포/최근 변동: 컴팩트한 우측 카드로 배치

### 결과

- 대시보드 구현 완료 (미구현 목록에서 제거)
- 타입 에러 0개, 빌드 성공

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
