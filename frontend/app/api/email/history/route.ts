/**
 * 메일 발송 이력 조회 API 엔드포인트
 * GET /api/email/history - 메일 발송 이력 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const mailType = searchParams.get('mailType');

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

    // 검색 조건 구성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { campaignId };
    
    if (status && ['PENDING', 'SENT', 'FAILED', 'SCHEDULED'].includes(status)) {
      where.status = status;
    }
    
    if (mailType && ['SELECTION_NOTIFICATION', 'REJECTION_NOTIFICATION', 'FOLLOW_UP', 'REMINDER'].includes(mailType)) {
      where.mailType = mailType;
    }

    // 전체 개수 조회
    const totalCount = await prisma.mailHistory.count({ where });

    // 메일 이력 조회
    const mailHistories = await prisma.mailHistory.findMany({
      where,
      include: {
        applicant: {
          select: {
            name: true,
            email: true
          }
        },
        template: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // 상태별 통계
    const statusStats = await prisma.mailHistory.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { id: true }
    });

    const statistics = {
      total: totalCount,
      pending: 0,
      sent: 0,
      failed: 0,
      scheduled: 0
    };

    statusStats.forEach(stat => {
      const key = stat.status.toLowerCase() as keyof typeof statistics;
      if (key in statistics) {
        statistics[key] = stat._count.id;
      }
    });

    // 메일 유형별 통계
    const typeStats = await prisma.mailHistory.groupBy({
      by: ['mailType'],
      where: { campaignId },
      _count: { id: true }
    });

    const typeStatistics: Record<string, number> = {};
    typeStats.forEach(stat => {
      typeStatistics[stat.mailType] = stat._count.id;
    });

    return NextResponse.json({
      success: true,
      data: {
        mailHistories: mailHistories.map(history => ({
          id: history.id,
          mailType: history.mailType,
          recipient: history.recipient,
          applicant: {
            name: history.applicant.name,
            email: history.applicant.email
          },
          subject: history.subject,
          status: history.status,
          sentAt: history.sentAt,
          failReason: history.failReason,
          scheduledAt: history.scheduledAt,
          template: history.template ? {
            name: history.template.name,
            type: history.template.type
          } : null,
          messageId: history.messageId,
          createdAt: history.createdAt,
          updatedAt: history.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        },
        statistics: {
          status: statistics,
          type: typeStatistics
        }
      }
    });

  } catch (error) {
    console.error('메일 이력 조회 오류:', error);
    return NextResponse.json(
      { error: '메일 이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}