import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

interface PublishPayload {
  id: string;
  password: string;
  title: string;
  contentHtml: string; // 이미 Markdown -> HTML 변환 후 전달 권장
  publishType: 'draft' | 'immediate' | 'reserve';
  reserveAt?: string; // ISO string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PublishPayload;
    const { id, password, title, contentHtml, publishType, reserveAt } = body;

    if (!id || !password || !title || !contentHtml || !publishType) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    const isLocal = !process.env.VERCEL;
    const executablePath = isLocal
      ? undefined
      : await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36');

    // 로그인
    await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'networkidle2' });
    await page.type('#id', id, { delay: 20 });
    await page.type('#pw', password, { delay: 20 });
    await page.click('#log\.login');
    await new Promise((r) => setTimeout(r, 2000));

    // 블로그 글쓰기 페이지로 이동
    await page.goto('https://blog.naver.com/PostWriteForm.naver', { waitUntil: 'networkidle2' });

    // 제목 입력(에디터 버전에 따라 셀렉터 다양성 고려)
    const titleSelectors = [
      "[data-placeholder='제목을 입력하세요']",
      '.se-section-documentTitle',
      '.se-documentTitle',
      "div[contenteditable='true'][data-placeholder*='제목']"
    ];
    let titleSet = false;
    for (const sel of titleSelectors) {
      const el = await page.$(sel);
      if (el) {
        await el.click({ delay: 50 });
        await page.keyboard.type(title, { delay: 5 });
        titleSet = true;
        break;
      }
    }
    if (!titleSet) {
      await browser.close();
      return NextResponse.json({ error: '제목 입력 실패' }, { status: 500 });
    }

    // 본문 입력(간단히 contenteditable 영역에 HTML 붙여넣기)
    const editorSelectors = [
      "div[contenteditable='true']",
      '.se_editView',
      '.se_component_wrap'
    ];
    let contentSet = false;
    for (const sel of editorSelectors) {
      const el = await page.$(sel);
      if (el) {
        await page.evaluate((selector, html) => {
          const node = document.querySelector(selector) as HTMLElement | null;
          if (node) node.innerHTML = html;
        }, sel, contentHtml);
        contentSet = true;
        break;
      }
    }
    if (!contentSet) {
      await browser.close();
      return NextResponse.json({ error: '본문 입력 실패' }, { status: 500 });
    }

    // 발행 옵션 처리
    if (publishType === 'draft') {
      // 임시저장 버튼 시도
      const draftSelectors = ['.save_btn__bzc5B', "button[aria-label='임시저장']"]; // 셀렉터는 상황에 따라 변경 필요
      for (const sel of draftSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          break;
        }
      }
    } else if (publishType === 'immediate') {
      const publishSelectors = ['.publish_btn__m9KHH', "button[aria-label='발행']"]; 
      for (const sel of publishSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          break;
        }
      }
    } else if (publishType === 'reserve') {
      if (!reserveAt) {
        await browser.close();
        return NextResponse.json({ error: '예약 시간(reserveAt)이 필요합니다.' }, { status: 400 });
      }
      // 예약 발행 UI 조작(에디터에 따라 다를 수 있으므로 기본 흐름 구현)
      // 1) 발행 옵션 열기 2) 예약발행 선택 3) 날짜/시간 입력 4) 확인/발행
      // 구체 셀렉터는 변경될 수 있으므로 예외처리 다중 시도
      try {
        // 예: 옵션 버튼 클릭 → 예약 체크 → 날짜 입력 → 확인
        await page.click("button[aria-label='발행 옵션']");
        await new Promise((r) => setTimeout(r, 500));
        await page.click("input[type='radio'][value='reserve']");
        await new Promise((r) => setTimeout(r, 500));
        // 단순히 값 입력(실제 네이버 UI 포맷에 맞춰야 함)
        await page.type("input[name='reserveDateTime']", reserveAt);
        await new Promise((r) => setTimeout(r, 300));
        await page.click("button[type='submit']");
      } catch (e) {
        console.warn('예약 발행 UI 조작 실패, 에디터 버전과 셀렉터 확인 필요:', e);
      }
    }

    await new Promise((r) => setTimeout(r, 1500));
    await browser.close();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('예약발행 처리 오류:', error);
    return NextResponse.json({ error: '예약발행 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}


