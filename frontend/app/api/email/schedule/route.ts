/**
 * 메일 스케줄 관리 API 엔드포인트
 * GET /api/email/schedule - 스케줄 목록 조회
 * POST /api/email/schedule - 스케줄 등록
 * DELETE /api/email/schedule - 스케줄 취소
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailScheduler } from '@/lib/emailScheduler';
import { prisma } from '@/lib/database';

// GET - 스케줄 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: '캠페인 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 캠페인 소유권 확인
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        user: { email: session.user.email }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: '캠페인을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 스케줄 목록 조회
    const schedules = await prisma.emailSchedule.findMany({
      where: { campaignId },
      include: {
        applicant: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    // 스케줄 상태 통계
    const statusStats = await EmailScheduler.getScheduleStatus(campaignId);

    return NextResponse.json({
      success: true,
      schedules: schedules.map(schedule => ({
        id: schedule.id,
        applicant: {
          name: schedule.applicant.name,
          email: schedule.applicant.email
        },
        mailType: schedule.mailType,
        status: schedule.status,
        scheduledAt: schedule.scheduledAt,
        processedAt: schedule.processedAt,
        retryCount: schedule.retryCount,
        maxRetries: schedule.maxRetries,
        errorMessage: schedule.errorMessage,
        createdAt: schedule.createdAt
      })),
      statistics: statusStats
    });

  } catch (error) {
    console.error('스케줄 조회 오류:', error);
    return NextResponse.json(
      { error: '스케줄 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST - 스케줄 등록
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { applicantId, campaignId, mailType, scheduledAt } = body;

    // 입력 데이터 검증
    if (!applicantId || !campaignId || !mailType || !scheduledAt) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return NextResponse.json(
        { error: '스케줄 시간은 현재 시간보다 미래여야 합니다.' },
        { status: 400 }
      );
    }

    // 캠페인 소유권 확인
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        user: { email: session.user.email }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: '캠페인을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 신청자 확인
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId }
    });

    if (!applicant || applicant.campaignId !== campaignId) {
      return NextResponse.json(
        { error: '신청자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 스케줄 등록
    const scheduleId = await EmailScheduler.scheduleEmail({
      applicantId,
      campaignId,
      mailType,
      scheduledAt: scheduleDate
    });

    return NextResponse.json({
      success: true,
      scheduleId,
      message: '메일 스케줄이 등록되었습니다.'
    });

  } catch (error) {
    console.error('스케줄 등록 오류:', error);
    return NextResponse.json(
      { error: '스케줄 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE - 스케줄 취소
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: '스케줄 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 스케줄 조회 및 권한 확인
    const schedule = await prisma.emailSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        campaign: {
          include: {
            user: true
          }
        }
      }
    });

    if (!schedule || schedule.campaign.user.email !== session.user.email) {
      return NextResponse.json(
        { error: '스케줄을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 스케줄 취소
    const success = await EmailScheduler.cancelSchedule(scheduleId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '스케줄이 취소되었습니다.'
      });
    } else {
      return NextResponse.json(
        { error: '스케줄 취소에 실패했습니다.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('스케줄 취소 오류:', error);
    return NextResponse.json(
      { error: '스케줄 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}