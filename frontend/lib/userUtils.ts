/**
 * 사용자 관련 유틸리티 함수들
 */

import { prisma } from './database';
import { Session } from 'next-auth';

/**
 * 세션에서 사용자를 찾거나 생성합니다.
 * @param session NextAuth 세션 객체
 * @returns 사용자 객체
 */
export async function findOrCreateUser(session: Session) {
  if (!session.user?.email) {
    throw new Error('사용자 이메일이 없습니다.');
  }

  // 기존 사용자 찾기
  let user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  // 사용자가 없으면 생성
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.user.email,
        name: session.user.name || 'Unknown User',
        image: session.user.image || null
      }
    });
  }

  return user;
}

/**
 * 사용자의 기본 캠페인을 찾거나 생성합니다.
 * @param userId 사용자 ID
 * @param sheetConfig 시트 설정 정보
 * @returns 캠페인 ID
 */
export async function findOrCreateDefaultCampaign(
  userId: string, 
  sheetConfig?: { sheetId?: string; sheetName?: string }
) {
  try {
    const { DatabaseService } = await import('./database');
    
    // 입력 데이터 검증
    if (!userId) {
      throw new Error('사용자 ID가 필요합니다.');
    }

    console.log(`Creating/finding campaign for user: ${userId}`);
    
    const campaignId = await DatabaseService.upsertCampaign(userId, {
      name: sheetConfig?.sheetName || 'Default Campaign',
      description: 'Automatically created campaign',
      sheetId: sheetConfig?.sheetId,
      sheetName: sheetConfig?.sheetName,
      sheetUrl: sheetConfig?.sheetId 
        ? `https://docs.google.com/spreadsheets/d/${sheetConfig.sheetId}`
        : undefined
    });

    console.log(`Campaign ID resolved: ${campaignId}`);
    return campaignId;
  } catch (error) {
    console.error('캠페인 생성/조회 오류:', error);
    throw new Error('캠페인 처리 실패');
  }
}