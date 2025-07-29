import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SelectionStorage } from '@/lib/selectionStorage';
import { SelectionFilter } from '@/types/selection';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const isSelected = searchParams.get('isSelected');
    const campaignId = searchParams.get('campaignId');
    const platform = searchParams.get('platform');
    const processingStatus = searchParams.get('processingStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const applicantEmail = searchParams.get('applicantEmail');

    // 특정 신청자 결과 조회
    if (applicantEmail) {
      const result = await SelectionStorage.getSelectionResult(applicantEmail);
      
      if (!result) {
        return NextResponse.json(
          { error: '해당 신청자의 선정 결과를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result
      });
    }

    // 필터 조건 구성
    const filter: SelectionFilter = {};
    
    if (isSelected !== null && isSelected !== undefined) {
      filter.isSelected = isSelected === 'true';
    }
    
    if (campaignId) {
      filter.campaignId = campaignId;
    }
    
    if (platform && ['naverBlog', 'instagram', 'threads'].includes(platform)) {
      filter.platform = platform as 'naverBlog' | 'instagram' | 'threads';
    }
    
    if (processingStatus && ['pending', 'completed', 'failed'].includes(processingStatus)) {
      filter.processingStatus = processingStatus as 'pending' | 'completed' | 'failed';
    }
    
    if (startDate && endDate) {
      filter.dateRange = {
        startDate,
        endDate
      };
    }

    // 선정 결과 조회
    const results = await SelectionStorage.getSelectionResults(filter);
    
    // 통계 정보 조회
    const stats = await SelectionStorage.getSelectionStats(filter);

    return NextResponse.json({
      success: true,
      data: {
        results,
        stats,
        totalCount: results.length
      }
    });

  } catch (error) {
    console.error('선정 결과 조회 오류:', error);
    return NextResponse.json(
      { error: '선정 결과 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { applicantEmail, clearAll = false } = body;

    if (clearAll) {
      // 모든 선정 결과 삭제 (관리자 기능)
      const result = await SelectionStorage.clearAllSelectionResults();
      
      return NextResponse.json({
        success: result.success,
        message: result.success ? '모든 선정 결과가 삭제되었습니다.' : '삭제 중 오류가 발생했습니다.'
      });
    }

    if (!applicantEmail) {
      return NextResponse.json(
        { error: '삭제할 신청자 이메일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 특정 신청자 선정 결과 삭제
    const result = await SelectionStorage.deleteSelectionResult(applicantEmail);
    
    if (!result.success) {
      return NextResponse.json(
        { error: '해당 신청자의 선정 결과를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '선정 결과가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('선정 결과 삭제 오류:', error);
    return NextResponse.json(
      { error: '선정 결과 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}