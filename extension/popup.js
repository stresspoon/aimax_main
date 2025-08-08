// popup.js - 채널 닫힘 방지 버전

document.addEventListener('DOMContentLoaded', function() {
  log('Popup DOM loaded');
  initializePopup();
});

const CONFIG = {
  MESSAGE_TIMEOUT: 25000, // background보다 짧게
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
};

function log(message, data = null) {
  console.log(`[AIMAX Popup] ${new Date().toISOString()} - ${message}`, data);
}

async function initializePopup() {
  try {
    // UI 요소 참조
    const syncButton = document.getElementById('syncButton');
    const statusDiv = document.getElementById('status');
    const spreadsheetIdInput = document.getElementById('spreadsheetId');
    const sheetRangeInput = document.getElementById('sheetRange');
    
    if (syncButton) {
      syncButton.addEventListener('click', handleSyncClick);
    }
    
    // 저장된 설정 로드
    await loadSavedConfig();
    
    // 인증 상태 확인
    await checkAuthStatus();
    
    log('Popup initialized successfully');
  } catch (error) {
    log('Popup initialization error:', error);
    updateStatus(`초기화 오류: ${error.message}`, 'error');
  }
}

// 저장된 설정 로드
async function loadSavedConfig() {
  try {
    const result = await chrome.storage.local.get(['spreadsheetConfig']);
    if (result.spreadsheetConfig) {
      const spreadsheetIdInput = document.getElementById('spreadsheetId');
      const sheetRangeInput = document.getElementById('sheetRange');
      
      if (spreadsheetIdInput && result.spreadsheetConfig.spreadsheetId) {
        spreadsheetIdInput.value = result.spreadsheetConfig.spreadsheetId;
      }
      
      if (sheetRangeInput && result.spreadsheetConfig.range) {
        sheetRangeInput.value = result.spreadsheetConfig.range;
      }
    }
  } catch (error) {
    log('Config loading error:', error);
  }
}

// 안전한 메시지 전송 - 채널 닫힘 완전 방지
async function sendMessageSafely(message, timeout = CONFIG.MESSAGE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    let responseReceived = false;
    
    const timer = setTimeout(() => {
      if (!responseReceived) {
        responseReceived = true;
        log('Message timeout:', message.action);
        reject(new Error(`응답 시간 초과 (${timeout/1000}초)`));
      }
    }, timeout);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (responseReceived) {
          log('Late response received, ignoring');
          return;
        }
        
        responseReceived = true;
        clearTimeout(timer);
        
        if (chrome.runtime.lastError) {
          log('Runtime error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          log('No response received');
          reject(new Error('응답이 없습니다'));
        } else if (!response.success) {
          log('Error response:', response);
          reject(new Error(response.error || '알 수 없는 오류'));
        } else {
          log('Success response received');
          resolve(response);
        }
      });
    } catch (error) {
      if (!responseReceived) {
        responseReceived = true;
        clearTimeout(timer);
        reject(error);
      }
    }
  });
}

// 재시도 로직을 포함한 메시지 전송
async function sendMessageWithRetry(message, maxRetries = CONFIG.RETRY_ATTEMPTS) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Message attempt ${attempt}/${maxRetries}:`, message.action);
      const response = await sendMessageSafely(message);
      log(`Message success on attempt ${attempt}`);
      return response;
    } catch (error) {
      lastError = error;
      log(`Message failed on attempt ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        log(`Retrying in ${CONFIG.RETRY_DELAY}ms`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      }
    }
  }
  
  throw lastError;
}

// 인증 상태 확인
async function checkAuthStatus() {
  try {
    updateStatus('🔐 인증 상태 확인 중...', 'loading');
    
    const response = await sendMessageWithRetry({ action: 'getAuthStatus' });
    log('Auth status response:', response);
    
    if (response.authenticated) {
      updateStatus('✅ Google 계정 인증됨', 'success');
    } else {
      // 인증이 필요한 경우 인증 버튼 표시
      updateStatus('❌ Google 계정 인증이 필요합니다', 'warning');
      showAuthButton();
    }
  } catch (error) {
    log('Auth status check failed:', error);
    updateStatus(`❌ 인증 확인 실패: ${error.message}`, 'error');
    showAuthButton();
  }
}

// 인증 버튼 표시
function showAuthButton() {
  // 기존 인증 버튼이 있으면 제거
  const existingAuthBtn = document.getElementById('authButton');
  if (existingAuthBtn) {
    existingAuthBtn.remove();
  }
  
  // 새 인증 버튼 생성
  const authButton = document.createElement('button');
  authButton.id = 'authButton';
  authButton.textContent = '🔑 Google 계정 인증하기';
  authButton.style.cssText = `
    width: 100%;
    padding: 12px;
    font-size: 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin: 8px 0;
    background: #34a853;
    color: white;
    font-weight: 500;
  `;
  
  authButton.addEventListener('click', handleAuthClick);
  
  // 동기화 버튼 앞에 삽입
  const syncButton = document.getElementById('syncButton');
  syncButton.parentNode.insertBefore(authButton, syncButton);
}

// 인증 버튼 클릭 처리
async function handleAuthClick() {
  const authButton = document.getElementById('authButton');
  const originalText = authButton.textContent;
  
  try {
    authButton.disabled = true;
    authButton.textContent = '인증 중...';
    updateStatus('🔐 Google 인증 팝업을 확인해주세요...', 'loading');
    
    log('Starting interactive authentication...');
    const response = await sendMessageWithRetry({ action: 'testAuth' });
    log('Auth response:', response);
    
    if (response.authenticated) {
      updateStatus('✅ Google 계정 인증 완료!', 'success');
      authButton.remove(); // 인증 완료 후 버튼 제거
    } else {
      throw new Error('인증에 실패했습니다.');
    }
    
  } catch (error) {
    log('Authentication failed:', error);
    
    let errorMessage = error.message;
    if (error.message.includes('user did not approve')) {
      errorMessage = '사용자가 권한 요청을 취소했습니다. 다시 시도해주세요.';
    } else if (error.message.includes('OAuth2 not granted')) {
      errorMessage = 'OAuth2 권한이 필요합니다. Google 계정 설정을 확인해주세요.';
    } else if (error.message.includes('invalid_client')) {
      errorMessage = 'OAuth2 설정 오류입니다. 확장프로그램을 재설치해주세요.';
    }
    
    updateStatus(`❌ 인증 실패: ${errorMessage}`, 'error');
  } finally {
    authButton.disabled = false;
    authButton.textContent = originalText;
  }
}

// 동기화 버튼 클릭 처리
async function handleSyncClick() {
  const button = document.getElementById('syncButton');
  const spreadsheetIdInput = document.getElementById('spreadsheetId');
  const sheetRangeInput = document.getElementById('sheetRange');
  
  const originalText = button.textContent;
  
  try {
    // 입력값 검증
    const spreadsheetId = spreadsheetIdInput ? spreadsheetIdInput.value.trim() : '';
    const range = sheetRangeInput ? sheetRangeInput.value.trim() || 'Sheet1!A:C' : 'Sheet1!A:C';
    
    if (!spreadsheetId) {
      throw new Error('스프레드시트 ID를 입력해주세요');
    }
    
    // 버튼 비활성화
    button.disabled = true;
    button.textContent = '동기화 중...';
    
    // 설정 저장
    await chrome.storage.local.set({
      spreadsheetConfig: {
        spreadsheetId: spreadsheetId,
        range: range,
        lastUsed: Date.now()
      }
    });
    
    // 1단계: 인증 테스트
    updateStatus('🔐 Google 인증 확인 중...', 'loading');
    await sendMessageWithRetry({ action: 'testAuth' });
    
    // 2단계: 실제 동기화
    updateStatus('📊 Google Sheets와 동기화 중...', 'loading');
    
    const syncData = {
      action: 'append',
      spreadsheetId: spreadsheetId,
      range: range,
      values: [
        [
          new Date().toISOString(),
          '테스트 데이터',
          window.location?.href || 'Popup',
          `v${chrome.runtime.getManifest().version}`
        ]
      ]
    };
    
    const result = await sendMessageWithRetry({ 
      action: 'syncData', 
      data: syncData 
    });
    
    updateStatus('✅ 동기화 완료!', 'success');
    log('Sync completed:', result);
    
    // 성공시 약간의 딜레이 후 상태 업데이트
    setTimeout(() => {
      updateStatus('준비됨', 'info');
    }, 3000);
    
  } catch (error) {
    log('Sync failed:', error);
    
    let errorMessage = error.message;
    if (error.message.includes('permission') || error.message.includes('권한')) {
      errorMessage = 'Google Sheets 접근 권한이 필요합니다. Google 계정에 로그인하고 권한을 부여해주세요.';
    } else if (error.message.includes('timeout')) {
      errorMessage = '응답 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
    } else if (error.message.includes('Spreadsheet ID')) {
      errorMessage = '유효한 스프레드시트 ID를 입력해주세요.';
    }
    
    updateStatus(`❌ ${errorMessage}`, 'error');
  } finally {
    // 버튼 복원
    button.disabled = false;
    button.textContent = originalText;
  }
}

// 상태 업데이트
function updateStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  log(`Status: [${type.toUpperCase()}] ${message}`);
}

// 전역 오류 처리
window.addEventListener('error', (event) => {
  log('Popup global error:', event.error);
  updateStatus(`시스템 오류: ${event.error.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  log('Popup unhandled promise rejection:', event.reason);
  updateStatus(`처리되지 않은 오류: ${event.reason}`, 'error');
});

log('Popup script loaded');