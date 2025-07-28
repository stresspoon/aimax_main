import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const { topic, contentType } = body;

    if (!topic || !contentType) {
      return NextResponse.json(
        { error: '주제와 콘텐츠 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    const prompt = `
      다음 주제에 대한 SEO 최적화된 블로그 제목을 1개만 생성해주세요.
      
      주제: ${topic}
      글 성격: ${contentType === 'informational' ? '정보성 콘텐츠' : '판매성 콘텐츠'}
      
      요구사항:
      1. 40-60자 사이
      2. 키워드를 포함할 것
      3. 흥미를 유발하고 클릭을 유도할 수 있는 제목
      4. 2025년 트렌드를 반영
      
      제목만 출력하고 다른 설명은 하지 마세요.
    `;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]) as Awaited<ReturnType<typeof model.generateContent>>;

    const response = result.response;
    const title = response.text().trim();

    return NextResponse.json({ title });

  } catch (error) {
    
    console.error('제목 생성 오류:', error);
    return NextResponse.json(
      { error: '제목 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}