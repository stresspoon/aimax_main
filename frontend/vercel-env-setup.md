# Vercel 환경변수 설정 가이드

## 필수 환경변수 목록

SEO 기반 글쓰기 기능이 정상 작동하려면 Vercel 프로젝트에 다음 환경변수들을 설정해야 합니다:

### 1. GEMINI_API_KEY
- **용도**: Google Gemini AI API 접근
- **값**: `AIzaSyBRNuutI-sQPiP1e7CtUZkeYRKeBdT5cVU` (또는 본인의 API 키)
- **필수**: ✅ Yes

### 2. PUPPETEER_EXECUTABLE_PATH (선택사항)
- **용도**: 로컬 개발 시 Chrome 실행 경로
- **값**: 로컬 환경에만 필요
- **필수**: ❌ No (Vercel에서는 @sparticuz/chromium 사용)

## Vercel 환경변수 설정 방법

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. 해당 프로젝트 선택
3. **Settings** 탭 클릭
4. 왼쪽 메뉴에서 **Environment Variables** 선택
5. 다음 변수 추가:
   - Key: `GEMINI_API_KEY`
   - Value: `AIzaSyBRNuutI-sQPiP1e7CtUZkeYRKeBdT5cVU`
   - Environment: Production, Preview, Development 모두 체크
6. **Save** 클릭
7. 프로젝트 재배포 (Deployments → 최신 배포 → ... 메뉴 → Redeploy)

## 환경변수 확인 방법

Vercel Functions 로그에서 확인:
1. Vercel 대시보드 → Functions 탭
2. 해당 API 엔드포인트 선택
3. Logs 확인

## 주요 수정 사항

### 1. `/api/gemini/generate-title/route.ts`
- 상세한 로깅 추가
- 환경변수 체크 강화
- 에러 메시지 개선

### 2. `/api/schedule/publish/route.ts`  
- Vercel 환경 감지 로직 개선
- Chromium 동적 임포트 처리
- 상세한 디버깅 로그 추가
- 로그인 실패 처리 강화

## 테스트 방법

1. 환경변수 설정 후 재배포
2. SEO 기반 글쓰기 페이지 접근
3. 제목 생성 버튼 클릭 → 정상 작동 확인
4. 네이버 블로그 예약발행 테스트

## 문제 해결

### GEMINI_API_KEY 오류
- Vercel 환경변수 설정 확인
- API 키 유효성 확인
- 재배포 필요

### Puppeteer/Chromium 오류
- `@sparticuz/chromium` 패키지 설치 확인
- Vercel Functions 메모리 제한 확인 (기본 1024MB)
- maxDuration 설정 확인 (현재 60초)

## 추가 권장사항

1. API 키 보안
   - Production 환경에서는 별도의 API 키 사용 권장
   - API 키 사용량 모니터링

2. 에러 모니터링
   - Vercel Analytics 또는 Sentry 연동 권장
   - Function 로그 정기 확인

3. 성능 최적화
   - Puppeteer 캐싱 전략 고려
   - API 응답 시간 모니터링