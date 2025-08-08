// content.js - aria-hidden 및 채널 문제 완전 해결

console.log('AIMAX Content Script 로드됨');

// 설정
const CONFIG = {
  DEBUG: true,
  MESSAGE_TIMEOUT: 20000,
  FOCUS_MANAGEMENT_ENABLED: true
};

function log(message, data = null) {
  if (CONFIG.DEBUG) {
    console.log(`[AIMAX Content] ${new Date().toISOString()} - ${message}`, data);
  }
}

// aria-hidden 오류 완전 방지 - 강화된 버전
class FocusManager {
  constructor() {
    this.observer = null;
    this.focusedElement = null;
    this.init();
  }
  
  init() {
    if (!CONFIG.FOCUS_MANAGEMENT_ENABLED) return;
    
    // 초기 포커스 상태 저장
    this.saveFocusState();
    
    // MutationObserver 설정 - Chrome error.md 가이드에 따른 개선
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'aria-hidden') {
          const element = mutation.target;
          if (element.getAttribute('aria-hidden') === 'true') {
            // 포커스된 하위 요소 찾기
            const focusedElement = element.querySelector(':focus');
            if (focusedElement) {
              log('Found focused element in aria-hidden container, removing focus');
              focusedElement.blur(); // 포커스 제거
              
              // 안전한 요소로 포커스 이동
              const safeElement = document.querySelector('[role="main"]') || 
                                 document.querySelector('main') || 
                                 document.body;
              if (safeElement && typeof safeElement.focus === 'function') {
                safeElement.focus();
                log('Focus moved to safe element');
              }
            }
            
            // Google Docs/Sheets 특별 처리
            this.handleGoogleServicesModal(element);
          }
        }
      });
    });
    
    // 관찰 시작 - Chrome error.md 권장 설정
    if (document.body) {
      this.observer.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-hidden']
      });
      log('Enhanced focus manager initialized');
    }
  }
  
  saveFocusState() {
    this.focusedElement = document.activeElement;
  }
  
  handleMutations(mutations) {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        this.handleAttributeChange(mutation);
      }
    });
  }
  
  handleAttributeChange(mutation) {
    const element = mutation.target;
    const attributeName = mutation.attributeName;
    
    if (attributeName === 'aria-hidden') {
      this.handleAriaHiddenChange(element);
    }
  }
  
  handleAriaHiddenChange(element) {
    if (element.getAttribute('aria-hidden') === 'true') {
      // aria-hidden이 true로 설정된 요소 내의 포커스된 요소들 처리
      const focusedElements = element.querySelectorAll(':focus');
      
      focusedElements.forEach(focusedEl => {
        try {
          // 포커스 제거
          focusedEl.blur();
          
          // 대안적으로 inert 속성 사용 고려
          if ('inert' in focusedEl) {
            focusedEl.inert = true;
            // 나중에 복원을 위해 표시
            focusedEl.setAttribute('data-aimax-was-inert', 'true');
          }
          
          log('Removed focus from hidden element');
        } catch (error) {
          log('Error removing focus:', error);
        }
      });
      
      // 모달이나 다이얼로그가 열릴 때의 추가 처리
      if (element.id === 'docs-chrome' || element.classList.contains('docs-material')) {
        this.handleGoogleDocsModal();
      }
    } else if (element.getAttribute('aria-hidden') === 'false' || 
               element.getAttribute('aria-hidden') === null) {
      // aria-hidden이 해제될 때 inert 복원
      const inertElements = element.querySelectorAll('[data-aimax-was-inert="true"]');
      inertElements.forEach(el => {
        if ('inert' in el) {
          el.inert = false;
          el.removeAttribute('data-aimax-was-inert');
        }
      });
    }
  }
  
  handleGoogleServicesModal(element) {
    // Google 서비스 특별 처리 (Docs, Sheets, Drive 등)
    try {
      // Google 서비스의 다양한 모달 및 다이얼로그 처리
      const googleModalSelectors = [
        '.modal-dialog',
        '.active-account-dialog', 
        '.picker-dialog',
        '[role="dialog"]',
        '[aria-modal="true"]',
        '.goog-modalpopup',
        '.docs-material'
      ];
      
      // 모든 Google 모달에서 포커스 제거
      googleModalSelectors.forEach(selector => {
        const modals = document.querySelectorAll(selector);
        modals.forEach(modal => {
          if (modal.getAttribute('aria-hidden') === 'true') {
            const focusedInModal = modal.querySelectorAll(':focus');
            focusedInModal.forEach(el => {
              try {
                el.blur();
                log('Removed focus from Google modal element');
              } catch (e) {
                // 무시
              }
            });
          }
        });
      });
      
      // Google Docs/Sheets 편집기 영역 특별 처리
      if (element.id === 'docs-chrome' || 
          element.classList.contains('docs-material') ||
          element.classList.contains('waffle-assistant-editor')) {
        this.handleGoogleEditorFocus();
      }
      
      log('Google services modal focus handled');
    } catch (error) {
      log('Error handling Google services modal:', error);
    }
  }
  
  handleGoogleEditorFocus() {
    // Google Docs/Sheets 편집기 포커스 관리
    try {
      // 편집 영역에서 포커스 제거
      const editorElements = document.querySelectorAll([
        '.kix-editor-text-area',
        '.docs-texteventtarget-iframe',
        '.cell-input',
        '[contenteditable="true"]'
      ].join(','));
      
      editorElements.forEach(editor => {
        if (editor.matches(':focus')) {
          editor.blur();
          log('Removed focus from Google editor');
        }
      });
      
      // 메인 컨테이너로 포커스 이동
      const mainContainer = document.querySelector('#docs-chrome') || 
                           document.querySelector('[role="main"]') ||
                           document.body;
      
      if (mainContainer && typeof mainContainer.focus === 'function') {
        mainContainer.focus();
      }
    } catch (error) {
      log('Error handling Google editor focus:', error);
    }
  }
  
  preventAriaHiddenError() {
    try {
      // 현재 포커스된 요소의 포커스 제거
      if (document.activeElement && 
          typeof document.activeElement.blur === 'function' &&
          document.activeElement !== document.body) {
        this.focusedElement = document.activeElement;
        document.activeElement.blur();
      }
      
      // body로 포커스 이동
      if (document.body && typeof document.body.focus === 'function') {
        document.body.focus();
      }
      
      log('Preemptive focus management applied');
    } catch (error) {
      log('Error in preemptive focus management:', error);
    }
  }
  
  restoreFocus() {
    try {
      if (this.focusedElement && 
          typeof this.focusedElement.focus === 'function' &&
          document.body.contains(this.focusedElement)) {
        this.focusedElement.focus();
        log('Focus restored');
      }
    } catch (error) {
      log('Error restoring focus:', error);
    }
  }
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// 포커스 관리자 인스턴스
let focusManager = null;

// 안전한 메시지 전송
async function sendMessageSafely(message, timeout = CONFIG.MESSAGE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    let responseReceived = false;
    
    const timer = setTimeout(() => {
      if (!responseReceived) {
        responseReceived = true;
        reject(new Error('Content script message timeout'));
      }
    }, timeout);
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (responseReceived) return;
        
        responseReceived = true;
        clearTimeout(timer);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response || { success: false, error: 'No response' });
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

// 동기화 버튼 처리
function handleSyncButtons() {
  const buttonSelectors = [
    '[data-sync]',
    '.sync-button',
    '[aria-label*="동기화"]',
    '[aria-label*="sync"]',
    'button[title*="동기화"]',
    'button:contains("동기화")', // 텍스트 포함
    '[data-action="sync"]'
  ];
  
  buttonSelectors.forEach(selector => {
    try {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (!button.hasAttribute('data-aimax-handled')) {
          button.setAttribute('data-aimax-handled', 'true');
          
          button.addEventListener('click', async function(event) {
            log('Sync button clicked');
            
            // aria-hidden 오류 사전 방지
            if (focusManager) {
              focusManager.preventAriaHiddenError();
            }
            
            // 약간의 딜레이 후 처리
            setTimeout(async () => {
              await handleSyncAction(event.target);
            }, 150);
          });
          
          log('Sync button handler attached');
        }
      });
    } catch (error) {
      log('Error handling sync buttons:', error);
    }
  });
}

// 동기화 액션 처리
async function handleSyncAction(button) {
  const originalText = button.textContent;
  const originalDisabled = button.disabled;
  
  try {
    log('Processing sync action');
    
    // 버튼 상태 업데이트
    button.textContent = '동기화 중...';
    button.disabled = true;
    
    // 현재 페이지 정보 수집
    const pageData = {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100) // 첫 100자만
    };
    
    // 백그라운드 스크립트에 메시지 전송
    const response = await sendMessageSafely({
      action: 'syncData',
      data: {
        action: 'append',
        spreadsheetId: 'YOUR_SPREADSHEET_ID', // 실제 ID로 교체
        range: 'Sheet1!A:D',
        values: [[
          pageData.timestamp,
          pageData.url,
          pageData.title,
          'Content Script'
        ]]
      }
    });
    
    if (response.success) {
      showNotification('✅ 동기화 완료', 'success');
      log('Sync completed successfully');
    } else {
      throw new Error(response.error || 'Unknown error');
    }
    
  } catch (error) {
    log('Sync action error:', error);
    
    let errorMessage = error.message;
    if (error.message.includes('timeout')) {
      errorMessage = '응답 시간 초과';
    } else if (error.message.includes('port closed')) {
      errorMessage = '연결이 끊어졌습니다';
    }
    
    showNotification(`❌ 동기화 실패: ${errorMessage}`, 'error');
  } finally {
    // 버튼 복원
    button.textContent = originalText;
    button.disabled = originalDisabled;
    
    // 포커스 복원
    if (focusManager) {
      setTimeout(() => {
        focusManager.restoreFocus();
      }, 500);
    }
  }
}

// 알림 표시
function showNotification(message, type = 'info') {
  // 기존 알림 제거
  const existing = document.querySelector('.aimax-notification');
  if (existing) {
    existing.remove();
  }
  
  // 새 알림 생성
  const notification = document.createElement('div');
  notification.className = `aimax-notification aimax-${type}`;
  notification.textContent = message;
  
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: aimaxSlideIn 0.3s ease-out;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(notification);
  
  // 5초 후 자동 제거
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'aimaxSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

// CSS 스타일 추가
function addStyles() {
  if (document.getElementById('aimax-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'aimax-styles';
  style.textContent = `
    @keyframes aimaxSlideIn {
      from { 
        transform: translateX(100%); 
        opacity: 0; 
      }
      to { 
        transform: translateX(0); 
        opacity: 1; 
      }
    }
    
    @keyframes aimaxSlideOut {
      from { 
        transform: translateX(0); 
        opacity: 1; 
      }
      to { 
        transform: translateX(100%); 
        opacity: 0; 
      }
    }
    
    .aimax-notification {
      pointer-events: auto !important;
      user-select: none !important;
    }
  `;
  
  document.head.appendChild(style);
}

// 구글시트에서 데이터 추출 함수 (기존 기능 유지)
function extractSheetData() {
  try {
    // 구글시트의 셀 데이터 추출
    const cells = document.querySelectorAll('[role="gridcell"]');
    const data = [];
    
    cells.forEach(cell => {
      if (cell.textContent.trim()) {
        data.push(cell.textContent.trim());
      }
    });
    
    return data;
  } catch (error) {
    console.error('시트 데이터 추출 오류:', error);
    return [];
  }
}

// 백그라운드 스크립트와 통신 (기존 기능 유지)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // aria-hidden 오류 방지
  if (focusManager) {
    focusManager.preventAriaHiddenError();
  }
  
  switch (request.action) {
    case 'extractData':
      const data = extractSheetData();
      sendResponse({ success: true, data: data });
      break;
      
    case 'highlightCells':
      // 특정 셀들을 하이라이트
      highlightSelectedCells(request.cells);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// 셀 하이라이트 함수 (기존 기능 유지)
function highlightSelectedCells(cellIds) {
  cellIds.forEach(cellId => {
    const cell = document.querySelector(`[data-cell-id="${cellId}"]`);
    if (cell) {
      cell.style.backgroundColor = '#e3f2fd';
      cell.style.border = '2px solid #2196f3';
    }
  });
}

// 초기화 함수
function initialize() {
  log('Content script initializing');
  
  try {
    // 스타일 추가
    addStyles();
    
    // 포커스 관리자 시작
    focusManager = new FocusManager();
    
    // 동기화 버튼 처리
    handleSyncButtons();
    
    // DOM 변화 감지 (새로운 버튼들을 위해)
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate) {
        handleSyncButtons();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    log('Content script initialized successfully');
  } catch (error) {
    log('Content script initialization error:', error);
  }
}

// DOM 준비 상태 확인 후 초기화
function startWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  if (focusManager) {
    focusManager.destroy();
  }
});

// 페이지 로드 완료 시 백그라운드에 알림 (기존 기능 유지)
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({
    type: 'SHEET_PAGE_LOADED',
    url: window.location.href
  });
});

// 전역 오류 처리
window.addEventListener('error', (event) => {
  log('Content script global error:', event.error);
});

// 시작
startWhenReady();

log('Content script loaded');