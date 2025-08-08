import { NextRequest, NextResponse } from 'next/server';
import { Builder, By, Key, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5분으로 증가

interface PublishPayload {
  id: string;
  password: string;
  title: string;
  contentHtml: string;
  publishType: 'draft' | 'immediate' | 'reserve';
  reserveAt?: string;
}

export async function POST(request: NextRequest) {
  console.log('[Selenium Blog API] Request received');
  
  let driver: WebDriver | null = null;
  
  try {
    const body = (await request.json()) as PublishPayload;
    const { id, password, title, contentHtml, publishType, reserveAt } = body;
    
    console.log('[Selenium Blog API] Payload received:', {
      hasId: !!id,
      hasPassword: !!password,
      hasTitle: !!title,
      contentLength: contentHtml?.length || 0,
      publishType
    });

    if (!id || !password || !title || !contentHtml || !publishType) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    console.log('[Selenium Blog API] Setting up Chrome driver...');
    
    // Chrome 옵션 설정
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    
    // Vercel 환경에서는 headless 모드 사용
    if (process.env.VERCEL) {
      chromeOptions.headless();
      chromeOptions.addArguments('--disable-gpu');
    }
    
    // WebDriver 생성
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    console.log('[Selenium Blog API] Driver created, navigating to login page...');
    
    // 네이버 로그인 페이지 접속
    await driver.get('https://nid.naver.com/nidlogin.login');
    await driver.sleep(2000);
    
    // 로그인 수행
    console.log('[Selenium Blog API] Performing login...');
    
    // 아이디 입력
    const idField = await driver.wait(until.elementLocated(By.id('id')), 10000);
    await idField.click();
    await idField.clear();
    await idField.sendKeys(id);
    await driver.sleep(500);
    
    // 비밀번호 입력
    const pwField = await driver.findElement(By.id('pw'));
    await pwField.click();
    await pwField.clear();
    await pwField.sendKeys(password);
    await driver.sleep(500);
    
    // 로그인 버튼 클릭
    const loginButton = await driver.findElement(By.id('log.login'));
    await loginButton.click();
    await driver.sleep(3000);
    
    // 로그인 성공 확인
    const currentUrl = await driver.getCurrentUrl();
    console.log('[Selenium Blog API] Current URL after login:', currentUrl);
    
    if (currentUrl.includes('nidlogin')) {
      console.error('[Selenium Blog API] Login may have failed - still on login page');
      return NextResponse.json(
        { error: '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.' },
        { status: 401 }
      );
    }
    
    console.log('[Selenium Blog API] Login successful, navigating to blog write page...');
    
    // 네이버 블로그 글쓰기 페이지로 이동
    await driver.get('https://blog.naver.com/PostWriteForm.naver');
    await driver.sleep(5000); // 페이지 로딩 대기
    
    // 제목 입력
    console.log('[Selenium Blog API] Entering title...');
    const titleSelectors = [
      \"[data-placeholder='제목을 입력하세요']\",
      '.se-section-documentTitle',
      '.se-documentTitle',
      \"div[contenteditable='true'][data-placeholder*='제목']\",
      'input[placeholder*=\"제목\"]'
    ];
    
    let titleSet = false;
    for (const selector of titleSelectors) {
      try {
        const titleElement = await driver.wait(until.elementLocated(By.css(selector)), 5000);
        await titleElement.click();
        await titleElement.clear();
        await titleElement.sendKeys(title);
        titleSet = true;
        console.log(`[Selenium Blog API] Title set using selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`[Selenium Blog API] Title selector ${selector} failed:`, e.message);
        continue;
      }
    }
    
    if (!titleSet) {
      console.error('[Selenium Blog API] Failed to set title with any selector');
      return NextResponse.json(
        { error: '제목 입력에 실패했습니다. 네이버 블로그 에디터가 변경되었을 수 있습니다.' },
        { status: 500 }
      );
    }
    
    await driver.sleep(2000);
    
    // 본문 입력
    console.log('[Selenium Blog API] Entering content...');
    const contentSelectors = [
      \"div[contenteditable='true']\",
      '.se_editView',
      '.se-component-content[contenteditable=\"true\"]',
      '.se-text-paragraph'
    ];
    
    let contentSet = false;
    for (const selector of contentSelectors) {
      try {
        const contentElement = await driver.wait(until.elementLocated(By.css(selector)), 5000);
        await contentElement.click();
        
        // JavaScript를 사용해서 HTML 내용 설정
        await driver.executeScript(`
          const element = document.querySelector('${selector}');
          if (element) {
            element.innerHTML = arguments[0];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `, contentHtml);
        
        contentSet = true;
        console.log(`[Selenium Blog API] Content set using selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`[Selenium Blog API] Content selector ${selector} failed:`, e.message);
        continue;
      }
    }
    
    if (!contentSet) {
      console.error('[Selenium Blog API] Failed to set content with any selector');
      return NextResponse.json(
        { error: '본문 입력에 실패했습니다. 네이버 블로그 에디터가 변경되었을 수 있습니다.' },
        { status: 500 }
      );
    }
    
    await driver.sleep(3000);
    
    // 발행 처리
    console.log(`[Selenium Blog API] Processing publish type: ${publishType}`);
    
    if (publishType === 'draft') {
      // 임시저장
      const tempSaveSelectors = [
        '.save_btn__bzc5B',
        \"button[aria-label='임시저장']\",
        '.btn_temp_save',
        \"button:contains('임시저장')\",
        '.publish__temp-save'
      ];
      
      let tempSaved = false;
      for (const selector of tempSaveSelectors) {
        try {
          const tempSaveButton = await driver.wait(until.elementLocated(By.css(selector)), 5000);
          await tempSaveButton.click();
          tempSaved = true;
          console.log(`[Selenium Blog API] Temp save clicked using: ${selector}`);
          break;
        } catch (e) {
          console.log(`[Selenium Blog API] Temp save selector ${selector} failed:`, e.message);
          continue;
        }
      }
      
      if (!tempSaved) {
        console.warn('[Selenium Blog API] Could not find temp save button, trying publish button');
        // 임시저장 버튼을 찾지 못한 경우 발행 버튼으로 시도
        publishType === 'immediate';
      }
    }
    
    if (publishType === 'immediate') {
      // 즉시 발행
      const publishSelectors = [
        '.publish_btn__m9KHH',
        \"button[aria-label='발행']\",
        '.btn_register',
        \"button:contains('발행')\",
        '.publish__button'
      ];
      
      let published = false;
      for (const selector of publishSelectors) {
        try {
          const publishButton = await driver.wait(until.elementLocated(By.css(selector)), 5000);
          await publishButton.click();
          published = true;
          console.log(`[Selenium Blog API] Publish clicked using: ${selector}`);
          break;
        } catch (e) {
          console.log(`[Selenium Blog API] Publish selector ${selector} failed:`, e.message);
          continue;
        }
      }
      
      if (!published) {
        console.error('[Selenium Blog API] Failed to find publish button');
        return NextResponse.json(
          { error: '발행 버튼을 찾을 수 없습니다.' },
          { status: 500 }
        );
      }
    }
    
    if (publishType === 'reserve') {
      if (!reserveAt) {
        return NextResponse.json({ error: '예약 시간이 필요합니다.' }, { status: 400 });
      }
      
      // 예약 발행 로직 (기본적인 구현)
      try {
        // 발행 옵션 버튼 클릭
        const optionButton = await driver.wait(
          until.elementLocated(By.css(\"button[aria-label='발행 옵션'], .publish-option-button\")),
          5000
        );
        await optionButton.click();
        await driver.sleep(1000);
        
        // 예약 발행 선택
        const reserveRadio = await driver.wait(
          until.elementLocated(By.css(\"input[type='radio'][value='reserve'], .reserve-option\")),
          5000
        );
        await reserveRadio.click();
        await driver.sleep(1000);
        
        // 예약 시간 입력 (실제 UI에 따라 조정 필요)
        const dateTimeInput = await driver.findElement(By.css(\"input[name='reserveDateTime'], .datetime-input\"));
        await dateTimeInput.clear();
        await dateTimeInput.sendKeys(reserveAt);
        
        // 확인 버튼 클릭
        const confirmButton = await driver.findElement(By.css(\"button[type='submit'], .confirm-button\"));
        await confirmButton.click();
        
        console.log('[Selenium Blog API] Reserve publish set successfully');
      } catch (e) {
        console.error('[Selenium Blog API] Reserve publish failed:', e);
        return NextResponse.json(
          { error: '예약 발행 설정에 실패했습니다.' },
          { status: 500 }
        );
      }
    }
    
    // 완료 대기
    await driver.sleep(3000);
    
    console.log('[Selenium Blog API] Process completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: `네이버 블로그 ${publishType === 'draft' ? '임시저장' : publishType === 'immediate' ? '발행' : '예약발행'}이 완료되었습니다.`,
      publishType 
    });

  } catch (error) {
    console.error('[Selenium Blog API] Error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { 
        error: '네이버 블로그 발행 중 오류가 발생했습니다.',
        details: errorMessage 
      }, 
      { status: 500 }
    );
  } finally {
    if (driver) {
      try {
        await driver.quit();
        console.log('[Selenium Blog API] Driver closed');
      } catch (e) {
        console.error('[Selenium Blog API] Error closing driver:', e);
      }
    }
  }
}