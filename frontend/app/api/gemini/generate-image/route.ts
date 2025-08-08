import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  try {
    const { prompts, model: modelName = 'gemini-2.5-pro' } = await request.json();
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'prompts 배열이 필요합니다.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    // 간단 처리: 이미지 프롬프트에 대한 캡션/alt만 생성(이미지 바이너리는 별도 제공자 필요)
    const prompt = `다음 각 항목에 대해 블로그용 이미지 캡션과 대체텍스트(alt)를 생성하세요.\n\n` +
      prompts.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') +
      `\n\nJSON 형식으로만 응답: { "items": [ { "caption": "...", "alt": "..." } ] }`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
    ]) as Awaited<ReturnType<typeof model.generateContent>>;

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'JSON 형식의 응답을 받지 못했습니다.' }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return NextResponse.json({ items });
  } catch (error) {
    console.error('이미지 캡션/alt 생성 오류:', error);
    return NextResponse.json({ error: '이미지 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}


