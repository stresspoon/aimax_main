# Google OAuth2 설정 가이드

## Google Cloud Console 설정

### 1. Google Cloud Console 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 2. OAuth 동의 화면 구성
1. **API 및 서비스** > **OAuth 동의 화면** 이동
2. **외부** 사용자 유형 선택
3. 필수 정보 입력:
   - 앱 이름: `AIMAX`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일

### 3. OAuth 2.0 클라이언트 ID 생성
1. **API 및 서비스** > **사용자 인증 정보** 이동
2. **+ 사용자 인증 정보 만들기** > **OAuth 2.0 클라이언트 ID** 선택
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: `AIMAX Web Client`
5. 승인된 자바스크립트 원본:
   - `http://localhost:3000`
   - `https://yourdomain.com` (프로덕션 도메인)
6. 승인된 리디렉션 URI:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google` (프로덕션 도메인)

### 4. 환경 변수 설정
생성된 클라이언트 ID와 클라이언트 보안 비밀을 `.env.local` 파일에 설정:

```bash
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret

# NextAuth Secret (랜덤 문자열 생성 권장)
NEXTAUTH_SECRET=your-secure-random-secret-key
```

## NEXTAUTH_SECRET 생성 방법

터미널에서 다음 명령어 실행:
```bash
openssl rand -base64 32
```

## 테스트 방법

1. 서버 재시작: `npm run dev`
2. `http://localhost:3000/dashboard` 접속
3. Google 로그인 버튼 클릭
4. Google 인증 진행
5. 성공적으로 로그인되면 사용자 정보 표시

## 보안 고려사항

1. **프로덕션 환경**에서는 HTTPS 필수
2. **NEXTAUTH_SECRET**은 절대 공개하지 말 것
3. **Google Client Secret**도 절대 공개하지 말 것
4. 리디렉션 URI는 정확히 일치해야 함

## 문제 해결

### 일반적인 오류들:
- `redirect_uri_mismatch`: 리디렉션 URI 불일치
- `invalid_client`: 클라이언트 ID/Secret 오류
- `access_denied`: OAuth 동의 화면 설정 필요

### 디버깅 방법:
1. 브라우저 개발자 도구 네트워크 탭 확인
2. Next.js 서버 로그 확인
3. Google Cloud Console에서 API 사용량 확인