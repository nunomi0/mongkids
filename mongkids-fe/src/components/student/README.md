# Student 관련 컴포넌트 구조

## 📁 폴더 구조 (플랫 구조)

```
components/student/
├── index.ts                    # 메인 export 파일
├── README.md                   # 이 파일
├── StudentManagement.tsx       # 학생 관리 메인 페이지
├── StudentDetailModal.tsx      # 학생 상세 정보 모달
├── StudentEditModal.tsx        # 학생 정보 수정 모달
├── AddStudentModal.tsx         # 학생 추가 모달
├── HeaderCard.tsx              # 학생 기본 정보 카드
├── AttendanceSection.tsx       # 출석 관리 섹션
├── LevelHistoryCard.tsx        # 레벨 이력 카드
├── PaymentsSection.tsx         # 결제 관리 섹션
├── AddPaymentDialog.tsx        # 결제 추가 다이얼로그
├── EditStudentDialog.tsx       # 학생 정보 편집 다이얼로그
├── DeleteStudentDialog.tsx     # 학생 삭제 확인 다이얼로그
└── useStudentDetailData.ts     # 학생 상세 데이터 훅
```

## 🔄 컴포넌트 관계

### StudentDetailModal
- **역할**: 학생의 전체 상세 정보를 표시하는 메인 모달
- **사용하는 컴포넌트들**:
  - `HeaderCard`: 기본 정보 표시
  - `LevelHistoryCard`: 레벨 이력 표시
  - `AttendanceSection`: 출석 기록 관리
  - `PaymentsSection`: 결제 내역 관리
  - `StudentEditModal`: 정보 수정
  - `AddPaymentDialog`: 결제 추가
- **데이터 소스**: `useStudentDetailData` 훅

### StudentEditModal
- **역할**: 학생 정보 수정 (이름, 생년월일, 연락처, 레벨 이력, 스케줄 등)
- **사용하는 컴포넌트들**:
  - `DeleteStudentDialog`: 학생 삭제 확인

### AddStudentModal
- **역할**: 새 학생 등록
- **기능**: 기본 정보, 스케줄, 초기 레벨 설정

## 📊 데이터 흐름

1. **데이터 로딩**: `useStudentDetailData` 훅이 Supabase에서 학생 관련 데이터를 조회
2. **데이터 표시**: 각 섹션 컴포넌트가 해당 데이터를 UI로 렌더링
3. **데이터 수정**: 모달/다이얼로그를 통해 데이터 수정 후 `onReload` 콜백으로 새로고침

## 🎯 사용법

```typescript
// 메인 모달 사용
import { StudentDetailModal } from './components/student'

<StudentDetailModal 
  isOpen={isOpen} 
  onClose={onClose} 
  studentId={studentId} 
/>

// 개별 컴포넌트 사용
import { HeaderCard, AttendanceSection } from './components/student'

<HeaderCard student={student} classTypes={classTypes} onReload={reload} />
<AttendanceSection attendance={attendance} student={student} onReload={reload} />
```

## 🔧 유지보수 가이드

- **새 섹션 추가**: `sections/` 폴더에 컴포넌트 생성 후 `StudentDetailModal`에 추가
- **새 다이얼로그 추가**: `dialogs/` 폴더에 생성 후 필요한 곳에서 import
- **새 모달 추가**: `modals/` 폴더에 생성 후 `index.ts`에 export 추가
- **데이터 로직 수정**: `hooks/useStudentDetailData.ts`에서 수정
