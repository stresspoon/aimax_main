// background.js - 메시지 채널 닫힘 완전 해결 버전

// 전역 설정
const CONFIG = {
  DEBUG: true,
  MESSAGE_TIMEOUT: 30000, // 30초 타임아웃
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

function log(message, data = null) {
  if (CONFIG.DEBUG) {
    console.log(`[AIMAX BG] ${new Date().toISOString()} - ${message}`, data);
  }
}

// 활성 연결 추적
const activeConnections = new Map();
const pendingMessages = new Map();

// 확장프로그램 초기화
chrome.runtime.onInstalled.addListener(async () => {
  log('Extension installed/updated');
  await initializeExtension();
});

chrome.runtime.onStartup.addListener(async () => {
  log('Extension startup');
  await initializeExtension();
});

async function initializeExtension() {
  try {
    const settings = await chrome.storage.local.get(['extensionConfig']);
    if (!settings.extensionConfig) {
      await chrome.storage.local.set({
        extensionConfig: {
          initialized: true,
          version: chrome.runtime.getManifest().version,
          lastStartup: Date.now()
        }
      });
    }
    log('Extension initialized successfully');
  } catch (error) {
    log('Initialization error:', error);
  }
}

// 안전한 OAuth2 토큰 획득 - 디버깅 강화
async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    log(`Getting auth token - interactive: ${interactive}`);
    
    const timeoutId = setTimeout(() => {
      log('Auth timeout after 15 seconds');
      reject(new Error('Auth timeout after 15 seconds'));
    }, 15000);

    try {
      // manifest.json의 oauth2 설정 확인
      const manifest = chrome.runtime.getManifest();
      log('Manifest OAuth2 config:', manifest.oauth2);
      
      const authOptions = { 
        interactive: interactive,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      };
      
      log('Auth options:', authOptions);
      
      chrome.identity.getAuthToken(authOptions, (token) => {
        clearTimeout(timeoutId);
        
        log('Auth callback executed');
        log('Chrome runtime lastError:', chrome.runtime.lastError);
        log('Token received:', token ? 'YES (length: ' + token.length + ')' : 'NO');
        
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          log('Auth error details:', errorMsg);
          
          // 일반적인 OAuth 오류들에 대한 상세 설명
          if (errorMsg.includes('OAuth2 not granted or revoked')) {
            reject(new Error('OAuth2 권한이 부여되지 않았거나 취소되었습니다. Google 계정 설정에서 확장프로그램 권한을 확인해주세요.'));
          } else if (errorMsg.includes('The user did not approve access')) {
            reject(new Error('사용자가 권한 요청을 거부했습니다. 다시 시도해주세요.'));
          } else if (errorMsg.includes('invalid_client')) {
            reject(new Error('OAuth2 클라이언트 설정이 잘못되었습니다. manifest.json의 client_id를 확인해주세요.'));
          } else {
            reject(new Error(`인증 오류: ${errorMsg}`));
          }
        } else if (!token) {
          log('No token received - possible reasons: user cancelled, network issue, or OAuth config problem');
          reject(new Error('토큰을 받지 못했습니다. 인증 팝업이 표시되지 않았거나 취소되었을 수 있습니다.'));
        } else {
          log('Auth token received successfully, length:', token.length);
          resolve(token);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      log('Exception in getAuthToken:', error);
      reject(error);
    }
  });
}

// Google Sheets API 호출
async function callSheetsAPI(endpoint, method = 'GET', body = null) {
  let token;
  
  try {
    token = await getAuthToken();
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const config = {
      method: method,
      headers: headers
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(body);
    }

    log(`API Call: ${method} ${endpoint}`);
    
    const response = await Promise.race([
      fetch(endpoint, config),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API request timeout')), CONFIG.MESSAGE_TIMEOUT)
      )
    ]);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    log('API Success');
    return data;
    
  } catch (error) {
    log('API Error:', error);
    
    // 토큰 만료 시 재시도
    if (error.message.includes('401') && token) {
      log('Token expired, clearing cache and retrying');
      chrome.identity.removeCachedAuthToken({ token: token }, async () => {
        // 한 번만 재시도
        try {
          return await callSheetsAPI(endpoint, method, body);
        } catch (retryError) {
          throw retryError;
        }
      });
    }
    
    throw error;
  }
}

// 동기화 수행
async function performSync(data) {
  try {
    log('Starting sync operation', data);
    
    const { action, spreadsheetId, range, values } = data;
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }
    
    let result;
    const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    switch (action) {
      case 'read':
        result = await callSheetsAPI(`${endpoint}/values/${range}`);
        break;
      
      case 'write':
        result = await callSheetsAPI(
          `${endpoint}/values/${range}?valueInputOption=RAW`, 
          'PUT', 
          { values: values }
        );
        break;
      
      case 'append':
        result = await callSheetsAPI(
          `${endpoint}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 
          'POST', 
          { values: values }
        );
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // 성공 정보 저장
    await chrome.storage.local.set({
      lastSync: {
        timestamp: Date.now(),
        action: action,
        success: true,
        spreadsheetId: spreadsheetId
      }
    });

    log('Sync completed successfully');
    return result;
    
  } catch (error) {
    log('Sync failed:', error);
    
    // 오류 정보 저장
    await chrome.storage.local.set({
      lastSync: {
        timestamp: Date.now(),
        action: data.action,
        success: false,
        error: error.message
      }
    });
    
    throw error;
  }
}

// 강화된 메시지 리스너 - Chrome error.md 권장사항 적용
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Message received', { action: request.action, sender: sender.id });

  // Chrome error.md 권장: 비동기 처리를 즉시 실행 함수로 래핑
  (async () => {
    try {
      const { action } = request;
      let result;

      switch (action) {
        case 'getAuthStatus':
          try {
            const token = await getAuthToken(false);
            result = { authenticated: !!token };
          } catch (error) {
            result = { authenticated: false, error: error.message };
          }
          break;
        
        case 'testAuth':
          const token = await getAuthToken(true);
          result = { authenticated: !!token, tokenReceived: true };
          break;
        
        case 'syncData':
          if (!request.data) {
            throw new Error('Sync data is required');
          }
          const syncResult = await performSync(request.data);
          result = { data: syncResult };
          break;
        
        case 'getConfig':
          const config = await chrome.storage.local.get(['extensionConfig', 'lastSync']);
          result = { config: config };
          break;
        
        case 'clearAuth':
          chrome.identity.clearAllCachedAuthTokens(() => {
            log('All auth tokens cleared');
          });
          result = { cleared: true };
          break;
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Chrome error.md 권장: 성공 응답 보장
      sendResponse({ success: true, ...result });
      log('Response sent successfully for action:', action);
      
    } catch (error) {
      log('Message handling error:', error);
      
      // Chrome error.md 권장: 예외 발생시에도 반드시 응답 전송
      sendResponse({ 
        success: false, 
        error: error.message,
        timestamp: Date.now()
      });
    }
  })();

  // Chrome error.md 권장: 비동기 응답임을 반드시 명시
  return true;
});

// 연결 상태 모니터링
setInterval(() => {
  const now = Date.now();
  for (const [messageId, connection] of activeConnections.entries()) {
    if (now - connection.timestamp > CONFIG.MESSAGE_TIMEOUT) {
      log('Cleaning up stale connection', messageId);
      activeConnections.delete(messageId);
    }
  }
}, 10000); // 10초마다 정리

// 탭 닫힘 감지
chrome.tabs.onRemoved.addListener((tabId) => {
  log('Tab closed:', tabId);
  // 해당 탭의 메시지 정리
  for (const [messageId, connection] of activeConnections.entries()) {
    if (connection.sender.tab && connection.sender.tab.id === tabId) {
      log('Cleaning up connection for closed tab', messageId);
      activeConnections.delete(messageId);
    }
  }
});

// 전역 오류 처리
self.addEventListener('error', (event) => {
  log('Global error in background script:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  log('Unhandled promise rejection in background script:', event.reason);
});

log('Background script loaded and initialized');