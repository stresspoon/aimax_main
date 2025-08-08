// OAuth2 디버깅 스크립트
console.log('OAuth2 Debug Script Loaded');

// 1. Chrome Extension ID 확인
const extensionId = chrome.runtime.id;
console.log('Extension ID:', extensionId);

// 2. Manifest 정보 확인
const manifest = chrome.runtime.getManifest();
console.log('Manifest OAuth2 Config:', manifest.oauth2);
console.log('Manifest Permissions:', manifest.permissions);
console.log('Manifest Host Permissions:', manifest.host_permissions);

// 3. Chrome Identity API 사용 가능 여부 확인
console.log('Chrome Identity API Available:', !!chrome.identity);
console.log('Chrome Identity Methods:', Object.keys(chrome.identity || {}));

// 4. OAuth2 상태 확인
async function checkOAuth2Status() {
  console.log('\n=== OAuth2 Status Check ===');
  
  try {
    // 비대화형 토큰 확인
    console.log('Checking non-interactive token...');
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      console.log('Non-interactive result:');
      console.log('- Token:', token ? `YES (${token.length} chars)` : 'NO');
      console.log('- Error:', chrome.runtime.lastError?.message || 'None');
      
      if (!token) {
        console.log('\n--- Attempting Interactive Auth ---');
        chrome.identity.getAuthToken({ interactive: true }, (interactiveToken) => {
          console.log('Interactive result:');
          console.log('- Token:', interactiveToken ? `YES (${interactiveToken.length} chars)` : 'NO');
          console.log('- Error:', chrome.runtime.lastError?.message || 'None');
          
          if (chrome.runtime.lastError) {
            console.error('OAuth2 Error Details:', chrome.runtime.lastError.message);
            
            // 일반적인 오류들 분석
            const errorMsg = chrome.runtime.lastError.message;
            if (errorMsg.includes('OAuth2 not granted or revoked')) {
              console.log('💡 해결책: Google 계정 설정에서 확장프로그램 권한을 확인하세요.');
            } else if (errorMsg.includes('invalid_client')) {
              console.log('💡 해결책: manifest.json의 client_id가 Google Cloud Console과 일치하는지 확인하세요.');
            } else if (errorMsg.includes('user did not approve')) {
              console.log('💡 해결책: 사용자가 권한 요청을 거부했습니다.');
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('OAuth2 check failed:', error);
  }
}

// 5. Google Cloud Console 설정 확인을 위한 정보
function showSetupInfo() {
  console.log('\n=== Google Cloud Console 확인 사항 ===');
  console.log('1. OAuth2 Client ID:', manifest.oauth2?.client_id);
  console.log('2. Extension ID:', extensionId);
  console.log('3. Required Redirect URI:', `chrome-extension://${extensionId}/`);
  console.log('4. Required Origins:', [
    `chrome-extension://${extensionId}`,
    `https://${extensionId}.chromiumapp.org`
  ]);
  console.log('\n이 정보들이 Google Cloud Console의 OAuth2 클라이언트 설정과 일치해야 합니다.');
}

// 6. 스토리지 상태 확인
async function checkStorageStatus() {
  console.log('\n=== Storage Status ===');
  try {
    const storage = await chrome.storage.local.get(null);
    console.log('Local Storage:', storage);
  } catch (error) {
    console.error('Storage check failed:', error);
  }
}

// 실행
checkOAuth2Status();
showSetupInfo();
checkStorageStatus();