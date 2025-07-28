import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { InfluenceVerifier } from '@/lib/influenceVerifier';

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
    const { applicantEmail, urls } = body;

    if (!applicantEmail || !urls) {
      return NextResponse.json(
        { error: '신청자 이메일과 SNS URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // URL 중 최소 하나는 제공되어야 함
    const { naverBlog, instagram, threads } = urls;
    if (!naverBlog && !instagram && !threads) {
      return NextResponse.json(
        { error: '최소 하나의 SNS URL을 제공해야 합니다.' },
        { status: 400 }
      );
    }

    console.log(`영향력 검증 시작: ${applicantEmail}`, urls);

    // 영향력 검증 실행
    const verifier = new InfluenceVerifier();
    const verificationResult = await verifier.verifyInfluence(applicantEmail, urls);

    // 결과 저장 (현재는 로그만)
    await verifier.saveVerificationResult(verificationResult);

    return NextResponse.json({
      success: true,
      data: verificationResult
    });

  } catch (error: unknown) {
    console.error('영향력 검증 오류:', error);
    
    const errorMessage = error instanceof Error ? error.message : '영향력 검증 중 오류가 발생했습니다.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// 캐시된 검증 결과 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const applicantEmail = searchParams.get('email');

    if (!applicantEmail) {
      return NextResponse.json(
        { error: '신청자 이메일이 필요합니다.' },
        { status: 400 }
      );
    }

    const verifier = new InfluenceVerifier();
    const cachedResult = await verifier.getCachedResult(applicantEmail);

    if (cachedResult) {
      return NextResponse.json({
        success: true,
        data: cachedResult
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '캐시된 검증 결과를 찾을 수 없습니다.'
      });
    }

  } catch (error) {
    console.error('캐시된 결과 조회 오류:', error);
    return NextResponse.json(
      { error: '결과 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}