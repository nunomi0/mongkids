# 몽키즈 클라이밍 관리 시스템

몽키즈클라이밍 고양화정점 운영을 위한 어드민 웹 프로젝트입니다.

기존에 엑셀로 나뉘어 관리하던 학생, 출결, 결제, 보강, 체험 데이터를 한 화면에서 다루는 것을 목표로 합니다. 수업 사이 짧은 시간 안에 필요한 정보를 확인하고 처리할 수 있도록 만드는 것이 핵심입니다.

## 문서 안내

- 학원 운영 기준: [OPERATIONS_POLICY.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/OPERATIONS_POLICY.md)
- 현재 구현 기능과 개발 구조: [FEATURES.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/FEATURES.md)
- 수동 검증 체크리스트: [QA-SIMULATION.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/QA-SIMULATION.md)
- 개발 이력: [DEVLOG.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/DEVLOG.md)

## 현재 범위

현재 프로젝트는 아래 흐름을 중심으로 구성되어 있습니다.

- 대시보드
- 학생 관리
- 수업 관리
- 체험 관리
- 데이터 관리

세부 구현 범위는 [FEATURES.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/FEATURES.md)를 기준으로 봅니다.

## 기술 스택

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- ExcelJS

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 준비

`.env.local`에 최소한 아래 값이 필요합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

## 데이터 준비

Supabase 스키마는 [001_initial_schema.sql](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/supabase/migrations/001_initial_schema.sql)에 있습니다.

시뮬레이션용 데이터가 필요하면 아래 스크립트를 사용할 수 있습니다.

```bash
npm run seed
```

시드 검증 흐름은 [QA-SIMULATION.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/QA-SIMULATION.md)를 참고하면 됩니다.

## 라우트 구조

주요 화면은 모두 [app/(dashboard)](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/app/(dashboard)) 아래에 있습니다. 이 폴더는 URL 경로가 아니라 대시보드 공통 레이아웃을 묶는 용도입니다.

- `/` : 메인 대시보드
- `/students` : 학생 관리
- `/classes/daily`, `/classes/weekly` : 수업 관리
- `/trials` : 체험 관리
- `/settings` : 데이터 관리

## 현재 확인할 점

- 운영 정책은 [OPERATIONS_POLICY.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/OPERATIONS_POLICY.md)를 우선합니다.
- 구현 현황은 [FEATURES.md](/Users/leeyukyung/ReactProject/mongkids/mongkids-next/docs/FEATURES.md)에 따로 정리합니다.
- 문서와 구현이 다르면 정책을 먼저 확인하고 맞추는 방식으로 정리합니다.
