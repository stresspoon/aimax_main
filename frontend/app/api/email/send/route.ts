/**
 * 메일 발송 API 엔드포인트
 * POST /api/email/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailService, EmailTemplateService } from '@/lib/email';
import { EmailScheduler } from '@/lib/emailScheduler';
import { prisma } from '@/lib/database';
import { Applicant } from '@/types/applicant';

interface SendEmailRequest {
  type: 'immediate' | 'scheduled';
  recipients: string[]; // applicant IDs
  campaignId: string;
  mailType: 'SELECTION_NOTIFICATION' | 'REJECTION_NOTIFICATION' | 'CUSTOM';
  customTemplate?: {
    subject: string;
    htmlContent: string;
    variables?: Record<string, string>;
  };
  scheduledAt?: string; // ISO date string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body: SendEmailRequest = await request.json();
    const { type, recipients, campaignId, mailType, customTemplate, scheduledAt } = body;

    // 입력 데이터 검증
    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: '수신자가 필요합니다.' },
        { status: 400 }
      );
    }

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

    // 신청자 정보 조회
    const applicants = await prisma.applicant.findMany({
      where: {
        id: { in: recipients },
        campaignId
      },
      include: {
        snsProfiles: true
      }
    });

    if (applicants.length === 0) {
      return NextResponse.json(
        { error: '유효한 신청자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Applicant 타입으로 변환
    const applicantData: Applicant[] = applicants.map(applicant => ({
      id: applicant.id,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone || undefined,
      status: applicant.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
      applicationDate: applicant.applicationDate.toISOString(),
      lastUpdated: applicant.lastUpdated.toISOString(),
      notes: applicant.notes || undefined,
      sheetRowIndex: applicant.sheetRowIndex,
      snsProfiles: applicant.snsProfiles?.map(profile => ({
        platform: (profile.platform === 'NAVER_BLOG' ? 'blog' : profile.platform.toLowerCase()) as 'instagram' | 'threads' | 'blog',
        url: profile.url,
        handle: profile.handle || undefined,
        followers: profile.followers || undefined,
        visitors: profile.visitors || undefined,
        isValid: profile.isValid
      })) || [],
      campaignId: applicant.campaignId
    }));

    let result: { success: number; failed: number; errors: string[] } | { scheduled: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

    if (type === 'immediate') {
      // 즉시 발송
      result = await sendImmediateEmails(applicantData, campaign.name, campaignId, mailType, customTemplate);
    } else if (type === 'scheduled') {
      // 스케줄 발송
      if (!scheduledAt) {
        return NextResponse.json(
          { error: '스케줄 발송 시간이 필요합니다.' },
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

      result = await scheduleEmails(applicantData, campaignId, mailType, scheduleDate);
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'immediate' ? '즉시' : '스케줄'} 메일 처리가 완료되었습니다.`,
      ...result
    });

  } catch (error) {
    console.error('메일 발송 API 오류:', error);
    return NextResponse.json(
      { error: '메일 발송 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 즉시 메일 발송
 */
async function sendImmediateEmails(
  applicants: Applicant[],
  campaignName: string,
  campaignId: string,
  mailType: string,
  customTemplate?: {
    subject: string;
    htmlContent: string;
    variables?: Record<string, string>;
  }
): Promise<{ success: number; failed: number; errors: string[] }> {
  
  if (mailType === 'CUSTOM' && customTemplate) {
    // 커스텀 템플릿 발송
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const applicant of applicants) {
      try {
        const variables = {
          applicantName: applicant.name,
          campaignName,
          ...customTemplate.variables
        };

        const result = await EmailTemplateService.sendCustomEmail(
          applicant.email,
          customTemplate.subject,
          customTemplate.htmlContent,
          variables,
          campaignId,
          applicant.id || '',
          'FOLLOW_UP'
        );

        if (result) {
          success++;
        } else {
          failed++;
          errors.push(`${applicant.email}: 발송 실패`);
        }
      } catch (error) {
        failed++;
        errors.push(`${applicant.email}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }

    return { success, failed, errors };
  } else {
    // 기본 템플릿 발송
    return await EmailService.sendBulkEmails(applicants, campaignId, campaignName, {
      companyName: 'AIMAX'
    });
  }
}

/**
 * 스케줄 메일 등록
 */
async function scheduleEmails(
  applicants: Applicant[],
  campaignId: string,
  mailType: string,
  scheduledAt: Date
): Promise<{ scheduled: number; errors: string[] }> {
  
  let scheduled = 0;
  const errors: string[] = [];

  for (const applicant of applicants) {
    try {
      await EmailScheduler.scheduleEmail({
        applicantId: applicant.id || '',
        campaignId,
        mailType: mailType as 'SELECTION_NOTIFICATION' | 'REJECTION_NOTIFICATION',
        scheduledAt
      });
      scheduled++;
    } catch (error) {
      const errorMsg = `${applicant.email}: 스케줄 등록 실패 - ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      errors.push(errorMsg);
    }
  }

  return { scheduled, errors };
}