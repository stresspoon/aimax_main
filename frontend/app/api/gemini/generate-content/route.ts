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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  try {
    const body = await request.json();

    const { topic, title, keywords, contentType } = body;

    if (!topic || !contentType) {
      return NextResponse.json(
        { error: '주제와 콘텐츠 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    const primaryKeyword = Array.isArray(keywords) ? keywords[0] : keywords;
    const subKeywords = Array.isArray(keywords) ? keywords.slice(1) : [];
    const contentGuideline = getContentGuideline(contentType, title, primaryKeyword, subKeywords);
    
    const prompt = `
      ${contentGuideline}
      
      주제: ${topic}
      제목: ${title}
      키워드: ${Array.isArray(keywords) ? keywords.join(', ') : keywords}
      콘텐츠 타입: ${contentType === 'informational' ? '정보성' : '판매성'}
      
      위 전문 가이드라인에 따라 ${contentType === 'informational' ? '정보성' : '판매성'} 블로그 콘텐츠를 작성해주세요.
      
      반드시 다음 JSON 형식으로만 응답해주세요:
      {
        "title": "SEO 최적화된 제목",
        "content": "본문 내용 (정확히 2000-3000자, 공백 포함)",
        "summary": "요약 (150-200자)",
        "tags": ["태그1", "태그2", "태그3", "태그4", "태그5", "태그6", "태그7"]
      }
      
      중요: content는 반드시 2000-3000자 사이여야 하며, 핵심 키워드를 15-20회 포함해야 합니다.
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

    return NextResponse.json({
      title: content.title,
      content: content.content,
      summary: content.summary,
      tags: content.tags
    });

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