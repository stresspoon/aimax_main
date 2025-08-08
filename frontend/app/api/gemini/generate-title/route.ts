import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getTitleGuideline } from '@/utils/contentGuidelines';

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

    const { topic, contentType, model: modelName = 'gemini-2.5-pro', numTitles = 3 } = body;

    if (!topic || !contentType) {
      return NextResponse.json(
        { error: '주제와 콘텐츠 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    const modelId = String(modelName || '').startsWith('gemini') ? modelName : 'gemini-2.5-pro';
    const model = genAI.getGenerativeModel({ model: modelId });

    const guideline = getTitleGuideline(contentType, topic, []);
    const prompt = `
      ${guideline}
      
      다음 주제에 대한 SEO 최적화 블로그 제목을 ${Math.min(Math.max(Number(numTitles) || 3, 1), 5)}개 생성하세요.
      
      주제: ${topic}
      글 성격: ${contentType === 'informational' ? '정보성 콘텐츠' : '판매성 콘텐츠'}
      
      제목 규칙:
      1. 40-60자 사이
      2. 메인 키워드 포함
      3. 클릭을 유도하되 과장/낚시 금지
      4. 2025년 트렌드 반영
      
      오직 아래 JSON 형식으로만 응답:
      { "titles": ["제목1", "제목2", "제목3"] }
    `;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]) as Awaited<ReturnType<typeof model.generateContent>>;

    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'JSON 형식의 응답을 받지 못했습니다.' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const titles = Array.isArray(parsed?.titles) ? parsed.titles.map((t: string) => String(t).trim()).filter(Boolean) : [];
    if (!titles.length) {
      return NextResponse.json(
        { error: '제목 데이터를 추출하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ titles, modelUsed: modelId });

  } catch (error) {
    
    console.error('제목 생성 오류:', error);
    return NextResponse.json(
      { error: '제목 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}