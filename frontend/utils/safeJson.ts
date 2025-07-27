/**
 * 안전한 JSON 파싱 유틸리티
 * JSON 파싱 관련 런타임 오류를 방지하고 프로토타입 오염을 차단합니다.
 * 불완전한 JSON 문자열 감지 및 스트리밍 지원 포함
 */

/**
 * JSON 문자열의 완전성을 검증합니다
 * @param jsonString - 검증할 JSON 문자열
 * @returns 완전한 JSON인지 여부
 */
function isCompleteJSON(jsonString: string): boolean {
  const trimmed = jsonString.trim();
  if (!trimmed) return false;
  
  // 시작과 끝 문자 확인
  const starts = ['{', '['];
  const ends = ['}', ']'];
  
  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];
  
  const startIndex = starts.indexOf(firstChar);
  if (startIndex === -1) return false;
  
  const expectedEnd = ends[startIndex];
  if (lastChar !== expectedEnd) return false;
  
  // 중괄호/대괄호 균형 체크
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
  }
  
  return braceCount === 0 && bracketCount === 0;
}

/**
 * 스트리밍 JSON 누적기 클래스
 * 부분적으로 수신된 JSON을 누적하여 완전한 JSON이 되면 콜백 실행
 */
export class StreamingJSONAccumulator {
  private buffer: string = '';
  private onComplete: (data: any) => void;
  private timeout: NodeJS.Timeout | null = null;
  
  constructor(onComplete: (data: any) => void, timeoutMs: number = 30000) {
    this.onComplete = onComplete;
    
    // 타임아웃 설정
    this.timeout = setTimeout(() => {
      this.forceComplete();
    }, timeoutMs);
  }
  
  addChunk(chunk: string) {
    this.buffer += chunk;
    
    // 완전한 JSON인지 확인
    if (isCompleteJSON(this.buffer)) {
      const parsed = improvedSafeJSONParse(this.buffer);
      if (parsed !== null) {
        if (this.timeout) {
          clearTimeout(this.timeout);
          this.timeout = null;
        }
        this.onComplete(parsed);
        this.buffer = ''; // 버퍼 초기화
      }
    }
  }
  
  forceComplete() {
    // 타임아웃 시 강제 파싱 시도
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    if (this.buffer.trim()) {
      console.warn('불완전한 JSON으로 강제 완료:', this.buffer.substring(0, 100));
      const parsed = improvedSafeJSONParse(this.buffer, {
        sections: { 
          introduction: "응답 생성 중 오류가 발생했습니다.",
          body: ["서비스에 일시적인 문제가 있습니다."],
          conclusion: "잠시 후 다시 시도해주세요."
        }
      });
      this.onComplete(parsed);
    }
  }
  
  cleanup() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

/**
 * 개선된 안전한 JSON 파싱 함수
 * @param jsonString - 파싱할 JSON 문자열
 * @param fallback - 실패 시 반환할 기본값
 * @returns 파싱된 객체 또는 fallback 값
 */
function improvedSafeJSONParse<T = any>(jsonString: string, fallback: T = null as T): T {
  try {
    // 먼저 완전성 검증
    if (!isCompleteJSON(jsonString)) {
      console.warn('불완전한 JSON 감지:', {
        length: jsonString.length,
        starts: jsonString.substring(0, 20),
        ends: jsonString.substring(jsonString.length - 20),
        complete: false
      });
      return fallback;
    }
    
    // 기본 JSON 파싱 시도
    return JSON.parse(jsonString, safeReviver) as T;
    
  } catch (error) {
    console.error('JSON 파싱 실패:', error instanceof Error ? error.message : 'Unknown error');
    return fallback;
  }
}

// JSON 에러 트래킹을 위한 인터페이스
interface JSONError {
  message: string;
  input: string;
  timestamp: Date;
}

// JSON 에러 트래커 클래스
class JSONErrorTracker {
  private errors: JSONError[] = [];
  private maxErrors = 100; // 최대 저장할 에러 수

  addError(message: string, input: string) {
    const error: JSONError = {
      message,
      input: input.substring(0, 200), // 200자만 저장
      timestamp: new Date()
    };

    this.errors.unshift(error);
    
    // 최대 개수 초과 시 오래된 에러 제거
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // 콘솔에 에러 로그
    console.error('JSON 파싱 에러:', message, '\n입력 샘플:', input.substring(0, 200));
  }

  getErrors(): JSONError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

// 전역 에러 트래커 인스턴스
const jsonErrorTracker = new JSONErrorTracker();

// 프로토타입 오염 방지 reviver 함수
const safeReviver = (key: string, value: any): any => {
  // 위험한 키들을 필터링
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  if (dangerousKeys.includes(key)) {
    return undefined;
  }
  return value;
};

// 입력 검증 함수
function validateInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('JSON 입력은 문자열이어야 합니다');
  }
  
  if (input.trim() === '') {
    throw new Error('빈 문자열은 파싱할 수 없습니다');
  }
  
  return input.trim();
}

// 필수 키 검증 함수
function validateKeys(obj: any, requiredKeys?: string[]): boolean {
  if (!requiredKeys || requiredKeys.length === 0) {
    return true;
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  return requiredKeys.every(key => key in obj);
}

// 안전한 JSON 파싱 옵션 인터페이스
interface SafeJSONParseOptions {
  fallback?: any;
  requiredKeys?: string[];
  enableReviver?: boolean;
}

/**
 * 안전한 JSON 파싱 함수
 * @param jsonString - 파싱할 JSON 문자열
 * @param options - 파싱 옵션
 * @returns 파싱된 객체 또는 fallback 값
 */
export function safeJSONParse<T = any>(
  jsonString: unknown, 
  options: SafeJSONParseOptions = {}
): T {
  const { 
    fallback = null, 
    requiredKeys = [], 
    enableReviver = true 
  } = options;

  try {
    // 입력 검증
    const validInput = validateInput(jsonString);
    
    // 완전성 검증 추가
    if (!isCompleteJSON(validInput)) {
      console.warn('불완전한 JSON 감지:', {
        length: validInput.length,
        starts: validInput.substring(0, 50),
        ends: validInput.substring(validInput.length - 50),
        complete: false
      });
      jsonErrorTracker.addError('불완전한 JSON 문자열', validInput);
      return fallback as T;
    }
    
    // JSON 파싱 (reviver 사용/미사용 선택 가능)
    const parsed = enableReviver 
      ? JSON.parse(validInput, safeReviver)
      : JSON.parse(validInput);
    
    // 필수 키 검증
    if (!validateKeys(parsed, requiredKeys)) {
      throw new Error(`필수 키가 누락되었습니다: ${requiredKeys.join(', ')}`);
    }
    
    return parsed as T;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const inputString = typeof jsonString === 'string' ? jsonString : String(jsonString);
    
    // 에러 트래킹
    jsonErrorTracker.addError(errorMessage, inputString);
    
    return fallback as T;
  }
}

/**
 * 안전한 fetch + JSON 파싱 함수
 */
interface SafeFetchJSONOptions extends SafeJSONParseOptions {
  timeout?: number;
  retries?: number;
}

export async function safeFetchJSON<T = any>(
  url: string, 
  options: RequestInit & SafeFetchJSONOptions = {}
): Promise<T> {
  const { 
    timeout = 10000,
    retries = 3,
    fallback = null,
    requiredKeys = [],
    enableReviver = true,
    ...fetchOptions 
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 타임아웃 처리
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // HTTP 에러 체크
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      // Content-Type 체크
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.warn('응답이 JSON 형식이 아닐 수 있습니다:', contentType);
      }
      
      // 응답 텍스트 가져오기
      const text = await response.text();
      
      // 빈 응답 처리
      if (!text.trim()) {
        throw new Error('빈 응답을 받았습니다');
      }
      
      // 안전한 JSON 파싱
      return safeJSONParse<T>(text, {
        fallback,
        requiredKeys,
        enableReviver
      });
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown fetch error');
      
      if (attempt < retries) {
        // 재시도 전 대기 (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
    }
  }
  
  // 모든 재시도 실패 시
  jsonErrorTracker.addError(`Fetch 실패: ${lastError!.message}`, url);
  return fallback as T;
}

/**
 * TypeScript 타입 안전 JSON 파싱
 */
export function typedJSONParse<T>(
  jsonString: unknown,
  validator: (obj: any) => obj is T,
  fallback: T
): T {
  const parsed = safeJSONParse(jsonString, { fallback });
  
  if (validator(parsed)) {
    return parsed;
  }
  
  jsonErrorTracker.addError('타입 검증 실패', String(jsonString));
  return fallback;
}

/**
 * JSON 에러 정보 조회
 */
export function getJSONErrors(): JSONError[] {
  return jsonErrorTracker.getErrors();
}

/**
 * JSON 에러 기록 삭제
 */
export function clearJSONErrors(): void {
  jsonErrorTracker.clearErrors();
}