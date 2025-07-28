# Google Sheets Integration Test Guide

## 테스트 시나리오

### 1. 기본 연동 테스트
- 브라우저에서 http://localhost:3001/dashboard 접속
- Google 계정으로 로그인
- 구글시트 연동 섹션 확인
- 유효한 구글시트 URL 입력 후 연동 테스트

### 2. 테스트용 구글시트 URL 형식
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit#gid=0
https://docs.google.com/spreadsheets/d/[SHEET_ID]
```

### 3. 예상 동작
1. 로그인 상태에서만 연동 가능
2. 유효한 구글시트 URL 검증
3. Google Sheets API를 통한 시트 정보 조회
4. 연동 성공 시 시트 제목과 워크시트 정보 표시
5. 권한 오류/시트 없음 등 적절한 에러 처리

### 4. 오류 상황 테스트
- 잘못된 URL 형식
- 존재하지 않는 시트 ID
- 접근 권한이 없는 시트
- 네트워크 오류

### 5. 성공 확인 사항
- 시트 연동 완료 메시지
- 시트 제목 표시
- 워크시트 개수 표시
- "시트 열기" 버튼으로 원본 시트 접근 가능