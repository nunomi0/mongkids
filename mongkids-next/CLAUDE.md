# CLAUDE.md

이 파일은 이 저장소에서 다음 세션이 빠르게 맥락을 잡을 수 있도록 현재 작업 기준을 정리합니다.

## 프로젝트 개요

몽키즈 클라이밍 학원 관리 시스템입니다. 학생, 수업, 출결, 결제, 보강, 체험 예약을 한 곳에서 관리하는 단일 관리자용 도구입니다. 모든 UI 문구와 문서는 한국어를 기준으로 유지합니다.

## 자주 쓰는 명령어

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
npm run seed
```

테스트 프레임워크는 아직 없습니다. 검증 기본값은 타입 체크와 수동 QA입니다.

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Supabase PostgreSQL
- Tailwind CSS + shadcn/ui
- 경로 별칭 `@/*`

## 구조 요약

- `app/(dashboard)/` — 대시보드 공통 레이아웃을 쓰는 화면
- `components/` — 공용 화면 컴포넌트
- `components/ui/` — shadcn/ui 프리미티브
- `lib/queries/` — 도메인별 데이터 접근 로직
- `lib/excel/` — 회원명단/출석표 엑셀 파싱과 생성
- `types/student.ts` — 학생, 결제, 출결, 체험 등 도메인 타입
- `supabase/migrations/001_initial_schema.sql` — 초기 스키마

## 현재 구현에서 중요한 정책

- 학생 기본 현재 레벨은 `NONE(null)`입니다.
- 현재 레벨은 최고 급수가 아니라 가장 최근 취득일 기준입니다.
- 시간표 수정 시 미래 `예정` 출석만 새 시간표 기준으로 재조정합니다.
- `출석`, `결석`, `보강예정`, `보강완료` 기록은 유지합니다.
- 같은 학생의 같은 `YYYY-MM` 결제는 여러 건 허용합니다.
- 같은 월 추가 결제는 5주차 수업, 특강, 추가 등록 상황을 포함합니다.

## 주요 파일

| 영역 | 파일 |
|------|------|
| 학생 목록 | `app/(dashboard)/students/page.tsx`, `app/(dashboard)/students/students-client.tsx` |
| 학생 상세 | `app/(dashboard)/students/detail/index.tsx` |
| 수업 관리 | `app/(dashboard)/classes/daily/page.tsx`, `app/(dashboard)/classes/weekly/page.tsx` |
| 체험 관리 | `app/(dashboard)/trials/page.tsx`, `app/(dashboard)/trials/trials-client.tsx` |
| 데이터 관리 | `app/(dashboard)/settings/page.tsx` |
| 쿼리 진입점 | `lib/queries.ts`, `lib/queries/index.ts` |
| 학생/결제/레벨 쿼리 | `lib/queries/students.ts`, `lib/queries/payments.ts`, `lib/queries/levels.ts` |
| 수업/체험/대시보드/엑셀 쿼리 | `lib/queries/classes.ts`, `lib/queries/trials.ts`, `lib/queries/dashboard.ts`, `lib/queries/excel.ts` |

## 문서 역할

- `README.md` — 프로젝트 입구 문서
- `docs/OPERATIONS_POLICY.md` — 학원 운영 정책 기준
- `docs/FEATURES.md` — 현재 구현과 구조 설명
- `docs/QA-SIMULATION.md` — 수동 QA 시나리오
- `docs/DEVLOG.md` — 작업 이력

정책이 먼저이고 구현이 뒤입니다. 정책 변경은 `OPERATIONS_POLICY`부터 수정하고, 구현 변경은 `FEATURES`와 `DEVLOG`를 함께 갱신합니다.

## 작업 규칙

- 새 문서와 수정 문서는 한국어로 작성합니다.
- 조건부 className 병합에는 `@/lib/utils`의 `cn()`을 사용합니다.
- 화면 흐름은 새 페이지보다 모달 중심 CRUD를 우선합니다.
- 커밋 메시지는 `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` 형식을 사용합니다.
- 기능 단위로 커밋을 남깁니다.
- 작업이 끝나면 `docs/DEVLOG.md`를 갱신합니다.
