# Vercel 배포 "GEMINI_API_KEY is not configured" 오류 완벽 해결 가이드

**핵심 문제**: Vercel 빌드 과정에서 `GEMINI_API_KEY is not configured` 오류가 발생하는 것은 **환경 변수가 Vercel 프로젝트에 설정되지 않았거나**, **빌드 시점에 API 키에 접근하려는 코드**가 있기 때문입니다.

## 문제 원인 분석

에러 로그를 보면 "Collecting page data" 단계에서 오류가 발생했습니다[1]. 이는 Next.js가 빌드 시점에 정적 페이지 생성을 위해 API 경로를 실행하려고 시도하면서 환경 변수에 접근했기 때문입니다[2][1].

```
Error: GEMINI_API_KEY is not configured
    at (.next/server/app/api/gemini/generate-content/route.js:112:702)
```

##  1단계: Vercel 프로젝트에 환경 변수 설정

**Vercel 대시보드에서 환경 변수 추가**:

1. **Vercel 대시보드**에 로그인
2. 해당 **프로젝트** 선택
3. **Settings** 탭 클릭
4. 좌측 메뉴에서 **Environment Variables** 클릭[3]
5. 새 환경 변수 추가:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 실제 Gemini API 키 입력
   - **Environments**: Production, Preview, Development 모두 선택[4]
6. **Save** 클릭

### 2단계: 민감한 환경 변수로 설정

보안을 위해 **Sensitive** 옵션을 활성화하세요[5]:

1. 환경 변수 추가 시 **Sensitive** 스위치를 **Enabled**로 설정
2. 이렇게 하면 변수 값이 암호화되어 저장되고 읽기 불가능한 형태로 표시됩니다

### 3단계: API 키 검증 코드 수정

`app/api/gemini/generate-content/route.ts` 파일에서 환경 변수 체크 로직을 개선하세요:

```typescript
// 기존 문제 코드
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured'); // ❌ 빌드 시 실행됨
}

// 개선된 코드
export async function POST(request: Request) {
  // API 호출 시점에 체크
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Gemini API 호출 로직
  try {
    // ... 실제 API 호출 코드
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'API call failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## 근본적 해결책

### 1. 빌드 시점 vs 런타임 환경 변수 구분

**빌드 시점에 실행되는 코드 수정**:

```typescript
// ❌ 모듈 최상위에서 환경 변수 체크 - 빌드 시 실행됨
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not configured');
}

// ✅ 함수 내부에서 체크 - 런타임에만 실행됨
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500
    });
  }
  // ... 나머지 로직
}
```

### 2. 안전한 환경 변수 검증 유틸리티

```typescript
// utils/env.ts
export function validateEnvVariables() {
  const requiredVars = ['GEMINI_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    return { isValid: false, missing };
  }
  
  return { isValid: true, missing: [] };
}

// API 경로에서 사용
export async function POST(request: Request) {
  const envCheck = validateEnvVariables();
  if (!envCheck.isValid) {
    return new Response(
      JSON.stringify({ 
        error: 'Server configuration error',
        details: process.env.NODE_ENV === 'development' ? envCheck.missing : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // ... 실제 로직
}
```

### 3. Gemini API 클라이언트 초기화 최적화

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// API 경로에서 사용
export async function POST(request: Request) {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-pro' });
    // ... API 호출
  } catch (error) {
    if (error.message.includes('GEMINI_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500 }
      );
    }
    throw error;
  }
}
```

## 배포 후 확인사항

### 1. 환경 변수 설정 확인

**Vercel CLI를 통한 확인**:
```bash
# 프로젝트 환경 변수 확인
vercel env ls

# 로컬에 환경 변수 다운로드
vercel env pull .env.local
```

### 2. API 경로 테스트

배포 후 다음 URL로 API 경로가 정상 작동하는지 확인:
```
https://your-project.vercel.app/api/gemini/generate-content
```

### 3. 로그 모니터링

**Vercel 함수 로그 확인**:
1. Vercel 대시보드 → 프로젝트 → **Functions** 탭
2. 해당 API 경로 클릭하여 실행 로그 확인

## 예방 및 모범 사례

### 1. 환경 변수 타입 안전성

```typescript
// types/env.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GEMINI_API_KEY: string;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
    }
  }
}

export {};
```

### 2. 개발 환경 설정

**.env.example 파일 생성**:
```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. CI/CD 파이프라인 개선

**GitHub Actions에서 환경 변수 설정**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Vercel CLI
        run: npm install --global vercel
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - name: Deploy Project Artifacts
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## 문제 해결 체크리스트

- [ ] **Vercel 프로젝트에 GEMINI_API_KEY 환경 변수가 설정**되어 있는지 확인
- [ ] **Production, Preview, Development 환경** 모두에 변수가 적용되었는지 확인
- [ ] **Sensitive 옵션**이 활성화되어 보안이 강화되었는지 확인
- [ ] **API 경로 코드에서 모듈 최상위가 아닌 함수 내부**에서 환경 변수를 체크하는지 확인
- [ ] **환경 변수 설정 후 재배포**를 진행했는지 확인
- [ ] **로컬 .env 파일과 Vercel 설정**이 일치하는지 확인

Gemini API 키는 **Google AI Studio**에서 발급받을 수 있으며[6], Vercel에 설정한 후에는 반드시 **재배포**해야 변경사항이 적용됩니다[7]. 이 가이드를 따라 설정하면 "GEMINI_API_KEY is not configured" 오류가 완전히 해결되고, 안전하고 확장 가능한 AI 기반 SaaS 애플리케이션을 배포할 수 있습니다.

[1] https://github.com/vercel/next.js/discussions/35534
[2] https://github.com/vercel/next.js/discussions/50955
[3] https://www.delasign.com/blog/how-to-add-edit-or-remove-environment-variables-in-vercel/
[4] https://vercel.com/docs/environment-variables
[5] https://vercel.com/docs/environment-variables/sensitive-environment-variables
[6] https://ai.google.dev/gemini-api/docs/api-key
[7] https://vercel.com/guides/how-to-add-vercel-environment-variables
[8] https://vercel.com/docs/environment-variables/system-environment-variables
[9] https://stackoverflow.com/questions/77900701/my-gemini-api-key-is-not-working-properly
[10] https://humanwhocodes.com/blog/2019/09/securing-persistent-environment-variables-zeit-now/
[11] https://ai.google.dev/gemini-api/docs/troubleshooting
[12] https://www.cnblogs.com/xgqfrms/p/17121243.html
[13] https://www.googlecloudcommunity.com/gc/AI-ML/Google-Gemini-in-node-js-next-js-project/td-p/722040
[14] https://vercel.com/blog/environment-variables-ui
[15] https://github.com/vercel/ai/issues/860
[16] https://ai.google.dev/gemini-api/docs/structured-output
[17] https://vercel.com/docs/deploy-button/environment-variables
[18] https://firebase.google.com/codelabs/firebase-nextjs
[19] https://discuss.ai.google.dev/t/how-do-i-set-api-key-environment-for-the-repo/33720
[20] https://velog.io/@zifnffk321/next-js-%EB%B9%8C%EB%93%9C-%EC%97%90%EB%9F%AC
[21] https://velog.io/@yena1025/vercel%EB%A1%9C-%EB%B0%B0%ED%8F%AC%ED%95%9C-%EC%95%B1%EC%97%90-.env%ED%99%98%EA%B2%BD-%EB%B3%80%EC%88%98-%EC%A0%81%EC%9A%A9%ED%95%98%EA%B8%B0
[22] https://github.com/vercel/next.js/issues/44998
[23] https://learn.microsoft.com/en-us/answers/questions/2235931/deploying-environment-variables-for-nextjs-and-nod
[24] https://www.reddit.com/r/nextjs/comments/1dqunl5/cant_successfully_create_a_production_build/
[25] https://qiita.com/bisketoriba/items/c5c6873e1e2cedbaae95
[26] https://hackmd.io/@sam30606/HyJo0dloC
[27] https://gist.github.com/patrickloeber/9cd1b134adf6516424224b4b51344077
[28] https://stackoverflow.com/questions/76397896/unable-to-access-environment-variables-in-next-js-api-routes
[29] https://v0.dev/chat/gemini-study-website-l766e3ZTTQv
[30] https://community.fly.io/t/nextjs-build-vs-runtime-environment-variables/13760
[31] https://stackoverflow.com/questions/70850634/nextjs-collecting-page-data-fails-with-status-code-500/70877832
[32] https://stackoverflow.com/questions/66845336/nextjs-environment-variable-undefined-in-api-route
[33] https://stackoverflow.com/questions/79415284/next-js-building-stuck-in-collecting-page-data
[34] https://vercel.com/docs/deployments/troubleshoot-a-build
[35] https://nextjs.org/docs/pages/guides/environment-variables
[36] https://stackoverflow.com/questions/77551616/why-does-next-js-need-runtime-environment-variables-at-build
[37] https://vercel.com/docs/errors/error-list