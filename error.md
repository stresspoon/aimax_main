# Google Sheets API 401 인증 오류: 원인 분석 및 해결 방법

**요약**  
이 오류는 잘못된 또는 누락된 인증 자격증명 때문에 발생합니다. Google Sheets API를 사용할 때는 OAuth 2.0 액세스 토큰, 로그인 쿠키 또는 서비스 계정 키 같은 유효한 인증 정보가 반드시 필요합니다.

## 1. 근본 원인  
Google API는 개인 데이터에 접근하거나 리소스를 수정할 때 OAuth 2.0 인증을 요구합니다. 단순 API 키는 공개 데이터 열람에만 사용할 수 있으며, Sheets API의 대부분 기능에는 사용할 수 없습니다.

## 2. 주요 해결 방법  

### 2.1 OAuth 2.0 클라이언트 인증 설정  
1. [Google Cloud 콘솔](https://console.cloud.google.com)에 접속 후 프로젝트 생성 또는 선택  
2. **APIs & Services → Credentials**에서 “Create Credentials → OAuth client ID” 선택  
3. OAuth 동의 화면 설정  
4. 애플리케이션 유형으로 “Web application” 선택  
5. 승인된 리디렉션 URI 등록  
6. **APIs & Services → Library**에서 “Google Sheets API” (및 필요 시 “Google Drive API”) 활성화  
7. 발급된 **Client ID**와 **Client Secret**을 `.env.local`에 저장  
   ```bash
   GOOGLE_CLIENT_ID="발급된_클라이언트_ID"
   GOOGLE_CLIENT_SECRET="발급된_클라이언트_SECRET"
   ```

### 2.2 서비스 계정 인증 (서버 사이드 권장)  
1. **APIs & Services → Credentials**에서 “Create Credentials → Service account” 생성  
2. 서비스 계정 JSON 키 파일 다운로드  
3. 스프레드시트를 서비스 계정 이메일과 공유(편집 또는 조회 권한 부여)  
4. 코드에서 GoogleAuth 사용  
   ```javascript
   const { google } = require('googleapis');
   const credentials = require('./service-account-key.json');

   const auth = new google.auth.GoogleAuth({
     credentials,
     scopes: ['https://www.googleapis.com/auth/spreadsheets']
   });
   const sheets = google.sheets({ version: 'v4', auth });
   ```

### 2.3 토큰 갱신 구현  
OAuth 액세스 토큰은 보통 1시간 후 만료되므로, 리프레시 토큰을 이용해 자동 갱신 로직을 추가합니다.
```javascript
async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET
    }),
  });
  return res.json();
}
```

## 3. 추가 점검 사항  

- **API 스코프 확인**  
  - Sheets 전체 접근: `https://www.googleapis.com/auth/spreadsheets`  
  - 읽기 전용: `https://www.googleapis.com/auth/spreadsheets.readonly`

- **요청 헤더 검증**  
  ```javascript
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
  ```

- **인증 흐름 디버깅**  
  ```javascript
  console.log('Auth client:', authClient);
  console.log('Access token:', accessToken);
  console.log('Token expiry:', tokenExpiry);
  ```

## 4. Next.js 전용 권장 방법  
사용자 동의가 필요한 OAuth 구현이 번거로울 경우, NextAuth.js를 활용하면 간편합니다.
```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
});
```

## 5. 예방 전략  
1. 서버 작업에는 **서비스 계정** 사용  
2. 401 에러 발생 시 **재인증 로직** 추가  
3. **토큰 관리** 철저히(저장 및 갱신)  
4. 환경 변수 보안 유지(버전 관리 시스템에 노출 금지)  

위 방법 중 하나를 올바르게 구현하면 401 인증 오류가 해결됩니다. 서비스 계정 방식이 서버사이드 자동화 작업에 특히 권장됩니다.