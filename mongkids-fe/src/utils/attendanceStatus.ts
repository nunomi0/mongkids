// src/utils/attendanceStatus.ts
export type Kind = '정규' | '보강';
export type Status = '예정' | '출석' | '결석';
export type DisplayStatus = Status | '보강';

export const STATUS_COLORS: Record<DisplayStatus, string> = {
  예정: '#ffffff',
  출석: '#22c55e',
  결석: '#ef4444',
  보강: '#38bdf8',
};
export const STATUS_BG_COLORS: Record<DisplayStatus, string> = {
  예정: '#ffffff',
  출석: '#dcfce7',
  결석: '#fee2e2',
  보강: '#e0f2fe',
};
export const STATUS_BORDER_COLORS: Record<DisplayStatus, string> = {
  예정: '#e5e7eb',
  출석: '#22c55e',
  결석: '#ef4444',
  보강: '#38bdf8',
};

export function nextStatus(current: Status): Status {
  if (current === '예정') return '출석';
  if (current === '출석') return '결석';
  return '예정';
}

export function canToggleStatus(kind: Kind, status: Status, hasLinkedMakeup: boolean): boolean {
  // 보강 예정은 클릭 비활성화
  if (kind === '보강' && status === '예정') return false;
  // 정규는 보강 연결 시 UI 토글 불가(정규는 보강 표시 전용)
  if (kind === '정규' && hasLinkedMakeup) return false;
  return true;
}

export function computeDisplayStatus(
  kind: Kind,
  status: Status,
  hasLinkedMakeup: boolean
): DisplayStatus {
  // 보강 예정은 하늘색(보강)으로 표시
  if (kind === '보강' && status === '예정') return '보강';
  if (kind === '정규' && hasLinkedMakeup) return '보강';
  return status;
}

export function getDisplayStyle(
  kind: Kind,
  status: Status,
  hasLinkedMakeup: boolean
) {
  const display = computeDisplayStatus(kind, status, hasLinkedMakeup);
  return {
    display,
    bg: STATUS_BG_COLORS[display],
    color: STATUS_COLORS[display],
    border: STATUS_BORDER_COLORS[display],
  };
}

/** ★ 동기화 규칙: 보강 상태 → 정규 상태 매핑
 * - 보강: 예정  -> 정규: 예정
 * - 보강: 출석  -> 정규: 출석  (보강 출석으로 해당 정규 참석을 충족 처리)
 * - 보강: 결석  -> 정규: 결석
 */
export function deriveRegularStatusFromMakeup(makeupStatus: Status): Status {
  return makeupStatus; // 1:1 미러링
}