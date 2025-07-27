# Vercel 배포 오류 해결 가이드

이 문서는 AIMAX 프로젝트를 Vercel에 배포하면서 발생한 모든 오류와 해결 방법을 정리한 가이드입니다.

## 목차
1. [Module not found 오류](#1-module-not-found-오류)
2. [TypeScript 타입 오류](#2-typescript-타입-오류)
3. [ESLint 오류](#3-eslint-오류)
4. [NextAuth 관련 오류](#4-nextauth-관련-오류)
5. [환경 변수 오류](#5-환경-변수-오류)
6. [빌드 타임 vs 런타임 오류](#6-빌드-타임-vs-런타임-오류)

---

## 1. Module not found 오류

### 오류 메시지
```
Module not found: Can't resolve '../../../utils/validation'
```

### 원인
- Zod 라이브러리가 설치되지 않았거나
- import 경로가 잘못되었거나
- 파일이 실제로 존재하지 않는 경우

### 해결책
```typescript
// 이전 (오류 발생)
import { generateContentSchema } from '../../../utils/validation';
import { ZodError } from 'zod';

// 해결책 1: Zod 제거하고 기본 검증 사용
const { topic, title, keywords, contentType } = body;

if (!topic || !contentType) {
  return NextResponse.json(
    { error: '주제와 콘텐츠 타입이 필요합니다.' },
    { status: 400 }
  );
}

// 해결책 2: 올바른 경로 사용
import { getContentGuideline } from '@/utils/contentGuidelines';
```

---

## 2. TypeScript 타입 오류

### 2.1 "maxDepth does not exist in type" 오류

### 오류 메시지
```
Type error: Object literal may only specify known properties, and 'maxDepth' does not exist in type 'SafeJSONParseOptions'.
```

### 원인
인터페이스에 정의되지 않은 속성을 사용하려고 했기 때문

### 해결책
```typescript
// 이전 (오류 발생)
const content = safeJSONParse(jsonText, {
  requiredKeys: ['title', 'content', 'summary', 'tags'],
  enableReviver: true,
  maxDepth: 5  // ❌ 인터페이스에 없는 속성
});

// 해결책: maxDepth 제거
const content = safeJSONParse(jsonText, {
  requiredKeys: ['title', 'content', 'summary', 'tags'],
  enableReviver: true
});
```

### 2.2 "Property 'id' does not exist on type" 오류

### 오류 메시지
```
Type error: Property 'id' does not exist on type '{ name?: string | null | undefined; email?: string | null | undefined; image?: string | null | undefined; }'.
```

### 원인
NextAuth의 기본 Session 타입에 id 속성이 없기 때문

### 해결책
```typescript
// next-auth.d.ts 파일 생성
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

// tsconfig.json에 포함
{
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "next-auth.d.ts"]
}
```

---

## 3. ESLint 오류

### 오류 메시지
```
Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
Error: `'` can be escaped with `&apos;`  react/no-unescaped-entities
Warning: Using `<img>` could result in slower LCP  @next/next/no-img-element
```

### 해결책

#### 3.1 .eslintrc.json 생성
```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "@typescript-eslint/no-explicit-any": "off",
    "@next/next/no-img-element": "off"
  }
}
```

#### 3.2 타입 명시
```typescript
// 이전
const result: any = await Promise.race([...]);

// 해결책
const result = await Promise.race([...]) as Awaited<ReturnType<typeof model.generateContent>>;
```

#### 3.3 이스케이프 문자 사용
```typescript
// 이전
<p>지금 시작하면, 이 모든 흐름의 '초기 사용자'가 됩니다.</p>

// 해결책
<p>지금 시작하면, 이 모든 흐름의 &apos;초기 사용자&apos;가 됩니다.</p>
```

---

## 4. NextAuth 관련 오류

### 4.1 Route export 오류

### 오류 메시지
```
Type error: Route "app/api/auth/[...nextauth]/route.ts" does not match the required types of a Next.js Route.
"authOptions" is not a valid Route export field.
```

### 원인
Next.js 13+ App Router에서는 route 파일에서 authOptions를 직접 export할 수 없음

### 해결책
```typescript
// lib/auth.ts (새 파일)
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // ... 설정
};

// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 4.2 NO_SECRET 오류

### 오류 메시지
```
[next-auth][error][NO_SECRET] Please define a `secret` in production.
```

### 원인
프로덕션 환경에서 NEXTAUTH_SECRET이 설정되지 않음

### 해결책
Vercel 환경 변수에 추가:
- `NEXTAUTH_SECRET`: 랜덤 문자열 (openssl rand -base64 32로 생성)
- `NEXTAUTH_URL`: https://your-project.vercel.app

---

## 5. 환경 변수 오류

### 오류 메시지
```
Error: GEMINI_API_KEY is not configured
```

### 원인
빌드 시점에 환경 변수를 체크하는 코드가 모듈 최상위에 있음

### 해결책
```typescript
// 이전 (오류 발생) - 모듈 최상위에서 체크
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured');
}

// 해결책 - 함수 내부에서 체크
export async function POST(request: NextRequest) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // ...
}
```

---

## 6. 빌드 타임 vs 런타임 오류

### 중요 개념
- **빌드 타임**: Vercel이 코드를 빌드할 때 (환경 변수가 없을 수 있음)
- **런타임**: 실제 API가 호출될 때 (환경 변수 사용 가능)

### 체크리스트
1. 모든 환경 변수 체크는 함수 내부에서 수행
2. 모듈 최상위에서는 환경 변수를 사용하지 않음
3. API 클라이언트 초기화도 함수 내부에서 수행

---

## Vercel 배포 전 체크리스트

### 1. 로컬 테스트
```bash
npm run build  # 로컬에서 빌드 테스트
npm run lint   # ESLint 오류 확인
```

### 2. 타입 체크
```bash
npx tsc --noEmit  # TypeScript 오류 확인
```

### 3. 환경 변수 준비
```env
# 필수 환경 변수
GEMINI_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 4. Vercel 설정
1. 환경 변수 모두 추가 (Production, Preview, Development)
2. Sensitive 옵션 활성화 (API 키, 시크릿)
3. 빌드 명령어 확인: `npm run build`

### 5. Google Cloud Console 설정
승인된 리디렉션 URI 추가:
- `https://your-project.vercel.app/api/auth/callback/google`

---

## 디버깅 팁

### 1. Vercel 로그 확인
- Vercel 대시보드 → Functions 탭
- 실시간 로그로 오류 확인

### 2. 환경 변수 확인
```bash
vercel env ls  # 설정된 환경 변수 목록
```

### 3. 빌드 로그 상세 확인
- "Running build in..." 이후 로그 주의 깊게 확인
- "Failed to compile" 메시지 찾기

### 4. 타입 정의 파일 위치
- `next-auth.d.ts`는 프로젝트 루트에 위치
- `tsconfig.json`의 include에 포함되었는지 확인

---

## 예방 방법

### 1. 개발 초기 설정
- TypeScript strict 모드 사용
- ESLint 규칙 미리 설정
- 환경 변수 예시 파일(.env.example) 작성

### 2. 코드 작성 시
- 환경 변수는 항상 런타임에 체크
- 타입 정의 명확히 하기
- import 경로는 절대 경로(@/) 사용

### 3. 배포 전
- 로컬 빌드 테스트 필수
- 모든 환경 변수 문서화
- API 키는 절대 코드에 하드코딩 금지

이 가이드를 참고하면 Vercel 배포 시 발생하는 대부분의 오류를 예방하고 해결할 수 있습니다.