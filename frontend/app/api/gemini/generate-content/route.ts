import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getContentGuideline } from '@/utils/contentGuidelines';
import { safeJSONParse } from '@/utils/safeJson';

export async function POST(request: NextRequest) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  try {
    const body = await request.json();

    const { topic, title, keywords, contentType, model: modelName = 'gemini-2.5-pro', tone, audience, goal, reservePublishAt } = body;

    if (!topic || !contentType) {
      return NextResponse.json(
        { error: '주제와 콘텐츠 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    const primaryKeyword = Array.isArray(keywords) ? keywords[0] : keywords;
    const subKeywords = Array.isArray(keywords) ? keywords.slice(1) : [];
    const contentGuideline = getContentGuideline(contentType, title, primaryKeyword, subKeywords);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = `
      ${contentGuideline}
      
      주제: ${topic}
      제목: ${title}
      키워드: ${Array.isArray(keywords) ? keywords.join(', ') : keywords}
      콘텐츠 타입: ${contentType === 'informational' ? '정보성' : '판매성'}
      추가 조건: 톤=${tone || '일반'}, 타깃=${audience || '일반 대중'}, 목표=${goal || '정보 전달'}
      
      위 전문 가이드라인에 따라 ${contentType === 'informational' ? '정보성' : '판매성'} 블로그 콘텐츠를 작성해주세요.
      
      반드시 다음 JSON 형식으로만 응답해주세요:
      {
        "title": "SEO 최적화된 제목",
        "content": "본문 내용 (naver_blog 가이드 기준 길이; 마크다운 소제목/볼드/목록 활용)",
        "summary": "요약 (150-200자)",
        "tags": ["태그1", "태그2", "태그3", "태그4", "태그5", "태그6", "태그7"],
        "image_prompts": ["이미지 프롬프트1", "이미지 프롬프트2", "이미지 프롬프트3"]
      }
      
      중요:
      - content는 naver_blog 가이드(도입/문제/핵심정보/가치제안/증거/효과/CTA 등) 구조와 길이를 따르세요.
      - 핵심 키워드를 15-20회(약 2-3% 밀도) 자연스럽게 포함하세요.
      - 마크다운으로 소제목(##), 굵게(**), 목록(-, 1.)을 적절히 사용하세요.
    `;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 90000)
      )
    ]) as Awaited<ReturnType<typeof model.generateContent>>;

    const response = result.response;
    const text = response.text().trim();

    // JSON 영역 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'JSON 형식의 응답을 받지 못했습니다.' },
        { status: 500 }
      );
    }

    const jsonText = jsonMatch[0];

    const content = safeJSONParse(jsonText, {
      fallback: null,
      requiredKeys: ['title', 'content', 'summary', 'tags'],
      enableReviver: true
    });

    if (!content || !content.title || !content.content || !content.summary || !content.tags) {
      return NextResponse.json(
        { error: '콘텐츠 데이터 구조가 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    interface ContentPayload {
      title: string;
      content: string;
      summary: string;
      tags: string[];
      imagePrompts: string[];
      reservePublishAt?: string;
    }
    const payload: ContentPayload = {
      title: content.title as string,
      content: content.content as string,
      summary: content.summary as string,
      tags: content.tags as string[],
      imagePrompts: Array.isArray(content.image_prompts) ? (content.image_prompts as string[]) : []
    };

    // 예약발행 옵션을 프론트로 전달(서버 스케줄링은 별도 엔드포인트에서 처리)
    if (typeof reservePublishAt === 'string') {
      payload.reservePublishAt = reservePublishAt;
    }

    return NextResponse.json(payload);

  } catch (error) {
    
    console.error('콘텐츠 생성 오류:', error);
    
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json(
        { error: 'Gemini API 타임아웃' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: '콘텐츠 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}