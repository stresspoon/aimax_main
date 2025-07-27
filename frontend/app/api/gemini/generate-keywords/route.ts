import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getKeywordGuideline } from '../../../utils/contentGuidelines';
import { safeJSONParse } from '../../../utils/safeJson';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { topic, title, contentType } = body;

    if (!topic || !title || !contentType) {
      return NextResponse.json(
        { error: '주제, 제목, 콘텐츠 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    const keywordGuideline = getKeywordGuideline(contentType, topic);
    
    const prompt = `
      ${keywordGuideline}
      
      주제: ${topic}
      제목: ${title}
      콘텐츠 타입: ${contentType === 'informational' ? '정보성' : '판매성'}
      
      위 전문 가이드라인에 따라 SEO 최적화 키워드를 추천해주세요.
      
      JSON 형식으로만 응답해주세요:
      {
        "primary_keyword": "핵심 키워드",
        "sub_keywords": ["보조 키워드1", "보조 키워드2", "보조 키워드3", "보조 키워드4", "보조 키워드5", "보조 키워드6"]
      }
    `;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]) as any;

    const response = await result.response;
    const text = response.text().trim();

    // JSON 영역 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'JSON 형식의 응답을 받지 못했습니다.' },
        { status: 500 }
      );
    }

    const keywords = safeJSONParse(jsonMatch[0], {
      fallback: null,
      requiredKeys: ['primary_keyword', 'sub_keywords'],
      enableReviver: true
    });

    if (!keywords || !keywords.primary_keyword || !keywords.sub_keywords) {
      return NextResponse.json(
        { error: '키워드 데이터 구조가 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      primaryKeyword: keywords.primary_keyword,
      subKeywords: keywords.sub_keywords
    });

  } catch (error) {
    
    console.error('키워드 생성 오류:', error);
    return NextResponse.json(
      { error: '키워드 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}