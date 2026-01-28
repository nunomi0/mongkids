# Mongkids 학원 관리 시스템

몽키즈 클라이밍 학원 관리 시스템입니다.

## 기술 스택

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Database**: Supabase (예정)

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

---

## 기능 명세

### 학생 관리

#### 학생 목록 (`/students`)
- 학생 목록 테이블 표시
- 이름/전화번호 검색
- 학생 클릭 시 상세 모달 열림

#### 학생 등록
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| 이름 | string | O | 학생 이름 |
| 생년월일 | date | O | YYYY-MM-DD |
| 성별 | enum | - | 남 / 여 |
| 전화번호 | string | O | 010-0000-0000 |
| 상태 | enum | - | 재원 / 휴원 / 퇴원 / 체험 |
| 신발 사이즈 | string | - | 숫자 (예: 250) |
| 등록반 | select | O | 등록반 선택 |
| 수업 시간 | array | - | 요일, 시간, 그룹 타입 |

**유효성 검사:**
- 필수 필드 입력 확인
- 수업 시간 중복 검사
- 등록반의 주 n회와 수업 시간 개수 일치 검사

#### 학생 정보 수정
- 학생 상세 모달에서 "정보 수정" 버튼 클릭
- 등록과 동일한 폼 (기존 데이터 로드)
- 수업 시간 추가/삭제 가능

### 결제 관리

#### 결제 추가
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| 결제일 | date | O | 결제 날짜 |
| 해당월 | month | O | 수업료 해당 월 |
| 금액 | number | O | 결제 금액 |
| 결제수단 | enum | O | 계좌이체 / 카드결제 / 스포츠바우처 / 현금 |
| 할인 | array | - | 할인 유형 + 금액 (동적 추가) |
| 메모 | string | - | 메모 |

**할인 유형:**
- 신발
- 형제자매
- 추가
- 이벤트
- 기타

**기능:**
- 할인 동적 추가/삭제
- 최종 금액 실시간 계산

---

## 타입 정의

```typescript
// types/student.ts

type StudentStatus = '재원' | '휴원' | '퇴원' | '체험'
type GroupType = '일반1' | '일반2' | '스페셜' | '체험'
type Gender = '남' | '여'
type PaymentMethod = '계좌이체' | '카드결제' | '스포츠바우처' | '현금'

type StudentSchedule = {
  weekday: number      // 0-6 (일-토)
  time: string         // "HH:mm"
  group_type: GroupType
}

type ClassType = {
  id: number
  category: string
  sessions_per_week: number
}

type Student = {
  id: number
  name: string
  birth_date: string
  phone: string
  class_type_id: number
  gender: Gender
  status: StudentStatus
  shoe_size: string
  memo: string
  schedules: StudentSchedule[]
}

type Discount = {
  type: string
  amount: number
}

type PaymentFormData = {
  payment_date: string
  target_month: string
  amount: string
  method: PaymentMethod
  discounts: Discount[]
  memo: string
}
```

---

## 프로젝트 구조

```
app/
├── (dashboard)/
│   └── students/
│       ├── page.tsx                    # 학생 목록 페이지
│       ├── students-client.tsx         # 클라이언트 컴포넌트
│       ├── students-table.tsx          # 테이블 컴포넌트
│       ├── add-student-modal.tsx       # 학생 등록 모달
│       └── detail/
│           ├── index.tsx               # 학생 상세 모달
│           ├── edit-student-modal.tsx  # 학생 수정 모달
│           ├── add-payment-modal.tsx   # 결제 추가 모달
│           └── sections/
│               ├── profile.tsx         # 기본 정보 섹션
│               ├── level.tsx           # 레벨 섹션
│               ├── attendance.tsx      # 출석 섹션
│               └── payments.tsx        # 결제 내역 섹션

components/
└── ui/                                 # shadcn/ui 컴포넌트

types/
└── student.ts                          # 학생 관련 타입 정의
```

---

## TODO

- [ ] Supabase 연동
- [ ] 학생 데이터 CRUD API
- [ ] 결제 데이터 CRUD API
- [ ] 출석 관리 기능
- [ ] 레벨 이력 관리 기능
- [ ] 대시보드 통계
