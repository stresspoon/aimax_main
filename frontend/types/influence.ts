/**
 * SNS 영향력 검증 관련 타입 정의
 */

export interface InfluenceCriteria {
  naverBlog: {
    minVisitors: number; // 최소 방문자 수 (300)
  };
  instagram: {
    minFollowers: number; // 최소 팔로워 수 (1000)
  };
  threads: {
    minFollowers: number; // 최소 팔로워 수 (500)
  };
}

export interface SNSProfile {
  platform: 'naver_blog' | 'instagram' | 'threads';
  url: string;
  username?: string;
  followers?: number;
  visitors?: number;
  lastChecked: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface InfluenceVerification {
  applicantEmail: string;
  profiles: SNSProfile[];
  overallResult: {
    meetsAllCriteria: boolean;
    meetsCriteria: {
      naverBlog: boolean;
      instagram: boolean;
      threads: boolean;
    };
    totalScore: number; // 기준 대비 점수
  };
  verificationDate: string;
  notes?: string;
}

export interface ScrapingResult {
  success: boolean;
  data?: {
    followers?: number;
    visitors?: number;
    username?: string;
  };
  error?: string;
  retryCount?: number;
}

// 기본 영향력 기준
export const DEFAULT_INFLUENCE_CRITERIA: InfluenceCriteria = {
  naverBlog: {
    minVisitors: 300
  },
  instagram: {
    minFollowers: 1000
  },
  threads: {
    minFollowers: 500
  }
};