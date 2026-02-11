# 몽키즈 클라이밍 - 개발 로그

포트폴리오용 개발 과정 기록입니다.

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
