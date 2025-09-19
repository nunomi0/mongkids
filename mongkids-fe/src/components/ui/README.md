# UI 컴포넌트 정리 완료

## ✅ 남아있는 UI 컴포넌트들

### 핵심 컴포넌트들
- `badge.tsx` - 뱃지 표시
- `button.tsx` - 버튼
- `card.tsx` - 카드 레이아웃
- `dialog.tsx` - 모달 다이얼로그
- `input.tsx` - 입력 필드
- `label.tsx` - 라벨
- `select.tsx` - 드롭다운 선택
- `table.tsx` - 테이블
- `tabs.tsx` - 탭

### 특수 컴포넌트들
- `calendar.tsx` - 캘린더 (수업 관리에서 사용)
- `checkbox.tsx` - 체크박스
- `popover.tsx` - 팝오버
- `tooltip.tsx` - 툴팁 (HoverTooltip에서 사용)

### 레이아웃 컴포넌트들
- `sidebar.tsx` - 사이드바 (App.tsx에서 사용)
- `separator.tsx` - 구분선 (sidebar에서 사용)
- `sheet.tsx` - 시트 (sidebar 모바일 버전)
- `skeleton.tsx` - 스켈레톤 (sidebar에서 사용)

### 유틸리티
- `use-mobile.ts` - 모바일 감지 훅
- `utils.ts` - 유틸리티 함수들

## 🗑️ 삭제된 컴포넌트들

사용되지 않는 다음 컴포넌트들이 제거되었습니다:
- accordion, alert-dialog, alert, aspect-ratio, avatar
- breadcrumb, carousel, chart, collapsible, command, context-menu
- custom-dialog, drawer, dropdown-menu, form, hover-card
- input-otp, menubar, navigation-menu, pagination, progress
- radio-group, resizable, scroll-area, sonner, switch
- textarea, toggle-group, toggle

이로 인해 프로젝트 크기가 줄어들고 빌드 시간이 단축됩니다.
