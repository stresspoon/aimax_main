import { NextRequest, NextResponse } from 'next/server';

interface PublishPayload {
  title: string;
  contentHtml: string;
  publishType: 'draft' | 'immediate' | 'reserve';
  reserveAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PublishPayload;
    const { title, contentHtml, publishType, reserveAt } = body;

    if (!title || !contentHtml || !publishType) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // 북마크릿용 JavaScript 코드 생성
    const bookmarkletCode = `
      javascript:(function(){
        const title = ${JSON.stringify(title)};
        const content = ${JSON.stringify(contentHtml)};
        const publishType = ${JSON.stringify(publishType)};
        const reserveAt = ${JSON.stringify(reserveAt || '')};
        
        // 제목 입력
        const titleInput = document.querySelector("[data-placeholder='제목을 입력하세요']") || 
                          document.querySelector('.se-documentTitle');
        if (titleInput) {
          titleInput.click();
          titleInput.innerText = title;
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 본문 입력
        setTimeout(() => {
          const editor = document.querySelector("div[contenteditable='true']") || 
                        document.querySelector('.se_editView');
          if (editor) {
            editor.innerHTML = content;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          // 발행 타입에 따른 처리
          setTimeout(() => {
            if (publishType === 'draft') {
              const saveBtn = document.querySelector('.save_btn__bzc5B') || 
                             document.querySelector("button[aria-label='임시저장']");
              if (saveBtn) saveBtn.click();
            } else if (publishType === 'immediate') {
              const publishBtn = document.querySelector('.publish_btn__m9KHH') || 
                                document.querySelector("button[aria-label='발행']");
              if (publishBtn) publishBtn.click();
            }
            alert('발행 프로세스가 시작되었습니다. 화면의 안내를 따라주세요.');
          }, 1000);
        }, 500);
      })();
    `.replace(/\s+/g, ' ').trim();

    // 사용자에게 전달할 데이터
    const response = {
      success: true,
      method: 'bookmarklet',
      instructions: {
        step1: '네이버 블로그에 수동으로 로그인하세요',
        step2: '글쓰기 페이지(https://blog.naver.com/PostWriteForm.naver)로 이동하세요',
        step3: '아래 북마크릿 코드를 브라우저 주소창에 붙여넣고 실행하세요',
        step4: '자동으로 제목과 내용이 입력됩니다'
      },
      bookmarkletCode,
      alternativeMethod: {
        title,
        content: contentHtml,
        message: '또는 수동으로 복사하여 붙여넣으세요'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('북마크릿 생성 오류:', error);
    return NextResponse.json(
      { error: '북마크릿 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}