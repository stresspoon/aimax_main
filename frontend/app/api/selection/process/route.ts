import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { defaultSelectionProcessor } from '@/lib/selectionProcessor';
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

    // Google access token 확인
    const accessToken = (session as { accessToken?: string }).accessToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: '구글 인증 토큰이 없습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const { sheetConfig, applicantEmail, updateSheet = true, campaignId } = body;

    // sheetConfig 유효성 검증
    if (!sheetConfig || !sheetConfig.sheetId || !sheetConfig.sheetName) {
      return NextResponse.json(
        { error: '시트 설정 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // campaignId가 없으면 기본값 생성 (사용자 이메일 기반)
    const finalCampaignId = campaignId || `default_${session.user.email}`;

    const processOptions = {
      sheetConfig: sheetConfig as ApplicantSheet,
      accessToken,
      campaignId: finalCampaignId,
      updateSheet,
      sendNotification: false // 향후 구현
    };

    let result;
    
    if (applicantEmail) {
      // 특정 신청자만 처리
      result = await defaultSelectionProcessor.processSingleApplicant(applicantEmail, processOptions);
    } else {
      // 모든 신청자 처리
      result = await defaultSelectionProcessor.processAllApplicants(processOptions);
    }

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `선정 프로세스가 완료되었습니다. 총 ${result.totalProcessed}명 처리 (선정: ${result.selectedCount}명, 비선정: ${result.rejectedCount}명)`
        : '선정 프로세스 중 오류가 발생했습니다.',
      data: result
    });

  } catch (error) {
    console.error('선정 프로세스 API 오류:', error);
    const errorObj = error as { code?: number; status?: number };
    
    if (errorObj.code === 401 || errorObj.status === 401) {
      return NextResponse.json(
        { error: '구글 인증이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: '선정 프로세스 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // TODO: 선정 프로세스 상태 조회 구현
    return NextResponse.json({
      success: true,
      message: '선정 프로세스 상태 조회 기능은 향후 구현 예정입니다.',
      data: {
        availableProcesses: [],
        lastProcessTime: null
      }
    });

  } catch (error) {
    console.error('선정 프로세스 상태 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}