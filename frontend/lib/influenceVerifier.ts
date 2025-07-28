/**
 * SNS 영향력 자동 검증 서비스
 */

import { InfluenceVerification, SNSProfile, DEFAULT_INFLUENCE_CRITERIA, InfluenceCriteria } from '@/types/influence';
import { InstagramScraper } from './scrapers/instagramScraper';
import { NaverBlogScraper } from './scrapers/naverBlogScraper';
import { ThreadsScraper } from './scrapers/threadsScraper';

export class InfluenceVerifier {
  private criteria: InfluenceCriteria;

  constructor(criteria: InfluenceCriteria = DEFAULT_INFLUENCE_CRITERIA) {
    this.criteria = criteria;
  }

  /**
   * 신청자의 모든 SNS 프로필을 검증
   */
  async verifyInfluence(
    applicantEmail: string,
    urls: {
      naverBlog?: string;
      instagram?: string;
      threads?: string;
    }
  ): Promise<InfluenceVerification> {
    const profiles: SNSProfile[] = [];
    const results = {
      naverBlog: false,
      instagram: false,
      threads: false
    };

    // 네이버 블로그 검증
    if (urls.naverBlog) {
      const naverResult = await this.verifyNaverBlog(urls.naverBlog);
      profiles.push(naverResult);
      results.naverBlog = naverResult.isValid && 
        (naverResult.visitors || 0) >= this.criteria.naverBlog.minVisitors;
    }

    // 인스타그램 검증
    if (urls.instagram) {
      const instagramResult = await this.verifyInstagram(urls.instagram);
      profiles.push(instagramResult);
      results.instagram = instagramResult.isValid && 
        (instagramResult.followers || 0) >= this.criteria.instagram.minFollowers;
    }

    // Threads 검증
    if (urls.threads) {
      const threadsResult = await this.verifyThreads(urls.threads);
      profiles.push(threadsResult);
      results.threads = threadsResult.isValid && 
        (threadsResult.followers || 0) >= this.criteria.threads.minFollowers;
    }

    // 전체 결과 계산
    const meetsAllCriteria = this.calculateOverallResult(results, urls);
    const totalScore = this.calculateTotalScore(profiles);

    return {
      applicantEmail,
      profiles,
      overallResult: {
        meetsAllCriteria,
        meetsCriteria: results,
        totalScore
      },
      verificationDate: new Date().toISOString()
    };
  }

  /**
   * 네이버 블로그 검증
   */
  private async verifyNaverBlog(url: string): Promise<SNSProfile> {
    const profile: SNSProfile = {
      platform: 'naver_blog',
      url,
      lastChecked: new Date().toISOString(),
      isValid: false
    };

    try {
      if (!NaverBlogScraper.isValidNaverBlogUrl(url)) {
        profile.errorMessage = '올바르지 않은 네이버 블로그 URL입니다.';
        return profile;
      }

      const blogId = NaverBlogScraper.extractBlogId(url);
      if (!blogId) {
        profile.errorMessage = '블로그 ID를 추출할 수 없습니다.';
        return profile;
      }

      profile.username = blogId;

      // 재시도 로직
      let lastError = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await NaverBlogScraper.scrapeVisitors(blogId);
        
        if (result.success && result.data) {
          profile.visitors = result.data.visitors;
          profile.isValid = true;
          break;
        } else {
          lastError = result.error || '알 수 없는 오류';
          if (attempt < 3) {
            // 재시도 전 지연
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!profile.isValid) {
        profile.errorMessage = `스크래핑 실패: ${lastError}`;
      }

    } catch (error) {
      profile.errorMessage = `검증 중 오류: ${error}`;
    }

    return profile;
  }

  /**
   * 인스타그램 검증
   */
  private async verifyInstagram(url: string): Promise<SNSProfile> {
    const profile: SNSProfile = {
      platform: 'instagram',
      url,
      lastChecked: new Date().toISOString(),
      isValid: false
    };

    try {
      if (!InstagramScraper.isValidInstagramUrl(url)) {
        profile.errorMessage = '올바르지 않은 인스타그램 URL입니다.';
        return profile;
      }

      const username = InstagramScraper.extractUsername(url);
      if (!username) {
        profile.errorMessage = '사용자명을 추출할 수 없습니다.';
        return profile;
      }

      profile.username = username;

      // 재시도 로직
      let lastError = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await InstagramScraper.scrapeFollowers(username);
        
        if (result.success && result.data) {
          profile.followers = result.data.followers;
          profile.isValid = true;
          break;
        } else {
          lastError = result.error || '알 수 없는 오류';
          if (attempt < 3) {
            // 재시도 전 지연
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }
      }

      if (!profile.isValid) {
        profile.errorMessage = `스크래핑 실패: ${lastError}`;
      }

    } catch (error) {
      profile.errorMessage = `검증 중 오류: ${error}`;
    }

    return profile;
  }

  /**
   * Threads 검증
   */
  private async verifyThreads(url: string): Promise<SNSProfile> {
    const profile: SNSProfile = {
      platform: 'threads',
      url,
      lastChecked: new Date().toISOString(),
      isValid: false
    };

    try {
      if (!ThreadsScraper.isValidThreadsUrl(url)) {
        profile.errorMessage = '올바르지 않은 Threads URL입니다.';
        return profile;
      }

      const username = ThreadsScraper.extractUsername(url);
      if (!username) {
        profile.errorMessage = '사용자명을 추출할 수 없습니다.';
        return profile;
      }

      profile.username = username;

      // 재시도 로직
      let lastError = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await ThreadsScraper.scrapeFollowers(username);
        
        if (result.success && result.data) {
          profile.followers = result.data.followers;
          profile.isValid = true;
          break;
        } else {
          lastError = result.error || '알 수 없는 오류';
          if (attempt < 3) {
            // 재시도 전 지연
            await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
          }
        }
      }

      if (!profile.isValid) {
        profile.errorMessage = `스크래핑 실패: ${lastError}`;
      }

    } catch (error) {
      profile.errorMessage = `검증 중 오류: ${error}`;
    }

    return profile;
  }

  /**
   * 전체 결과 계산
   */
  private calculateOverallResult(
    results: { naverBlog: boolean; instagram: boolean; threads: boolean }, 
    urls: { naverBlog?: string; instagram?: string; threads?: string }
  ): boolean {
    // 제공된 URL에 해당하는 플랫폼의 기준을 모두 충족해야 함
    const requiredPlatforms = [];
    
    if (urls.naverBlog) requiredPlatforms.push('naverBlog');
    if (urls.instagram) requiredPlatforms.push('instagram');
    if (urls.threads) requiredPlatforms.push('threads');

    if (requiredPlatforms.length === 0) return false;

    return requiredPlatforms.every(platform => results[platform as keyof typeof results]);
  }

  /**
   * 총 점수 계산 (기준 대비 백분율)
   */
  private calculateTotalScore(profiles: SNSProfile[]): number {
    let totalScore = 0;
    let validProfiles = 0;

    for (const profile of profiles) {
      if (!profile.isValid) continue;

      let score = 0;
      
      switch (profile.platform) {
        case 'naver_blog':
          if (profile.visitors) {
            score = Math.min(100, (profile.visitors / this.criteria.naverBlog.minVisitors) * 100);
          }
          break;
        case 'instagram':
          if (profile.followers) {
            score = Math.min(100, (profile.followers / this.criteria.instagram.minFollowers) * 100);
          }
          break;
        case 'threads':
          if (profile.followers) {
            score = Math.min(100, (profile.followers / this.criteria.threads.minFollowers) * 100);
          }
          break;
      }

      totalScore += score;
      validProfiles++;
    }

    return validProfiles > 0 ? Math.round(totalScore / validProfiles) : 0;
  }

  /**
   * 캐시된 결과 저장 (나중에 구현)
   */
  async saveVerificationResult(result: InfluenceVerification): Promise<void> {
    // TODO: 데이터베이스에 결과 저장
    console.log('검증 결과 저장:', result);
  }

  /**
   * 캐시된 결과 조회 (나중에 구현)
   */
  async getCachedResult(_applicantEmail: string): Promise<InfluenceVerification | null> {
    // TODO: 데이터베이스에서 캐시된 결과 조회
    return null;
  }
}