/**
 * 이메일 발송 서비스
 * Nodemailer를 사용한 메일 발송 및 템플릿 처리
 */

import nodemailer from 'nodemailer';
import { prisma } from './database';
import { Applicant } from '@/types/applicant';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailVariables {
  applicantName: string;
  campaignName: string;
  productName?: string;
  couponCode?: string;
  couponUrl?: string;
  companyName?: string;
  [key: string]: string | undefined;
}

/**
 * 이메일 서비스 클래스
 */
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Nodemailer transporter 초기화
   */
  private static async getTransporter() {
    if (!this.transporter) {
      // Gmail SMTP 설정 (환경변수로 설정 필요)
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '', // App Password 사용
        },
      });

      // SMTP 연결 테스트
      try {
        await this.transporter.verify();
        console.log('SMTP 서버 연결 성공');
      } catch (error) {
        console.error('SMTP 서버 연결 실패:', error);
        throw new Error('메일 서버 연결에 실패했습니다.');
      }
    }

    return this.transporter;
  }

  /**
   * 메일 템플릿에 변수 치환
   */
  private static substituteVariables(template: string, variables: EmailVariables): string {
    let result = template;
    
    // {{변수명}} 형태의 플레이스홀더를 실제 값으로 치환
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, value || '');
    });

    return result;
  }

  /**
   * 선정 메일 템플릿 생성
   */
  private static generateSelectionTemplate(variables: EmailVariables): EmailTemplate {
    const subject = `🎉 [${variables.campaignName}] 체험단 선정을 축하드립니다!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #eee; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .highlight { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 체험단 선정 축하드립니다!</h1>
            <p>{{campaignName}} 체험단에 선정되셨습니다</p>
          </div>
          
          <div class="content">
            <p>안녕하세요, <strong>{{applicantName}}</strong>님!</p>
            
            <p>{{campaignName}} 체험단 신청해주셔서 감사합니다.<br>
            귀하의 SNS 영향력과 활동성을 검토한 결과, <strong>체험단으로 선정</strong>되셨음을 알려드립니다.</p>
            
            <div class="highlight">
              <h3>📋 다음 단계 안내</h3>
              <ul>
                <li>체험 제품 발송을 위해 배송지 정보를 확인해주세요</li>
                <li>체험 후 솔직한 리뷰 작성을 부탁드립니다</li>
                <li>리뷰 작성 기한: 체험 제품 수령 후 2주 이내</li>
              </ul>
            </div>
            
            <p>궁금한 사항이 있으시면 언제든지 연락주세요.</p>
            
            <p>감사합니다.<br>
            <strong>{{companyName}}</strong> 드림</p>
          </div>
          
          <div class="footer">
            <p>본 메일은 체험단 신청자에게 자동 발송되는 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
안녕하세요, ${variables.applicantName}님!

${variables.campaignName} 체험단에 선정되셨습니다.

다음 단계 안내:
- 체험 제품 발송을 위해 배송지 정보를 확인해주세요
- 체험 후 솔직한 리뷰 작성을 부탁드립니다
- 리뷰 작성 기한: 체험 제품 수령 후 2주 이내

궁금한 사항이 있으시면 언제든지 연락주세요.

감사합니다.
${variables.companyName} 드림
    `;

    return {
      subject: this.substituteVariables(subject, variables),
      html: this.substituteVariables(html, variables),
      text: this.substituteVariables(text, variables),
    };
  }

  /**
   * 비선정 메일 템플릿 생성
   */
  private static generateRejectionTemplate(variables: EmailVariables): EmailTemplate {
    const subject = `[${variables.campaignName}] 체험단 신청 결과 안내`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #eee; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #74b9ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .coupon { background: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; border: 2px dashed #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>체험단 신청 결과 안내</h1>
            <p>{{campaignName}} 체험단 신청해주셔서 감사합니다</p>
          </div>
          
          <div class="content">
            <p>안녕하세요, <strong>{{applicantName}}</strong>님!</p>
            
            <p>{{campaignName}} 체험단에 신청해주셔서 진심으로 감사드립니다.</p>
            
            <p>안타깝게도 이번 체험단에는 선정되지 못하셨습니다.<br>
            많은 분들이 신청해주셨고, 제한된 인원으로 인해 모든 분을 선정해드리지 못해 죄송합니다.</p>
            
            <div class="coupon">
              <h3>🎁 특별 할인 혜택</h3>
              <p>체험단 신청해주신 감사의 마음을 담아 특별 할인 쿠폰을 드립니다.</p>
              {{#if couponCode}}
              <p><strong>쿠폰코드: {{couponCode}}</strong></p>
              {{/if}}
              {{#if couponUrl}}
              <a href="{{couponUrl}}" class="button">할인받기</a>
              {{/if}}
            </div>
            
            <p>앞으로도 더 좋은 기회로 찾아뵙겠습니다.</p>
            
            <p>감사합니다.<br>
            <strong>{{companyName}}</strong> 드림</p>
          </div>
          
          <div class="footer">
            <p>본 메일은 체험단 신청자에게 자동 발송되는 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
안녕하세요, ${variables.applicantName}님!

${variables.campaignName} 체험단에 신청해주셔서 진심으로 감사드립니다.

안타깝게도 이번 체험단에는 선정되지 못하셨습니다.
많은 분들이 신청해주셨고, 제한된 인원으로 인해 모든 분을 선정해드리지 못해 죄송합니다.

🎁 특별 할인 혜택
체험단 신청해주신 감사의 마음을 담아 특별 할인 쿠폰을 드립니다.
${variables.couponCode ? `쿠폰코드: ${variables.couponCode}` : ''}
${variables.couponUrl ? `할인 링크: ${variables.couponUrl}` : ''}

앞으로도 더 좋은 기회로 찾아뵙겠습니다.

감사합니다.
${variables.companyName} 드림
    `;

    return {
      subject: this.substituteVariables(subject, variables),
      html: this.substituteVariables(html, variables),
      text: this.substituteVariables(text, variables),
    };
  }

  /**
   * 메일 발송
   */
  static async sendEmail(
    to: string,
    template: EmailTemplate,
    campaignId: string,
    applicantId: string,
    mailType: 'SELECTION_NOTIFICATION' | 'REJECTION_NOTIFICATION' | 'FOLLOW_UP' | 'REMINDER'
  ): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();

      // 메일 발송
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'AIMAX'}" <${process.env.SMTP_USER}>`,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      console.log(`메일 발송 성공: ${info.messageId}`);

      // 발송 내역을 데이터베이스에 기록
      await prisma.mailHistory.create({
        data: {
          mailType,
          recipient: to,
          subject: template.subject,
          content: template.html,
          status: 'SENT',
          sentAt: new Date(),
          applicantId,
          campaignId,
        },
      });

      return true;
    } catch (error) {
      console.error('메일 발송 실패:', error);

      // 실패 내역도 데이터베이스에 기록
      await prisma.mailHistory.create({
        data: {
          mailType,
          recipient: to,
          subject: template.subject,
          content: template.html,
          status: 'FAILED',
          failReason: error instanceof Error ? error.message : '알 수 없는 오류',
          applicantId,
          campaignId,
        },
      });

      return false;
    }
  }

  /**
   * 선정 메일 발송
   */
  static async sendSelectionEmail(
    applicant: Applicant,
    campaignId: string,
    campaignName: string,
    companyName = 'AIMAX'
  ): Promise<boolean> {
    const variables: EmailVariables = {
      applicantName: applicant.name,
      campaignName,
      companyName,
    };

    const template = this.generateSelectionTemplate(variables);
    
    return await this.sendEmail(
      applicant.email,
      template,
      campaignId,
      applicant.id || '',
      'SELECTION_NOTIFICATION'
    );
  }

  /**
   * 비선정 메일 발송
   */
  static async sendRejectionEmail(
    applicant: Applicant,
    campaignId: string,
    campaignName: string,
    options?: {
      couponCode?: string;
      couponUrl?: string;
      companyName?: string;
    }
  ): Promise<boolean> {
    const variables: EmailVariables = {
      applicantName: applicant.name,
      campaignName,
      couponCode: options?.couponCode,
      couponUrl: options?.couponUrl,
      companyName: options?.companyName || 'AIMAX',
    };

    const template = this.generateRejectionTemplate(variables);
    
    return await this.sendEmail(
      applicant.email,
      template,
      campaignId,
      applicant.id || '',
      'REJECTION_NOTIFICATION'
    );
  }

  /**
   * 대량 메일 발송 (배치 처리)
   */
  static async sendBulkEmails(
    applicants: Applicant[],
    campaignId: string,
    campaignName: string,
    options?: {
      couponCode?: string;
      couponUrl?: string;
      companyName?: string;
      batchSize?: number;
    }
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const { batchSize = 10 } = options || {};
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // 배치로 나누어 처리
    for (let i = 0; i < applicants.length; i += batchSize) {
      const batch = applicants.slice(i, i + batchSize);
      
      const promises = batch.map(async (applicant) => {
        try {
          let result = false;
          
          if (applicant.status === 'approved') {
            result = await this.sendSelectionEmail(applicant, campaignId, campaignName, options?.companyName);
          } else if (applicant.status === 'rejected') {
            result = await this.sendRejectionEmail(applicant, campaignId, campaignName, options);
          }

          if (result) {
            success++;
          } else {
            failed++;
            errors.push(`${applicant.email}: 메일 발송 실패`);
          }
        } catch (error) {
          failed++;
          errors.push(`${applicant.email}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      });

      await Promise.all(promises);
      
      // 배치 간 딜레이 (메일 서버 부하 방지)
      if (i + batchSize < applicants.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { success, failed, errors };
  }
}

/**
 * 메일 템플릿 유틸리티
 */
export class EmailTemplateService {
  /**
   * 사용자 정의 템플릿으로 메일 발송
   */
  static async sendCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    variables: EmailVariables,
    campaignId: string,
    applicantId: string,
    mailType: 'SELECTION_NOTIFICATION' | 'REJECTION_NOTIFICATION' | 'FOLLOW_UP' | 'REMINDER'
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: EmailService['substituteVariables'](subject, variables),
      html: EmailService['substituteVariables'](htmlContent, variables),
    };

    return await EmailService.sendEmail(to, template, campaignId, applicantId, mailType);
  }

  /**
   * 템플릿 변수 검증
   */
  static validateTemplate(template: string): {
    isValid: boolean;
    missingVariables: string[];
    availableVariables: string[];
  } {
    const availableVariables = [
      'applicantName',
      'campaignName',
      'productName',
      'couponCode',
      'couponUrl',
      'companyName',
    ];

    // 템플릿에서 사용된 변수 추출
    const usedVariables = Array.from(
      template.matchAll(/{{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*}}/g),
      match => match[1]
    );

    // 사용 가능하지 않은 변수 찾기
    const missingVariables = usedVariables.filter(
      variable => !availableVariables.includes(variable)
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
      availableVariables,
    };
  }
}