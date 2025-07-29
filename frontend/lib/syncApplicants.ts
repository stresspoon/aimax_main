/**
 * 신청자 동기화 유틸리티 - Transaction 기반 안전한 데이터 처리
 * P2003 Foreign Key 제약 조건 오류 방지를 위한 순차적 데이터 생성
 */

import { prisma } from './database';
import { Applicant } from '@/types/applicant';
import { Session } from 'next-auth';

export interface SyncApplicantsOptions {
  userId: string;
  campaignId: string;
  applicantsData: Applicant[];
  batchSize?: number;
}

/**
 * 신청자 데이터를 안전하게 동기화합니다.
 * 트랜잭션을 사용해 데이터 순서와 무결성을 보장합니다.
 */
export async function syncApplicantsWithTransaction(
  options: SyncApplicantsOptions
): Promise<{
  success: boolean;
  newApplicants: number;
  updatedApplicants: number;
  errors: string[];
}> {
  const { userId, campaignId, applicantsData, batchSize = 10 } = options;
  
  let newApplicants = 0;
  let updatedApplicants = 0;
  const errors: string[] = [];

  try {
    // 데이터를 배치로 나누어 처리
    const batches = [];
    for (let i = 0; i < applicantsData.length; i += batchSize) {
      batches.push(applicantsData.slice(i, i + batchSize));
    }

    console.log(`Processing ${applicantsData.length} applicants in ${batches.length} batches`);

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        const batchResult = await prisma.$transaction(async (tx) => {
          let batchNew = 0;
          let batchUpdated = 0;

          // 1. Campaign 존재 확인 (각 배치마다)
          const campaignExists = await tx.campaign.findUnique({
            where: { id: campaignId },
            select: { id: true, userId: true }
          });

          if (!campaignExists) {
            throw new Error(`Campaign ${campaignId}를 찾을 수 없습니다.`);
          }

          if (campaignExists.userId !== userId) {
            throw new Error(`Campaign ${campaignId}에 대한 권한이 없습니다.`);
          }

          // 2. User 존재 확인
          const userExists = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true }
          });

          if (!userExists) {
            throw new Error(`User ${userId}를 찾을 수 없습니다.`);
          }

          // 3. 배치 내 신청자들 순차 처리
          for (const applicant of batch) {
            try {
              const existing = await tx.applicant.findUnique({
                where: {
                  campaignId_email: {
                    campaignId,
                    email: applicant.email,
                  },
                },
              });

              if (existing) {
                // 기존 신청자 업데이트
                await tx.applicant.update({
                  where: { id: existing.id },
                  data: {
                    name: applicant.name,
                    phone: applicant.phone,
                    notes: applicant.notes,
                    sheetRowIndex: applicant.sheetRowIndex,
                  },
                });
                batchUpdated++;
              } else {
                // 새 신청자 생성
                await tx.applicant.create({
                  data: {
                    name: applicant.name,
                    email: applicant.email,
                    phone: applicant.phone,
                    status: 'PENDING',
                    notes: applicant.notes,
                    sheetRowIndex: applicant.sheetRowIndex,
                    campaignId,
                  },
                });
                batchNew++;
              }
            } catch (applicantError) {
              console.error(`Error processing applicant ${applicant.email}:`, applicantError);
              errors.push(`신청자 ${applicant.email} 처리 실패: ${applicantError instanceof Error ? applicantError.message : 'Unknown error'}`);
            }
          }

          return { batchNew, batchUpdated };
        });

        newApplicants += batchResult.batchNew;
        updatedApplicants += batchResult.batchUpdated;
        console.log(`Batch ${batchIndex + 1}/${batches.length} completed: ${batchResult.batchNew} new, ${batchResult.batchUpdated} updated`);

      } catch (batchError) {
        console.error(`Batch ${batchIndex + 1} failed:`, batchError);
        errors.push(`배치 ${batchIndex + 1} 처리 실패: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
      }
    }

    const success = errors.length === 0;
    console.log(`Sync completed: ${newApplicants} new, ${updatedApplicants} updated, ${errors.length} errors`);

    return {
      success,
      newApplicants,
      updatedApplicants,
      errors,
    };

  } catch (error) {
    console.error('Sync process failed:', error);
    return {
      success: false,
      newApplicants,
      updatedApplicants,
      errors: [...errors, `전체 동기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * 세션 기반으로 사용자 신청자 동기화
 */
export async function syncApplicantsForUser(
  session: Session,
  campaignId: string,
  applicantsData: Applicant[]
) {
  if (!session.user?.email) {
    throw new Error('사용자 이메일이 없습니다.');
  }

  // 사용자 확인/생성
  const { findOrCreateUser } = await import('./userUtils');
  const user = await findOrCreateUser(session);

  return await syncApplicantsWithTransaction({
    userId: user.id,
    campaignId,
    applicantsData,
  });
}

/**
 * 데이터 검증 함수
 */
export function validateApplicantData(applicant: Applicant): string[] {
  const errors: string[] = [];

  if (!applicant.email) {
    errors.push('이메일이 필요합니다.');
  }

  if (!applicant.name) {
    errors.push('이름이 필요합니다.');
  }

  if (applicant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant.email)) {
    errors.push('유효하지 않은 이메일 형식입니다.');
  }

  return errors;
}

/**
 * 동기화 전 데이터 사전 검증
 */
export function validateSyncData(applicantsData: Applicant[]): {
  validApplicants: Applicant[];
  invalidApplicants: { applicant: Applicant; errors: string[] }[];
} {
  const validApplicants: Applicant[] = [];
  const invalidApplicants: { applicant: Applicant; errors: string[] }[] = [];

  for (const applicant of applicantsData) {
    const errors = validateApplicantData(applicant);
    if (errors.length === 0) {
      validApplicants.push(applicant);
    } else {
      invalidApplicants.push({ applicant, errors });
    }
  }

  return { validApplicants, invalidApplicants };
}