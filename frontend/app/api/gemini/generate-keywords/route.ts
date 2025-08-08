import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getKeywordGuideline } from '@/utils/contentGuidelines';
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

    const { topic, title, contentType, model: modelName = 'gemini-2.5-pro', useNaverTrends = true } = body;

    if (!topic || !title || !contentType) {
      return NextResponse.json(
        { error: '주제, 제목, 콘텐츠 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    const modelId = String(modelName || '').startsWith('gemini') ? modelName : 'gemini-2.5-pro';
    const model = genAI.getGenerativeModel({ model: modelId });
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

    // 네이버 트렌드 교차 검증(선택)
    if (useNaverTrends && process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
      try {
        const trendResp = await fetch('https://openapi.naver.com/v1/datalab/search', {
          method: 'POST',
          headers: {
            'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
            endDate: new Date().toISOString().slice(0, 10),
            timeUnit: 'date',
            keywordGroups: [
              { groupName: String(keywords.primary_keyword), keywords: [keywords.primary_keyword] },
              ...keywords.sub_keywords.slice(0, 5).map((kw: string) => ({ groupName: String(kw), keywords: [kw] }))
            ]
          })
        });
        if (trendResp.ok) {
          const trendJson = await trendResp.json();
          // 간단 정렬: 최근 7일 평균 ratio 높은 순으로 보조 키워드 정렬
          const series = Array.isArray(trendJson?.results) ? trendJson.results : [];
          const scoreMap: Record<string, number> = {};
          for (const item of series) {
            const data = Array.isArray(item?.data) ? item.data.slice(-7) : [];
            const avg = data.reduce((s: number, d: any) => s + (Number(d.ratio) || 0), 0) / (data.length || 1);
            const key = String(item.title || item.groupName || '').trim();
            if (key) scoreMap[key] = avg;
          }
          const subKeywords = keywords.sub_keywords
            .slice(0, 6)
            .sort((a: string, b: string) => (scoreMap[b] || 0) - (scoreMap[a] || 0));
          return NextResponse.json({
            primaryKeyword: keywords.primary_keyword,
            subKeywords
          });
        }
      } catch (trendErr) {
        console.warn('Naver Trends fetch 실패:', trendErr);
      }
    }

    // 폴백: 트렌드 미사용/실패 시 원본 반환
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