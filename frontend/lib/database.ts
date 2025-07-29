/**
 * PostgreSQL 데이터베이스 서비스 (Prisma ORM 사용)
 * MemoryStorage를 대체하는 실제 데이터베이스 연동 서비스
 */

import { PrismaClient, ApplicantStatus, SNSPlatform, ProcessingStatus } from '@prisma/client';
import { Applicant, SyncResult } from '@/types/applicant';
import { SelectionRecord } from '@/types/selection';

// Prisma 클라이언트 싱글톤
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export class DatabaseService {
  /**
   * 모든 신청자 조회
   */
  static async getAllApplicants(campaignId?: string): Promise<Applicant[]> {
    try {
      const applicants = await prisma.applicant.findMany({
        where: campaignId ? { campaignId } : undefined,
        include: {
          snsProfiles: true,
          selectionResults: true,
          mailHistories: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return applicants.map(this.mapPrismaToApplicant);
    } catch (error) {
      console.error('신청자 조회 오류:', error);
      return [];
    }
  }

  /**
   * 신청자 저장/업데이트 (upsert)
   */
  static async upsertApplicant(
    applicant: Applicant,
    campaignId: string
  ): Promise<{ isNew: boolean; applicant: Applicant }> {
    try {
      const existingApplicant = await prisma.applicant.findUnique({
        where: {
          campaignId_email: {
            campaignId,
            email: applicant.email,
          },
        },
        include: {
          snsProfiles: true,
        },
      });

      if (existingApplicant) {
        // 기존 신청자 업데이트
        const updatedApplicant = await prisma.applicant.update({
          where: { id: existingApplicant.id },
          data: {
            name: applicant.name,
            phone: applicant.phone,
            status: this.mapStatusToPrisma(applicant.status),
            notes: applicant.notes,
            sheetRowIndex: applicant.sheetRowIndex,
            snsProfiles: {
              deleteMany: {},
              create: applicant.snsProfiles?.map(profile => ({
                platform: this.mapPlatformToPrisma(profile.platform),
                url: profile.url,
                handle: profile.handle,
                followers: profile.followers,
                visitors: profile.visitors,
                isValid: profile.isValid,
              })) || [],
            },
          },
          include: {
            snsProfiles: true,
            selectionResults: true,
            mailHistories: true,
          },
        });

        return { isNew: false, applicant: this.mapPrismaToApplicant(updatedApplicant) };
      } else {
        // 새 신청자 생성
        const newApplicant = await prisma.applicant.create({
          data: {
            name: applicant.name,
            email: applicant.email,
            phone: applicant.phone,
            status: this.mapStatusToPrisma(applicant.status),
            notes: applicant.notes,
            sheetRowIndex: applicant.sheetRowIndex,
            campaignId,
            snsProfiles: {
              create: applicant.snsProfiles?.map(profile => ({
                platform: this.mapPlatformToPrisma(profile.platform),
                url: profile.url,
                handle: profile.handle,
                followers: profile.followers,
                visitors: profile.visitors,
                isValid: profile.isValid,
              })) || [],
            },
          },
          include: {
            snsProfiles: true,
            selectionResults: true,
            mailHistories: true,
          },
        });

        return { isNew: true, applicant: this.mapPrismaToApplicant(newApplicant) };
      }
    } catch (error) {
      console.error('신청자 저장/업데이트 오류:', error);
      throw new Error('신청자 데이터 저장 실패');
    }
  }

  /**
   * 이메일로 신청자 조회
   */
  static async getApplicantByEmail(email: string, campaignId?: string): Promise<Applicant | null> {
    try {
      const applicant = await prisma.applicant.findFirst({
        where: {
          email,
          ...(campaignId && { campaignId }),
        },
        include: {
          snsProfiles: true,
          selectionResults: true,
          mailHistories: true,
        },
      });

      return applicant ? this.mapPrismaToApplicant(applicant) : null;
    } catch (error) {
      console.error('신청자 조회 오류:', error);
      return null;
    }
  }

  /**
   * 선정 결과 저장
   */
  static async saveSelectionResult(
    selectionRecord: SelectionRecord,
    campaignId: string
  ): Promise<void> {
    try {
      const applicant = await prisma.applicant.findFirst({
        where: {
          email: selectionRecord.applicantEmail,
          campaignId,
        },
      });

      if (!applicant) {
        throw new Error('신청자를 찾을 수 없습니다.');
      }

      await prisma.selectionResult.upsert({
        where: {
          applicantId_campaignId: {
            applicantId: applicant.id,
            campaignId,
          },
        },
        update: {
          isSelected: selectionRecord.isSelected,
          selectionReason: selectionRecord.selectionReason,
          qualifyingPlatforms: selectionRecord.qualifyingPlatforms,
          meetsCriteria: selectionRecord.meetsCriteria,
          snsDataSnapshot: selectionRecord.snsData,
          processingStatus: this.mapProcessingStatusToPrisma(selectionRecord.processingStatus),
          sheetUpdated: selectionRecord.sheetUpdated,
          sheetUpdateDate: selectionRecord.sheetUpdateDate ? new Date(selectionRecord.sheetUpdateDate) : null,
          emailSent: selectionRecord.emailSent,
          emailSentDate: selectionRecord.emailSentDate ? new Date(selectionRecord.emailSentDate) : null,
        },
        create: {
          applicantId: applicant.id,
          campaignId,
          isSelected: selectionRecord.isSelected,
          selectionReason: selectionRecord.selectionReason,
          qualifyingPlatforms: selectionRecord.qualifyingPlatforms,
          meetsCriteria: selectionRecord.meetsCriteria,
          snsDataSnapshot: selectionRecord.snsData,
          processingStatus: this.mapProcessingStatusToPrisma(selectionRecord.processingStatus),
          sheetUpdated: selectionRecord.sheetUpdated,
          sheetUpdateDate: selectionRecord.sheetUpdateDate ? new Date(selectionRecord.sheetUpdateDate) : null,
          emailSent: selectionRecord.emailSent,
          emailSentDate: selectionRecord.emailSentDate ? new Date(selectionRecord.emailSentDate) : null,
        },
      });
    } catch (error) {
      console.error('선정 결과 저장 오류:', error);
      throw new Error('선정 결과 저장 실패');
    }
  }

  /**
   * 동기화 로그 저장
   */
  static async logSyncResult(result: SyncResult): Promise<void> {
    try {
      await prisma.syncLog.create({
        data: {
          success: result.success,
          newApplicants: result.newApplicants,
          updatedApplicants: result.updatedApplicants,
          errors: result.errors,
        },
      });

      // 최근 100개 로그만 유지
      const logs = await prisma.syncLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: 100,
      });

      if (logs.length > 0) {
        await prisma.syncLog.deleteMany({
          where: {
            id: {
              in: logs.map(log => log.id),
            },
          },
        });
      }
    } catch (error) {
      console.error('동기화 로그 저장 오류:', error);
    }
  }

  /**
   * 동기화 로그 조회
   */
  static async getSyncLogs(): Promise<SyncResult[]> {
    try {
      const logs = await prisma.syncLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return logs.map(log => ({
        success: log.success,
        newApplicants: log.newApplicants,
        updatedApplicants: log.updatedApplicants,
        errors: log.errors as string[],
        lastSyncTime: log.lastSyncTime.toISOString(),
      }));
    } catch (error) {
      console.error('동기화 로그 조회 오류:', error);
      return [];
    }
  }

  /**
   * 캠페인 생성/조회
   */
  static async upsertCampaign(
    userId: string,
    campaignData: {
      name: string;
      description?: string;
      sheetId?: string;
      sheetName?: string;
      sheetUrl?: string;
    }
  ): Promise<string> {
    try {
      // 기존 캠페인 찾기
      const existingCampaign = await prisma.campaign.findFirst({
        where: {
          userId,
          name: campaignData.name,
        },
      });

      if (existingCampaign) {
        // 기존 캠페인 업데이트
        const campaign = await prisma.campaign.update({
          where: { id: existingCampaign.id },
          data: {
            description: campaignData.description,
            sheetId: campaignData.sheetId,
            sheetName: campaignData.sheetName,
            sheetUrl: campaignData.sheetUrl,
          },
        });
        return campaign.id;
      } else {
        // 새 캠페인 생성
        const campaign = await prisma.campaign.create({
          data: {
            userId,
            name: campaignData.name,
            description: campaignData.description,
            sheetId: campaignData.sheetId,
            sheetName: campaignData.sheetName,
            sheetUrl: campaignData.sheetUrl,
          },
        });
        return campaign.id;
      }
    } catch (error) {
      console.error('캠페인 생성/업데이트 오류:', error);
      throw new Error('캠페인 처리 실패');
    }
  }

  /**
   * 사용자 캠페인 목록 조회
   */
  static async getUserCampaigns(userId: string) {
    try {
      return await prisma.campaign.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              applicants: true,
              selectionResults: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      console.error('캠페인 조회 오류:', error);
      return [];
    }
  }

  /**
   * Prisma 모델을 Applicant 타입으로 변환
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mapPrismaToApplicant(prismaApplicant: any): Applicant {
    return {
      id: prismaApplicant.id,
      name: prismaApplicant.name,
      email: prismaApplicant.email,
      phone: prismaApplicant.phone,
      applicationDate: prismaApplicant.applicationDate.toISOString(),
      status: prismaApplicant.status,
      notes: prismaApplicant.notes,
      sheetRowIndex: prismaApplicant.sheetRowIndex,
      lastUpdated: prismaApplicant.lastUpdated.toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snsProfiles: prismaApplicant.snsProfiles?.map((profile: any) => ({
        platform: this.mapPrismaToPlatform(profile.platform),
        url: profile.url,
        handle: profile.handle,
        followers: profile.followers,
        visitors: profile.visitors,
        isValid: profile.isValid,
      })) || [],
    };
  }

  /**
   * 플랫폼 이름 매핑: 앱 -> Prisma enum
   */
  private static mapPlatformToPrisma(platform: string): SNSPlatform {
    switch (platform) {
      case 'blog':
        return SNSPlatform.NAVER_BLOG;
      case 'instagram':
        return SNSPlatform.INSTAGRAM;
      case 'threads':
        return SNSPlatform.THREADS;
      default:
        return SNSPlatform.INSTAGRAM;
    }
  }

  /**
   * 신청자 상태 매핑: 앱 -> Prisma enum
   */
  private static mapStatusToPrisma(status: string): ApplicantStatus {
    switch (status) {
      case 'pending':
        return ApplicantStatus.PENDING;
      case 'approved':
        return ApplicantStatus.APPROVED;
      case 'rejected':
        return ApplicantStatus.REJECTED;
      default:
        return ApplicantStatus.PENDING;
    }
  }

  /**
   * 처리 상태 매핑: 앱 -> Prisma enum
   */
  private static mapProcessingStatusToPrisma(status: string): ProcessingStatus {
    switch (status) {
      case 'pending':
        return ProcessingStatus.PENDING;
      case 'completed':
        return ProcessingStatus.COMPLETED;
      case 'failed':
        return ProcessingStatus.FAILED;
      default:
        return ProcessingStatus.COMPLETED;
    }
  }

  /**
   * 플랫폼 이름 매핑: Prisma enum -> 앱
   */
  private static mapPrismaToPlatform(platform: string) {
    switch (platform) {
      case 'NAVER_BLOG':
        return 'blog';
      case 'INSTAGRAM':
        return 'instagram';
      case 'THREADS':
        return 'threads';
      default:
        return 'instagram';
    }
  }

  /**
   * 데이터베이스 연결 상태 확인
   */
  static async checkConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('데이터베이스 연결 확인 실패:', error);
      return false;
    }
  }

  /**
   * 개발/테스트용 데이터 초기화
   */
  static async clearAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('프로덕션 환경에서는 데이터 초기화를 할 수 없습니다.');
    }

    try {
      await prisma.mailHistory.deleteMany();
      await prisma.selectionResult.deleteMany();
      await prisma.sNSProfile.deleteMany();
      await prisma.applicant.deleteMany();
      await prisma.campaign.deleteMany();
      await prisma.syncLog.deleteMany();
    } catch (error) {
      console.error('데이터 초기화 오류:', error);
      throw new Error('데이터 초기화 실패');
    }
  }

  /**
   * 통계 조회
   */
  static async getStats(campaignId?: string) {
    try {
      const where = campaignId ? { campaignId } : {};

      const [applicantsCount, syncLogsCount, selectionResults] = await Promise.all([
        prisma.applicant.count({ where }),
        prisma.syncLog.count(),
        prisma.selectionResult.groupBy({
          by: ['isSelected'],
          where,
          _count: true,
        }),
      ]);

      const selectedCount = selectionResults.find(r => r.isSelected)?._count || 0;
      const rejectedCount = selectionResults.find(r => !r.isSelected)?._count || 0;

      return {
        applicantsCount,
        syncLogsCount,
        selectedCount,
        rejectedCount,
        totalProcessed: selectedCount + rejectedCount,
      };
    } catch (error) {
      console.error('통계 조회 오류:', error);
      return {
        applicantsCount: 0,
        syncLogsCount: 0,
        selectedCount: 0,
        rejectedCount: 0,
        totalProcessed: 0,
      };
    }
  }
}

// 애플리케이션 종료 시 Prisma 연결 해제
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});