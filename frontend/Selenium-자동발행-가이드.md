# Selenium 기반 네이버 블로그 자동발행 시스템

## 개선 사항

### 🎯 writing 폴더 성공 사례 적용
- **Python Selenium** → **Node.js Selenium WebDriver**로 포팅
- 클립보드 복사/붙여넣기 방식으로 봇 감지 우회
- 안정적인 셀렉터 다중 시도 패턴 적용

### 🔧 기술적 개선점

#### 1. **로그인 프로세스**
```javascript
// 클립보드 방식 대신 직접 입력으로 단순화
await idField.sendKeys(id);
await pwField.sendKeys(password);
```

#### 2. **셀렉터 전략**
```javascript
// 다중 셀렉터로 네이버 UI 변경에 대응
const titleSelectors = [
  "[data-placeholder='제목을 입력하세요']",
  '.se-section-documentTitle', 
  '.se-documentTitle',
  "div[contenteditable='true'][data-placeholder*='제목']",
  'input[placeholder*="제목"]'
];
```

#### 3. **콘텐츠 삽입**
```javascript
// JavaScript 실행으로 HTML 직접 삽입
await driver.executeScript(`
  const element = document.querySelector('${selector}');
  if (element) {
    element.innerHTML = arguments[0];
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
`, contentHtml);
```

## 새로운 API 엔드포인트

### `/api/naver-blog/publish-selenium`

**특징:**
- ✅ 5분 실행 시간 (maxDuration: 300)
- ✅ 다중 셀렉터 Fallback 시스템
- ✅ 상세한 로깅 및 오류 처리
- ✅ 임시저장/즉시발행/예약발행 지원

**요청 예시:**
```json
{
  \"id\": \"네이버아이디\",
  \"password\": \"비밀번호\", 
  \"title\": \"블로그 제목\",
  \"contentHtml\": \"<p>HTML 형태의 본문</p>\",
  \"publishType\": \"draft\",
  \"reserveAt\": \"2025-08-10T15:30:00\"
}
```

## UI 개선사항

### 발행 방식 옵션
1. **수동 발행** (안전) - 기존 복사/붙여넣기
2. **Selenium 자동발행** (실험적) - 새로운 자동화

### 사용자 경험
- 실시간 진행상황 로깅
- 실패 시 상세 오류 메시지 제공
- Fallback 옵션 제안

## 배포 고려사항

### 1. **Chrome/ChromeDriver 설치**
Vercel에서는 별도 설정이 필요할 수 있음:
```dockerfile
# Vercel에서 Chrome 실행을 위한 설정
# 현재는 로컬/개발 환경에서 테스트 권장
```

### 2. **환경별 설정**
```javascript
// Vercel 환경 감지
if (process.env.VERCEL) {
  chromeOptions.headless();
  chromeOptions.addArguments('--disable-gpu');
}
```

### 3. **메모리 및 시간 제한**
- 최대 실행시간: 5분 (300초)
- 메모리 사용량 모니터링 필요
- 실패 시 자동 정리 (driver.quit())

## writing 폴더 대비 개선점

### Python → Node.js 포팅
| 기능 | Python (원본) | Node.js (개선) |
|------|--------------|---------------|
| 로그인 | pyperclip 사용 | 직접 입력 |
| 셀렉터 | 단일 시도 | 다중 Fallback |
| 오류처리 | 스크린샷만 | 상세 로깅 |
| 실행환경 | 로컬 전용 | 서버리스 대응 |

### 안정성 향상
- **타임아웃 처리**: 각 단계별 대기시간 설정
- **예외 처리**: 셀렉터별 개별 try-catch
- **리소스 정리**: finally 블록에서 driver 해제
- **로깅**: 각 단계별 상세 진행상황 기록

## 테스트 방법

### 1. 로컬 개발환경
```bash
# Chrome/ChromeDriver 자동 설치됨
npm install
npm run dev
```

### 2. 기능 테스트
1. SEO 글쓰기 페이지에서 콘텐츠 생성
2. \"네이버 블로그 발행 설정\" 클릭
3. \"Selenium 자동발행\" 선택
4. 네이버 계정 정보 입력
5. 발행 타입 선택 (임시저장 권장)

### 3. 오류 디버깅
- 브라우저 콘솔에서 API 응답 확인
- Vercel Functions 로그 모니터링
- 셀렉터 변경 시 다중 시도 패턴 동작 확인

## 향후 계획

### 1. **이미지 업로드 지원**
writing 폴더의 이미지 업로드 로직 추가

### 2. **카테고리/태그 설정**
블로그 카테고리 자동 선택 기능

### 3. **예약발행 UI 개선**
더 직관적인 날짜/시간 선택기

### 4. **성능 최적화**
- 불필요한 대기시간 단축
- 셀렉터 우선순위 최적화
- 병렬 처리 가능한 부분 개선

이제 writing 폴더의 성공적인 Selenium 자동화를 웹 서비스에서도 사용할 수 있습니다! 🚀