import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SheetsSync } from '@/lib/sheetsSync';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const { sheetId, sheetName } = body;

    if (!sheetId || !sheetName) {
      return NextResponse.json(
        { error: '시트 ID와 시트명이 필요합니다.' },
        { status: 400 }
      );
    }

    // Google access token 확인
    const accessToken = (session as { accessToken?: string }).accessToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: '구글 인증 토큰이 없습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    // 시트 구조 분석
    const sheetsSync = new SheetsSync(accessToken);
    const analysis = await sheetsSync.analyzeSheetStructure(sheetId, sheetName);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error: unknown) {
    console.error('시트 분석 오류:', error);
    const errorObj = error as { code?: number; status?: number };
    
    if (errorObj.code === 401 || errorObj.status === 401) {
      return NextResponse.json(
        { error: '구글 인증이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : '시트 분석 중 오류가 발생했습니다.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}