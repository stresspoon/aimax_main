/**
 * 체험단 선정/비선정 자동 처리 서비스
 */

import { InfluenceVerification, DEFAULT_INFLUENCE_CRITERIA, InfluenceCriteria } from '@/types/influence';
import { Applicant } from '@/types/applicant';

export interface SelectionResult {
  applicantEmail: string;
  isSelected: boolean;
  selectionReason: string;
  meetsCriteria: {
    naverBlog: boolean;
    instagram: boolean;
    threads: boolean;
  };
  qualifyingPlatforms: string[];
  selectionDate: string;
}

export interface SelectionCriteria extends InfluenceCriteria {
  // 추가 선정 기준이 필요하면 여기에 확장
  requireEmailVerification?: boolean;
}

export class SelectionService {
  private criteria: SelectionCriteria;

  constructor(criteria: SelectionCriteria = DEFAULT_INFLUENCE_CRITERIA) {
    this.criteria = criteria;
  }

  /**
   * 신청자의 영향력 검증 결과를 바탕으로 선정/비선정 결정
   * 선정 기준: 세 채널(네이버 블로그, 인스타그램, 스레드) 중 하나라도 기준을 충족하면 선정
   */
  public processSelection(
    applicant: Applicant,
    influenceVerification: InfluenceVerification
  ): SelectionResult {
    const meetsCriteria = this.evaluateCriteria(influenceVerification);
    const qualifyingPlatforms = this.getQualifyingPlatforms(meetsCriteria);
    const isSelected = qualifyingPlatforms.length > 0;

    return {
      applicantEmail: applicant.email,
      isSelected,
      selectionReason: this.generateSelectionReason(isSelected, qualifyingPlatforms, meetsCriteria),
      meetsCriteria,
      qualifyingPlatforms,
      selectionDate: new Date().toISOString()
    };
  }

  /**
   * 영향력 검증 결과에서 각 플랫폼별 기준 충족 여부 평가
   */
  private evaluateCriteria(verification: InfluenceVerification): {
    naverBlog: boolean;
    instagram: boolean;
    threads: boolean;
  } {
    const criteria = {
      naverBlog: false,
      instagram: false,
      threads: false
    };

    verification.profiles.forEach(profile => {
      if (!profile.isValid) return;

      switch (profile.platform) {
        case 'naver_blog':
          if (profile.visitors && profile.visitors >= this.criteria.naverBlog.minVisitors) {
            criteria.naverBlog = true;
          }
          break;
        case 'instagram':
          if (profile.followers && profile.followers >= this.criteria.instagram.minFollowers) {
            criteria.instagram = true;
          }
          break;
        case 'threads':
          if (profile.followers && profile.followers >= this.criteria.threads.minFollowers) {
            criteria.threads = true;
          }
          break;
      }
    });

    return criteria;
  }

  /**
   * 기준을 충족한 플랫폼 목록 반환
   */
  private getQualifyingPlatforms(meetsCriteria: {
    naverBlog: boolean;
    instagram: boolean;
    threads: boolean;
  }): string[] {
    const qualifying: string[] = [];

    if (meetsCriteria.naverBlog) qualifying.push('네이버 블로그');
    if (meetsCriteria.instagram) qualifying.push('인스타그램');
    if (meetsCriteria.threads) qualifying.push('스레드');

    return qualifying;
  }

  /**
   * 선정/비선정 사유 생성
   */
  private generateSelectionReason(
    isSelected: boolean,
    qualifyingPlatforms: string[],
    meetsCriteria: {
      naverBlog: boolean;
      instagram: boolean;
      threads: boolean;
    }
  ): string {
    if (isSelected) {
      return `선정: ${qualifyingPlatforms.join(', ')}에서 영향력 기준을 충족함`;
    } else {
      const reasons: string[] = [];
      
      if (!meetsCriteria.naverBlog) {
        reasons.push(`네이버 블로그 방문자 수 ${this.criteria.naverBlog.minVisitors}명 미달`);
      }
      if (!meetsCriteria.instagram) {
        reasons.push(`인스타그램 팔로워 수 ${this.criteria.instagram.minFollowers}명 미달`);
      }
      if (!meetsCriteria.threads) {
        reasons.push(`스레드 팔로워 수 ${this.criteria.threads.minFollowers}명 미달`);
      }

      return `비선정: ${reasons.join(', ')}`;
    }
  }

  /**
   * 여러 신청자를 한 번에 처리
   */
  public async processBatchSelection(
    applicants: Applicant[],
    verifications: Map<string, InfluenceVerification>
  ): Promise<SelectionResult[]> {
    const results: SelectionResult[] = [];

    for (const applicant of applicants) {
      const verification = verifications.get(applicant.email);
      if (!verification) {
        // 영향력 검증이 없는 경우 기본적으로 비선정
        results.push({
          applicantEmail: applicant.email,
          isSelected: false,
          selectionReason: '비선정: SNS 영향력 검증 결과 없음',
          meetsCriteria: {
            naverBlog: false,
            instagram: false,
            threads: false
          },
          qualifyingPlatforms: [],
          selectionDate: new Date().toISOString()
        });
        continue;
      }

      const result = this.processSelection(applicant, verification);
      results.push(result);
    }

    return results;
  }

  /**
   * 선정 기준 업데이트
   */
  public updateCriteria(newCriteria: Partial<SelectionCriteria>): void {
    this.criteria = { ...this.criteria, ...newCriteria };
  }

  /**
   * 현재 선정 기준 조회
   */
  public getCriteria(): SelectionCriteria {
    return { ...this.criteria };
  }
}

// 기본 선정 서비스 인스턴스
export const defaultSelectionService = new SelectionService();