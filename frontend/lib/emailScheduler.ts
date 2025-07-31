/**
 * 이메일 스케줄링 시스템
 * 4일 후 자동 메일 발송을 위한 스케줄러
 */

import cron from 'node-cron';
import { prisma } from './database';
import { EmailService } from './email';
import { Applicant } from '@/types/applicant';

interface ScheduleEmailOptions {
  applicantId: string;
  campaignId: string;
  mailType: 'SELECTION_NOTIFICATION' | 'REJECTION_NOTIFICATION';
  scheduledAt: Date;
  maxRetries?: number;
}

/**
 * 이메일 스케줄러 클래스
 */
export class EmailScheduler {
  private static isRunning = false;

  /**
   * 메일 스케줄 등록
   */
  static async scheduleEmail(options: ScheduleEmailOptions): Promise<string> {
    const { applicantId, campaignId, mailType, scheduledAt, maxRetries = 3 } = options;

    try {
      // 기존 스케줄이 있는지 확인
      const existingSchedule = await prisma.emailSchedule.findFirst({
        where: {
          applicantId,
          campaignId,
          mailType,
          status: {
            in: ['PENDING', 'PROCESSING']
          }
        }
      });

      if (existingSchedule) {
        console.log(`이미 예약된 메일이 있습니다: ${existingSchedule.id}`);
        return existingSchedule.id;
      }

      // 새 스케줄 생성
      const schedule = await prisma.emailSchedule.create({
        data: {
          applicantId,
          campaignId,
          mailType,
          scheduledAt,
          maxRetries,
          status: 'PENDING'
        }
      });

      console.log(`메일 스케줄 등록: ${schedule.id}, 발송 예정: ${scheduledAt.toISOString()}`);
      return schedule.id;

    } catch (error) {
      console.error('메일 스케줄 등록 실패:', error);
      throw new Error('메일 스케줄 등록에 실패했습니다.');
    }
  }

  /**
   * 선정 결과에 따른 자동 메일 스케줄링
   */
  static async scheduleSelectionEmails(
    applicants: { id: string; status: string; campaignId: string; selectionDate: Date }[]
  ): Promise<{ scheduled: number; errors: string[] }> {
    let scheduled = 0;
    const errors: string[] = [];

    for (const applicant of applicants) {
      try {
        // 선정/비선정 여부에 따라 4일 후 메일 발송 예약
        const scheduledAt = new Date(applicant.selectionDate);
        scheduledAt.setDate(scheduledAt.getDate() + 4);

        const mailType = applicant.status === 'approved' 
          ? 'SELECTION_NOTIFICATION' 
          : 'REJECTION_NOTIFICATION';

        await this.scheduleEmail({
          applicantId: applicant.id,
          campaignId: applicant.campaignId,
          mailType,
          scheduledAt
        });

        scheduled++;
      } catch (error) {
        const errorMsg = `신청자 ${applicant.id} 메일 스케줄 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return { scheduled, errors };
  }

  /**
   * 스케줄된 메일 처리
   */
  private static async processScheduledEmails(): Promise<void> {
    try {
      const now = new Date();
      
      // 발송 시간이 된 대기 중인 메일들 조회
      const pendingEmails = await prisma.emailSchedule.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: {
            lte: now
          }
        },
        include: {
          applicant: {
            include: {
              snsProfiles: true
            }
          },
          campaign: true
        },
        orderBy: {
          scheduledAt: 'asc'
        },
        take: 50 // 한 번에 최대 50개씩 처리
      });

      console.log(`처리할 예약 메일 수: ${pendingEmails.length}`);

      for (const schedule of pendingEmails) {
        await this.processSingleEmail(schedule);
      }

    } catch (error) {
      console.error('스케줄된 메일 처리 중 오류:', error);
    }
  }

  /**
   * 단일 메일 처리
   */
  private static async processSingleEmail(schedule: {
    id: string;
    applicant: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      status: string;
      applicationDate: Date;
      notes: string | null;
      sheetRowIndex: number;
      snsProfiles?: Array<{
        platform: string;
        url: string;
        handle: string | null;
        followers: number | null;
        visitors: number | null;
        isValid: boolean;
      }>;
    };
    campaign: {
      name: string;
    };
    campaignId: string;
    mailType: string;
    retryCount: number;
    maxRetries: number;
  }): Promise<void> {
    try {
      // 처리 중 상태로 변경
      await prisma.emailSchedule.update({
        where: { id: schedule.id },
        data: { 
          status: 'PROCESSING',
          processedAt: new Date()
        }
      });

      const applicant: Applicant = {
        id: schedule.applicant.id,
        name: schedule.applicant.name,
        email: schedule.applicant.email,
        phone: schedule.applicant.phone || undefined,
        status: schedule.applicant.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
        applicationDate: schedule.applicant.applicationDate.toISOString(),
        lastUpdated: new Date().toISOString(),
        notes: schedule.applicant.notes || undefined,
        sheetRowIndex: schedule.applicant.sheetRowIndex,
        snsProfiles: schedule.applicant.snsProfiles?.map((profile) => ({
          platform: (profile.platform === 'NAVER_BLOG' ? 'blog' : profile.platform.toLowerCase()) as 'instagram' | 'threads' | 'blog',
          url: profile.url,
          handle: profile.handle || undefined,
          followers: profile.followers || undefined,
          visitors: profile.visitors || undefined,
          isValid: profile.isValid
        })) || []
      };

      let success = false;

      // 메일 유형에 따라 발송
      if (schedule.mailType === 'SELECTION_NOTIFICATION') {
        success = await EmailService.sendSelectionEmail(
          applicant,
          schedule.campaignId,
          schedule.campaign.name,
          'AIMAX'
        );
      } else if (schedule.mailType === 'REJECTION_NOTIFICATION') {
        success = await EmailService.sendRejectionEmail(
          applicant,
          schedule.campaignId,
          schedule.campaign.name,
          {
            companyName: 'AIMAX',
            // 할인 쿠폰 정보는 캠페인 설정에서 가져올 수 있도록 확장 가능
          }
        );
      }

      if (success) {
        // 성공 시 완료 상태로 변경
        await prisma.emailSchedule.update({
          where: { id: schedule.id },
          data: { 
            status: 'COMPLETED',
            processedAt: new Date()
          }
        });

        console.log(`메일 발송 완료: ${schedule.id}`);
      } else {
        throw new Error('메일 발송 실패');
      }

    } catch (error) {
      console.error(`메일 처리 실패 (ID: ${schedule.id}):`, error);

      const retryCount = (schedule.retryCount || 0) + 1;
      const maxRetries = schedule.maxRetries || 3;

      if (retryCount < maxRetries) {
        // 재시도 가능한 경우
        const nextRetryAt = new Date();
        nextRetryAt.setMinutes(nextRetryAt.getMinutes() + (retryCount * 10)); // 10분, 20분, 30분 후 재시도

        await prisma.emailSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'PENDING',
            retryCount,
            scheduledAt: nextRetryAt,
            errorMessage: error instanceof Error ? error.message : '알 수 없는 오류'
          }
        });

        console.log(`메일 재시도 예약: ${schedule.id}, 시도 ${retryCount}/${maxRetries}`);
      } else {
        // 최대 재시도 횟수 초과
        await prisma.emailSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'FAILED',
            retryCount,
            errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
            processedAt: new Date()
          }
        });

        console.error(`메일 발송 최종 실패: ${schedule.id}`);
      }
    }
  }

  /**
   * 스케줄러 시작
   */
  static startScheduler(): void {
    if (this.isRunning) {
      console.log('이메일 스케줄러가 이미 실행 중입니다.');
      return;
    }

    // 매 5분마다 스케줄된 메일 확인
    cron.schedule('*/5 * * * *', async () => {
      console.log('스케줄된 메일 확인 중...');
      await this.processScheduledEmails();
    });

    this.isRunning = true;
    console.log('이메일 스케줄러가 시작되었습니다. (5분 간격)');
  }

  /**
   * 스케줄러 중지
   */
  static stopScheduler(): void {
    // cron job을 중지하는 로직은 실제 프로덕션에서는 더 정교하게 구현 필요
    this.isRunning = false;
    console.log('이메일 스케줄러가 중지되었습니다.');
  }

  /**
   * 특정 스케줄 취소
   */
  static async cancelSchedule(scheduleId: string): Promise<boolean> {
    try {
      const updated = await prisma.emailSchedule.updateMany({
        where: {
          id: scheduleId,
          status: {
            in: ['PENDING', 'PROCESSING']
          }
        },
        data: {
          status: 'CANCELLED',
          processedAt: new Date()
        }
      });

      return updated.count > 0;
    } catch (error) {
      console.error('스케줄 취소 실패:', error);
      return false;
    }
  }

  /**
   * 스케줄 상태 조회
   */
  static async getScheduleStatus(campaignId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    try {
      const statuses = await prisma.emailSchedule.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: { id: true }
      });

      const result = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };

      statuses.forEach(status => {
        const key = status.status.toLowerCase() as keyof typeof result;
        if (key in result) {
          result[key] = status._count.id;
        }
      });

      return result;
    } catch (error) {
      console.error('스케줄 상태 조회 실패:', error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };
    }
  }

  /**
   * 실패한 스케줄 재시도
   */
  static async retryFailedSchedules(campaignId: string): Promise<number> {
    try {
      const updated = await prisma.emailSchedule.updateMany({
        where: {
          campaignId,
          status: 'FAILED',
          retryCount: {
            lt: prisma.emailSchedule.fields.maxRetries
          }
        },
        data: {
          status: 'PENDING',
          scheduledAt: new Date(), // 즉시 재시도
          errorMessage: null
        }
      });

      console.log(`${updated.count}개의 실패한 스케줄을 재시도로 변경했습니다.`);
      return updated.count;
    } catch (error) {
      console.error('실패한 스케줄 재시도 설정 실패:', error);
      return 0;
    }
  }
}

// 서버 시작 시 스케줄러 자동 시작 (Next.js API 경로에서 호출)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // 서버 사이드에서만 실행
  EmailScheduler.startScheduler();
}