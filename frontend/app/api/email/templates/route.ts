/**
 * 메일 템플릿 관리 API 엔드포인트
 * GET /api/email/templates - 템플릿 목록 조회
 * POST /api/email/templates - 템플릿 생성
 * PUT /api/email/templates - 템플릿 수정
 * DELETE /api/email/templates - 템플릿 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { EmailTemplateService } from '@/lib/email';

// GET - 템플릿 목록 조회
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
    const type = searchParams.get('type');

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
    const where: any = { campaignId, isActive: true };
    if (type && ['SELECTION_NOTIFICATION', 'REJECTION_NOTIFICATION', 'FOLLOW_UP', 'REMINDER', 'CUSTOM'].includes(type)) {
      where.type = type;
    }

    // 템플릿 목록 조회
    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: template.variables,
        isActive: template.isActive,
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }))
    });

  } catch (error) {
    console.error('템플릿 조회 오류:', error);
    return NextResponse.json(
      { error: '템플릿 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST - 템플릿 생성
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
    const { 
      campaignId, 
      name, 
      type, 
      subject, 
      htmlContent, 
      textContent, 
      isDefault = false 
    } = body;

    // 입력 데이터 검증
    if (!campaignId || !name || !type || !subject || !htmlContent) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
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

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 템플릿 검증
    const validation = EmailTemplateService.validateTemplate(htmlContent);
    if (!validation.isValid) {
      return NextResponse.json({
        error: '템플릿에 유효하지 않은 변수가 포함되어 있습니다.',
        missingVariables: validation.missingVariables,
        availableVariables: validation.availableVariables
      }, { status: 400 });
    }

    // 트랜잭션으로 템플릿 생성
    const template = await prisma.$transaction(async (tx) => {
      // 기본 템플릿으로 설정하는 경우, 기존 기본 템플릿 해제
      if (isDefault) {
        await tx.emailTemplate.updateMany({
          where: {
            campaignId,
            type,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      // 새 템플릿 생성
      return await tx.emailTemplate.create({
        data: {
          name,
          type,
          subject,
          htmlContent,
          textContent,
          variables: validation.availableVariables,
          isDefault,
          campaignId,
          userId: user.id
        }
      });
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: template.variables,
        isActive: template.isActive,
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: '템플릿이 생성되었습니다.'
    });

  } catch (error) {
    console.error('템플릿 생성 오류:', error);
    return NextResponse.json(
      { error: '템플릿 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT - 템플릿 수정
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      templateId, 
      name, 
      subject, 
      htmlContent, 
      textContent, 
      isDefault = false 
    } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: '템플릿 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 템플릿 조회 및 권한 확인
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
      include: {
        campaign: {
          include: {
            user: true
          }
        }
      }
    });

    if (!existingTemplate || existingTemplate.campaign.user.email !== session.user.email) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 템플릿 검증
    if (htmlContent) {
      const validation = EmailTemplateService.validateTemplate(htmlContent);
      if (!validation.isValid) {
        return NextResponse.json({
          error: '템플릿에 유효하지 않은 변수가 포함되어 있습니다.',
          missingVariables: validation.missingVariables,
          availableVariables: validation.availableVariables
        }, { status: 400 });
      }
    }

    // 트랜잭션으로 템플릿 수정
    const template = await prisma.$transaction(async (tx) => {
      // 기본 템플릿으로 설정하는 경우, 기존 기본 템플릿 해제
      if (isDefault && !existingTemplate.isDefault) {
        await tx.emailTemplate.updateMany({
          where: {
            campaignId: existingTemplate.campaignId,
            type: existingTemplate.type,
            isDefault: true,
            id: { not: templateId }
          },
          data: {
            isDefault: false
          }
        });
      }

      // 템플릿 수정
      return await tx.emailTemplate.update({
        where: { id: templateId },
        data: {
          ...(name && { name }),
          ...(subject && { subject }),
          ...(htmlContent && { htmlContent }),
          ...(textContent !== undefined && { textContent }),
          ...(isDefault !== undefined && { isDefault })
        }
      });
    });

    return NextResponse.json({
      success: true,
      template,
      message: '템플릿이 수정되었습니다.'
    });

  } catch (error) {
    console.error('템플릿 수정 오류:', error);
    return NextResponse.json(
      { error: '템플릿 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE - 템플릿 삭제
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
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { error: '템플릿 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 템플릿 조회 및 권한 확인
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
      include: {
        campaign: {
          include: {
            user: true
          }
        }
      }
    });

    if (!template || template.campaign.user.email !== session.user.email) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 기본 템플릿은 삭제 불가
    if (template.isDefault) {
      return NextResponse.json(
        { error: '기본 템플릿은 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 템플릿 비활성화 (실제 삭제 대신)
    await prisma.emailTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: '템플릿이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('템플릿 삭제 오류:', error);
    return NextResponse.json(
      { error: '템플릿 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}