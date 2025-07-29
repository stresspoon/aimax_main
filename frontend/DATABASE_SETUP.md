# 데이터베이스 설정 가이드

## Supabase PostgreSQL 연결 설정

### 권장 설정: Transaction Pooler (Shared Pooler)

Vercel과 같은 serverless 환경에서는 **Transaction Pooler**를 사용하는 것이 권장됩니다.

```env
# .env.local 파일에 추가
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
```

### Supabase에서 연결 문자열 가져오기

1. Supabase 대시보드에 로그인
2. 프로젝트 선택
3. **Settings** → **Database**
4. **Connection Pooling** 섹션에서
5. **Transaction** 모드 선택
6. 연결 문자열 복사

### 환경별 설정

#### 로컬 개발환경
`.env.local` 파일에 DATABASE_URL 설정

#### Vercel 프로덕션 환경
1. Vercel Dashboard → 프로젝트 → Settings → Environment Variables
2. 다음 환경변수들 추가:
   - `DATABASE_URL`: Supabase Transaction Pooler URL
   - `NEXTAUTH_SECRET`: NextAuth 시크릿 키
   - `NEXTAUTH_URL`: Vercel 도메인 URL
   - `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿
   - `GEMINI_API_KEY`: Google Gemini API 키

### Connection Pooler 옵션

#### Transaction Pooler (권장)
- **포트**: 5432
- **용도**: Serverless 환경 (Vercel, AWS Lambda 등)
- **특징**: 짧고 독립적인 연결, 빠른 응답
- **설정**: `?pgbouncer=true&connection_limit=1`

#### Session Pooler
- **포트**: 6543
- **용도**: 장시간 실행되는 애플리케이션
- **특징**: 지속적인 연결 유지
- **설정**: `?schema=public`

### 연결 테스트

로컬에서 데이터베이스 연결을 테스트하려면:

```bash
npm run dev
curl http://localhost:3000/api/test-db
```

성공적인 연결 시 다음과 같은 응답을 받습니다:
```json
{
  "success": true,
  "message": "데이터베이스 연결 성공",
  "data": {
    "connected": true,
    "stats": {...},
    "timestamp": "..."
  }
}
```