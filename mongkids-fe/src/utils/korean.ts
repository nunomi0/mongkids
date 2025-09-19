/**
 * 한국어 검색 유틸리티
 * 초성, 중성, 종성을 분리하여 검색할 수 있도록 지원
 */

// 초성 리스트
const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// 중성 리스트
const JUNGSUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];

// 종성 리스트
const JONGSUNG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

/**
 * 한글 문자를 초성, 중성, 종성으로 분해
 */
function decomposeHangul(char: string): { chosung: string; jungsung: string; jongsung: string } | null {
  const code = char.charCodeAt(0);
  
  // 한글이 아닌 경우
  if (code < 0xAC00 || code > 0xD7A3) {
    return null;
  }
  
  const base = code - 0xAC00;
  const chosungIndex = Math.floor(base / (21 * 28));
  const jungsungIndex = Math.floor((base % (21 * 28)) / 28);
  const jongsungIndex = base % 28;
  
  return {
    chosung: CHOSUNG[chosungIndex],
    jungsung: JUNGSUNG[jungsungIndex],
    jongsung: JONGSUNG[jongsungIndex]
  };
}

/**
 * 문자열에서 초성만 추출
 */
export function extractChosung(text: string): string {
  return text
    .split('')
    .map(char => {
      const decomposed = decomposeHangul(char);
      return decomposed ? decomposed.chosung : char;
    })
    .join('');
}

/**
 * 검색어가 대상 문자열과 매치되는지 확인
 * - 일반 문자열 포함 검색
 * - 초성 검색 (예: "김철수" → "ㄱㅊㅅ" 검색 가능)
 * - 부분 초성 검색 (예: "김철수" → "ㄱㅊ" 검색 가능)
 */
export function isKoreanMatch(target: string, search: string): boolean {
  if (!search.trim()) return true;
  
  const normalizedTarget = target.toLowerCase();
  const normalizedSearch = search.toLowerCase();
  
  // 1. 일반 문자열 포함 검색
  if (normalizedTarget.includes(normalizedSearch)) {
    return true;
  }
  
  // 2. 초성 검색
  const targetChosung = extractChosung(target);
  const searchChosung = extractChosung(search);
  
  // 검색어가 모두 초성인지 확인
  const isAllChosung = search.split('').every(char => CHOSUNG.includes(char));
  
  if (isAllChosung) {
    // 초성만으로 검색하는 경우
    return targetChosung.includes(searchChosung);
  } else {
    // 혼합 검색 (초성 + 일반 문자)
    return targetChosung.toLowerCase().includes(searchChosung.toLowerCase());
  }
}

/**
 * 배열을 한국어 검색으로 필터링
 */
export function filterByKoreanSearch<T>(
  items: T[],
  search: string,
  getSearchText: (item: T) => string
): T[] {
  if (!search.trim()) return items;
  
  return items.filter(item => {
    const searchText = getSearchText(item);
    return isKoreanMatch(searchText, search);
  });
}
