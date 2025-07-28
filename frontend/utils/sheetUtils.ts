/**
 * Google Sheets 관련 유틸리티 함수들
 */

/**
 * 구글시트 URL에서 시트 ID를 추출합니다
 * @param url 구글시트 URL
 * @returns 시트 ID 또는 null (유효하지 않은 경우)
 */
export function extractSheetId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Google Sheets URL 패턴들
  const patterns = [
    // https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    // https://docs.google.com/spreadsheets/d/SHEET_ID
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * 구글시트 URL이 유효한지 검증합니다
 * @param url 검증할 URL
 * @returns 유효성 여부
 */
export function isValidGoogleSheetsUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Google Sheets 도메인 확인
  const isGoogleDomain = url.includes('docs.google.com') || url.includes('sheets.google.com');
  
  // 시트 ID 추출 가능 여부 확인
  const hasValidSheetId = extractSheetId(url) !== null;

  return isGoogleDomain && hasValidSheetId;
}

/**
 * 시트 ID를 사용해 표준 구글시트 URL을 생성합니다
 * @param sheetId 시트 ID
 * @returns 표준 구글시트 URL
 */
export function createSheetsUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

/**
 * 구글시트 URL 에러 메시지를 생성합니다
 * @param url 잘못된 URL
 * @returns 사용자 친화적 에러 메시지
 */
export function getSheetUrlErrorMessage(url: string): string {
  if (!url || url.trim() === '') {
    return '구글시트 URL을 입력해주세요.';
  }

  if (!url.includes('docs.google.com') && !url.includes('sheets.google.com')) {
    return '올바른 구글시트 URL을 입력해주세요. (docs.google.com 또는 sheets.google.com)';
  }

  if (!extractSheetId(url)) {
    return '구글시트 ID를 찾을 수 없습니다. URL을 다시 확인해주세요.';
  }

  return '알 수 없는 오류가 발생했습니다.';
}