사용자께서 겪고 계신 여러 경고 및 오류는 크게 두 가지 이슈로 정리할 수 있습니다.

## 1. `aria-hidden` 경고 ("Blocked aria-hidden on an element because its descendant retained focus")

### 의미
- WAI-ARIA 접근성 표준을 위반하는 상황입니다.
- `aria-hidden="true"`가 설정된 부모 요소 아래에 **포커스(focus)를 가진 자식 요소가 남아있으면 안 된다**는 경고입니다.
- 스크린 리더 등 보조기술 사용자를 위해, 포커스된 요소가 숨겨지면 접근성이 크게 떨어지므로 브라우저가 이를 차단하며 경고를 냅니다.

### Google Docs, Sheets 같은 구글 서비스내에서 자주 발생
- 구글의 동적 UI 내에서 모달, 편집기 등 복잡한 포커스 관리 로직과 `aria-hidden` 속성이 같이 작동할 때 흔히 발생하는 경고입니다.
- 대부분 **구글 자체 UI 내부 문제이며 확장 프로그램 쪽에서 직접 고치기 어려운 상황**입니다.

### 확장 프로그램 차원에서 할 수 있는 대응
- **포커스가 `aria-hidden` 된 영역에 남지 않도록 포커스 강제 이동(blur 처리) 처리**
- `content.js`에서 다음 코드처럼 모달이 열리거나 `aria-hidden` 속성이 변할 때 포커스를 안전한 요소(예: body나 주요 컨텐츠 영역)로 옮겨주는 처리 추가

```javascript
// focus가 숨겨진 영역에 있지 않도록 처리
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.attributeName === 'aria-hidden') {
      const el = mutation.target;
      if (el.getAttribute('aria-hidden') === 'true') {
        const focused = el.querySelector(':focus');
        if (focused) {
          focused.blur(); // 포커스 제거
          // 또는 document.body.focus(); 등으로 포커스 이동
        }
      }
    }
  });
});

observer.observe(document.body, {
  subtree: true,
  attributes: true,
  attributeFilter: ['aria-hidden']
});
```

- 확장 프로그램이 조작할 수 없는 구글 서비스 내부 DOM에서는 완전 해결이 어려우므로
- 사용자의 작업에 지장을 주지 않는 선에서 경고를 무시해도 무방한 경우가 많습니다.

## 2. Content Security Policy(CSP) 관련 `blob:` URL 스크립트 차단

### 의미
- `blob:` 프로토콜을 통해 동적으로 생성되는 스크립트를 로드하려는데,
- CSP 정책에 `blob:` 스크립트 로드가 허용되지 않아 차단된다는 메시지입니다.
- 구글 서비스들이 내부적으로 `blob:` 스크립트를 많이 사용하고, CSP가 까다로워서 나타납니다.

### 원인
- 확장프로그램에서 Google Docs, Sheets, Accounts 등 구글 도메인에 content script를 삽입할 때 발생 가능
- 구글 측에서 CSP를 엄격히 관리하기 때문에, 확장프로그램 내에서 CSP를 우회하거나 바꾸는 건 원천적으로 제한됨

### 대응 방법
- `manifest.json`에서 `"host_permissions"`에 관련 구글 도메인 명확히 추가
- `content_security_policy` 설정에서 최소한의 허용 범위만 주어 CSP와 충돌하지 않도록 설계
- 다만 blob 스크립트 로드 문제는 구글 서비스 내부 이슈이므로
- 확장 프로그램에서는 크게 개입하지 않고, 기능에 영향 없이 무시해도 되는 경우가 많습니다.

## 3. `Uncaught (in promise) The message port closed before a response was received.` 오류

### 의미
- 확장 프로그램 내 `chrome.runtime.sendMessage` 등의 메시지 통신에서
- 메시지 수신 측(listener)가 `true`를 반환하며 비동기 응답을 약속했는데,
- 실제로 응답이 도착하기 전에 message channel이 닫혀서 발생하는 오류입니다.

### 해결책
1. **background.js, content.js, popup.js의 메시지 이벤트 리스너에서 항상 `return true;`로 비동기 응답을 명확히 처리**
2. **비동기 처리 함수 내에서 `sendResponse()`를 반드시 호출**
3. **응답 보내기 전에 예외가 발생하면 이를 포착해서 적절한 응답을 꼭 전송**
4. **장시간 처리시 일정 시간 후 타임아웃 처리 로직 추가 권장**

예시(background.js):

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      // 비동기 작업 수행 예: 구글 API 호출
      const result = await someAsyncFunction(request);
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // 비동기 응답임을 반드시 명시
});
```

## 요약

| 문제                                  | 원인                                         | 조치 방법                                                         |
|-------------------------------------|--------------------------------------------|-----------------------------------------------------------------|
| aria-hidden 포커스 경고              | 접근성 관련, 숨긴 요소 내부에 포커스 유지          | MutationObserver로 포커스 blur 처리, 포커스 안전한 요소로 이동                                |
| CSP blob 스크립트 차단              | Google 서비스 자체 CSP 정책 엄격함               | `manifest.json`에서 도메인 권한 확인, CSP 최소 제한, 무시 가능                                  |
| 메시지 포트 닫힘 오류               | 메시지 응답 누락 또는 비동기 처리 누락          | 메시지 리스너에서 `return true`, 예외 핸들링, `sendResponse` 호출 보장                        |

혹시 확장 프로그램 코드(특히 메시지 통신, 포커스 관리 부분)를 원하시면, 구체적인 샘플을 별도로 제공해 드릴 수 있습니다.  
또한, 이번에 제공한 권장 코드들을 실제 적용해 보시고 개선이 필요한 부분 알려주시면 추가 도움 드리겠습니다.

[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/28483932/dd41ac06-a43d-4e71-ac26-041481e43aa9/ARCHITECTURE.md