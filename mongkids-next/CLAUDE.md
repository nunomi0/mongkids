# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

몽키즈(Mongkids) 클라이밍 학원 관리 시스템. Single-user admin tool for managing students, payments, levels, and classes at a climbing academy. All UI text is in Korean.

## Commands

```bash
npm run dev        # Development server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type check without emitting
```

No test framework is configured.

## Tech Stack

- Next.js 16 (App Router) with React 19, TypeScript (strict mode)
- Tailwind CSS with `tailwindcss-animate` plugin
- shadcn/ui (new-york style) with Radix UI primitives and Lucide icons
- Path alias: `@/*` maps to project root

## Architecture

**Routing**: App Router with `(dashboard)` route group. Pages: `/students`, `/classes/daily`, `/classes/weekly`, `/trials`.

**Page pattern**: Server `page.tsx` → Client `*-client.tsx` for interactive state. Detail/edit/add views use modal dialogs.

**State**: Local React state only (`useState`, `useMemo`, `useCallback`, `React.memo`). Hardcoded dummy data — Supabase planned.

**Component layout**:
- `components/ui/` — shadcn/ui primitives
- `components/` — shared (status-badge, level-badge, trial-status-badge, app-sidebar)
- Feature components colocated with routes (e.g., `students/detail/sections/`)

**Types**: `types/student.ts` — all domain types: `Student`, `Payment`, `LevelHistory`, `ClassItem`, `ClassStudent`, `AttendanceRecord`, `TrialReservation`, enums (`StudentStatus`, `TrialStatus`, `GroupType`, `Gender`, `LevelType`).

## Key Files Reference

| Feature | Files |
|---------|-------|
| 학생 목록 | `students/page.tsx`, `students-client.tsx`, `students-table.tsx` |
| 학생 상세 | `students/detail/index.tsx`, `sections/{profile,attendance,payments,level}.tsx` |
| 학생 추가/수정 | `students/add-student-modal.tsx`, `detail/edit-student-modal.tsx` |
| 결제 추가/수정 | `detail/add-payment-modal.tsx`, `detail/edit-payment-modal.tsx` |
| 일별 수업 | `classes/daily/page.tsx`, `class-detail-card.tsx`, `time-slot-section.tsx` |
| 주차별 수업 | `classes/weekly/page.tsx` |
| 수업 추가 | `classes/add-class-modal.tsx`, `add-class-student-modal.tsx` |
| 체험 관리 | `trials/page.tsx`, `trials-client.tsx`, `trials-table.tsx`, `add-trial-modal.tsx`, `trial-detail-modal.tsx` |
| mongkids-fe 참고 | `../mongkids-fe/src/components/trial/` (Supabase 연동 버전) |

## Conventions

- Korean string literals for all user-facing text and enum values
- `cn()` from `@/lib/utils` for conditional className merging
- Modal-based CRUD — list pages open modals, not new routes
- Commit messages: Korean with conventional commit prefix (e.g., `feat(students): 학생 상세 모달 퍼블리싱`)
- Git branch: `develop`

## Development Log

매 대화 종료 시 `docs/DEVLOG.md`에 작업 내용을 추가하세요. 포트폴리오용으로 사용됩니다.
형식: `## [날짜] 세션 N` → 변경 사항 목록 + 의사결정 사항.

## Feature Documentation

구현된 기능 목록은 `docs/FEATURES.md`에 정리되어 있습니다. 새로운 기능 구현 시 업데이트하세요.
