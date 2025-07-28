import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SheetsSync } from '@/lib/sheetsSync';
import { ApplicantSheet } from '@/types/applicant';

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
    const { sheetConfig } = body;

    if (!sheetConfig || !sheetConfig.sheetId) {
      return NextResponse.json(
        { error: '시트 설정이 필요합니다.' },
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

    // 시트 동기화 실행
    const sheetsSync = new SheetsSync(accessToken);
    const syncResult = await sheetsSync.syncApplicants(sheetConfig as ApplicantSheet);

    return NextResponse.json({
      success: true,
      data: syncResult
    });

  } catch (error) {
    console.error('시트 동기화 오류:', error);
    return NextResponse.json(
      { error: '시트 동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 동기화 로그 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { MemoryStorage } = await import('@/lib/memoryStorage');
    const logs = await MemoryStorage.getSyncLogs();

    return NextResponse.json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('동기화 로그 조회 오류:', error);
    return NextResponse.json(
      { error: '동기화 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}