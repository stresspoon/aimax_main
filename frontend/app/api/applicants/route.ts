import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ApplicantStorage } from '@/lib/applicantStorage';

// 신청자 목록 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const applicants = await ApplicantStorage.getAllApplicants();

    return NextResponse.json({
      success: true,
      data: applicants
    });

  } catch (error) {
    console.error('신청자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '신청자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 신청자 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, status, notes } = body;

    if (!email || !status) {
      return NextResponse.json(
        { error: '이메일과 상태가 필요합니다.' },
        { status: 400 }
      );
    }

    const existingApplicant = await ApplicantStorage.getApplicantByEmail(email);
    if (!existingApplicant) {
      return NextResponse.json(
        { error: '해당 신청자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updatedApplicant = {
      ...existingApplicant,
      status: status as 'pending' | 'approved' | 'rejected',
      notes: notes || existingApplicant.notes,
    };

    const result = await ApplicantStorage.upsertApplicant(updatedApplicant);

    return NextResponse.json({
      success: true,
      data: result.applicant
    });

  } catch (error) {
    console.error('신청자 상태 업데이트 오류:', error);
    return NextResponse.json(
      { error: '신청자 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}