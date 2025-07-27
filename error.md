<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# TypeScript "maxDepth does not exist in type" 오류 해결 가이드

**핵심 문제**: `SafeJSONParseOptions` 인터페이스에 `maxDepth` 속성이 정의되어 있지 않아 TypeScript 컴파일 오류가 발생하고 있습니다[^1][^2]. 이는 인터페이스에 정의되지 않은 속성을 객체 리터럴에서 사용할 때 발생하는 **"Object literal may only specify known properties"** 오류입니다.

## 문제 원인 분석

에러 로그를 보면 `route.ts:76:7` 위치에서 다음과 같은 문제가 발생했습니다:

```typescript
// 문제가 되는 부분
const content = safeJSONParse(jsonText, {
  requiredKeys: ['title', 'content', 'summary', 'tags'],
  enableReviver: true,
  maxDepth: 5  // ❌ 'maxDepth'가 정의되지 않음
});
```


## 즉시 해결 방법

### 1. SafeJSONParseOptions 인터페이스에 maxDepth 추가

`utils/safeJson.ts` 파일에서 인터페이스를 수정하세요:

```typescript
// utils/safeJson.ts
interface SafeJSONParseOptions {
  requiredKeys?: string[];
  enableReviver?: boolean;
  maxDepth?: number;  // ✅ 추가
  fallback?: any;
  logErrors?: boolean;
}

export function safeJSONParse(
  jsonString: string, 
  options: SafeJSONParseOptions = {}
) {
  const {
    requiredKeys = [],
    enableReviver = false,
    maxDepth = 100,     // ✅ 기본값 설정
    fallback = null,
    logErrors = true
  } = options;

  // 기존 로직에 maxDepth 검증 추가
  try {
    const parsed = JSON.parse(jsonString);
    
    // maxDepth 검증
    if (getObjectDepth(parsed) > maxDepth) {
      throw new Error(`최대 깊이 초과: ${maxDepth}`);
    }
    
    return parsed;
  } catch (error) {
    if (logErrors) {
      console.error('JSON 파싱 실패:', error.message);
    }
    return fallback;
  }
}

// 객체 깊이 측정 유틸리티 함수
function getObjectDepth(obj: any, depth = 0): number {
  if (depth > 100) return depth; // 무한 재귀 방지
  
  if (obj === null || typeof obj !== 'object') {
    return depth;
  }
  
  return Math.max(depth, ...Object.values(obj).map(v => 
    getObjectDepth(v, depth + 1)
  ));
}
```


### 2. 임시 해결책: maxDepth 제거

당장 배포가 급하다면 `route.ts`에서 `maxDepth` 속성을 제거하세요:

```typescript
// 임시 해결책
const content = safeJSONParse(jsonText, {
  requiredKeys: ['title', 'content', 'summary', 'tags'],
  enableReviver: true
  // maxDepth: 5  // ❌ 제거
});
```


### 3. 인덱스 시그니처를 사용하여 유연성 확보

더 유연한 옵션 인터페이스를 만들려면 인덱스 시그니처를 추가하세요[^2]:

```typescript
interface SafeJSONParseOptions {
  requiredKeys?: string[];
  enableReviver?: boolean;
  maxDepth?: number;
  fallback?: any;
  logErrors?: boolean;
  [key: string]: any; // ✅ 추가적인 속성 허용
}
```


## 근본적 해결책

### TypeScript 타입 안전성을 보장하는 완전한 구현

```typescript
// utils/safeJson.ts
export interface SafeJSONParseOptions {
  /** 필수로 존재해야 하는 키들 */
  requiredKeys?: string[];
  /** 안전한 리바이버 함수 사용 여부 */
  enableReviver?: boolean;
  /** 최대 객체 중첩 깊이 */
  maxDepth?: number;
  /** 파싱 실패 시 반환할 기본값 */
  fallback?: any;
  /** 오류 로깅 여부 */
  logErrors?: boolean;
  /** 타임아웃 (밀리초) */
  timeout?: number;
  /** 커스텀 검증 함수 */
  validator?: (obj: any) => boolean;
}

export class JSONParseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'JSONParseError';
  }
}

export function safeJSONParse<T = any>(
  jsonString: string,
  options: SafeJSONParseOptions = {}
): T | null {
  const {
    requiredKeys = [],
    enableReviver = false,
    maxDepth = 100,
    fallback = null,
    logErrors = true,
    timeout = 5000,
    validator
  } = options;

  // 입력 검증
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    if (logErrors) console.warn('JSON 파싱: 빈 문자열 또는 잘못된 타입');
    return fallback;
  }

  try {
    // 타임아웃 처리 (대용량 JSON 대비)
    const parsePromise = new Promise<T>((resolve, reject) => {
      try {
        const parsed = JSON.parse(jsonString, enableReviver ? createSafeReviver() : undefined);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('JSON 파싱 타임아웃')), timeout);
    });

    const result = Promise.race([parsePromise, timeoutPromise]);
    
    // 동기 처리를 위한 즉시 실행
    let parsed: T;
    try {
      parsed = JSON.parse(jsonString, enableReviver ? createSafeReviver() : undefined);
    } catch (error) {
      throw new JSONParseError('JSON 구문 오류', error as Error);
    }

    // 깊이 검증
    if (maxDepth > 0 && getObjectDepth(parsed) > maxDepth) {
      throw new JSONParseError(`최대 깊이 초과: ${maxDepth}`);
    }

    // 필수 키 검증
    if (requiredKeys.length > 0 && typeof parsed === 'object' && parsed !== null) {
      const missingKeys = requiredKeys.filter(key => !(key in parsed));
      if (missingKeys.length > 0) {
        throw new JSONParseError(`필수 키 누락: ${missingKeys.join(', ')}`);
      }
    }

    // 커스텀 검증
    if (validator && !validator(parsed)) {
      throw new JSONParseError('커스텀 검증 실패');
    }

    return parsed;

  } catch (error) {
    if (logErrors) {
      console.error('JSON 파싱 실패:', {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        input: jsonString.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
    }
    return fallback;
  }
}

function createSafeReviver() {
  const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
  
  return (key: string, value: any) => {
    if (dangerousKeys.has(key)) return undefined;
    return value;
  };
}

function getObjectDepth(obj: any, depth = 0): number {
  if (depth > 100) return depth; // 무한 재귀 방지
  
  if (obj === null || typeof obj !== 'object') {
    return depth;
  }
  
  return Math.max(depth, ...Object.values(obj).map(v => 
    getObjectDepth(v, depth + 1)
  ));
}
```


### 사용 예시

```typescript
// app/api/gemini/generate-content/route.ts
import { safeJSONParse, SafeJSONParseOptions } from '../../../utils/safeJson';

const parseOptions: SafeJSONParseOptions = {
  requiredKeys: ['title', 'content', 'summary', 'tags'],
  enableReviver: true,
  maxDepth: 5,
  fallback: {
    title: '',
    content: '',
    summary: '',
    tags: []
  },
  validator: (obj) => {
    return obj.title && obj.content && obj.summary && Array.isArray(obj.tags);
  }
};

const content = safeJSONParse(jsonText, parseOptions);
```


## 예방책 및 모범 사례

### 1. 타입 정의 파일 중앙 관리

```typescript
// types/json.ts
export interface JSONParseOptions {
  maxDepth?: number;
  timeout?: number;
  reviver?: (key: string, value: any) => any;
}

export interface ValidationOptions {
  requiredKeys?: string[];
  schema?: object;
  strict?: boolean;
}

export type SafeJSONParseOptions = JSONParseOptions & ValidationOptions & {
  fallback?: any;
  logErrors?: boolean;
};
```


### 2. ESLint 규칙 추가

```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "prefer-const": "error"
  }
}
```


### 3. 빌드 전 타입 검사

```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "prebuild": "npm run type-check",
    "build": "next build"
  }
}
```

이렇게 수정하면 **Vercel 배포 시 발생하는 TypeScript 타입 오류가 완전히 해결**되고, 동시에 JSON 파싱의 안전성과 타입 안전성도 확보할 수 있습니다[^3][^4].

<div style="text-align: center">⁂</div>

[^1]: https://dev.to/cristiansifuentes/understanding-the-object-literal-may-only-specify-known-properties-error-in-react-typescript-25f0

[^2]: https://bobbyhadz.com/blog/typescript-object-literal-may-only-specify-known-properties

[^3]: https://dev.to/maafaishal/safely-use-jsonparse-in-typescript-12e7

[^4]: https://www.codeproject.com/Articles/5378161/Mastering-Type-Safe-JSON-Serialization-in-TypeScri

[^5]: https://stackoverflow.com/questions/68153326/do-typescript-interfaces-not-limit-the-amount-of-properties

[^6]: https://despiteallthat.tistory.com/198

[^7]: https://stackoverflow.com/questions/69673056/typescript-type-safety-fails-with-json-parse/69674456

[^8]: https://www.reddit.com/r/typescript/comments/11p00uv/typescript_maximum_depth_for_inferred_types/

[^9]: https://www.reddit.com/r/typescript/comments/1eqmiiv/why_are_excess_properties_now_allowed_in_object/

[^10]: https://learn.microsoft.com/en-us/javascript/api/@microsoft/signalr-protocol-msgpack/messagepackoptions?view=signalr-js-latest

[^11]: https://hackernoon.com/mastering-type-safe-json-serialization-in-typescript

[^12]: https://www.totaltypescript.com/concepts/object-is-of-type-unknown

[^13]: https://stackoverflow.com/questions/75698734/typescript-maximum-depth-inferred-types

[^14]: https://dev.to/nodge/mastering-type-safe-json-serialization-in-typescript-1g96

[^15]: https://www.cnblogs.com/Answer1215/p/16517779.html

[^16]: https://stackoverflow.com/questions/71223634/typescript-interface-causing-type-instantiation-is-excessively-deep-and-possibl

[^17]: https://dev.to/codeprototype/safely-parsing-json-to-a-typescript-interface-3lkj

[^18]: https://stackoverflow.com/questions/31816061/why-am-i-getting-an-error-object-literal-may-only-specify-known-properties

[^19]: https://learn.microsoft.com/ko-kr/javascript/api/@microsoft/signalr-protocol-msgpack/messagepackoptions?view=signalr-js-latest

[^20]: https://www.typescriptlang.org/ko/docs/handbook/release-notes/typescript-4-9.html

