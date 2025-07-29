/**
 * 체험단 선정/비선정 관련 타입 정의
 */

export interface SelectionRecord {
  id?: string;
  applicantEmail: string;
  applicantName: string;
  campaignId?: string; // 향후 브랜드별 관리를 위한 필드
  isSelected: boolean;
  selectionReason: string;
  selectionDate: string;
  
  // 각 플랫폼별 기준 충족 여부
  meetsCriteria: {
    naverBlog: boolean;
    instagram: boolean;
    threads: boolean;
  };
  
  // 기준을 충족한 플랫폼 목록
  qualifyingPlatforms: string[];
  
  // SNS 영향력 데이터 스냅샷
  snsData: {
    naverBlog?: {
      url?: string;
      visitors?: number;
    };
    instagram?: {
      url?: string;
      followers?: number;
      handle?: string;
    };
    threads?: {
      url?: string;
      followers?: number;
      handle?: string;
    };
  };
  
  // 처리 상태
  processingStatus: 'pending' | 'completed' | 'failed';
  
  // 구글시트 업데이트 상태
  sheetUpdated: boolean;
  sheetUpdateDate?: string;
  
  // 메일 발송 상태 (향후 T-013에서 사용)
  emailSent: boolean;
  emailSentDate?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt: string;
}

export interface SelectionBatchProcess {
  id: string;
  totalApplicants: number;
  processedApplicants: number;
  selectedCount: number;
  rejectedCount: number;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  errors: string[];
}

export interface SelectionStats {
  totalProcessed: number;
  selectedCount: number;
  rejectedCount: number;
  selectionRate: number; // 선정률 (%)
  
  // 플랫폼별 통계
  platformStats: {
    naverBlog: {
      qualified: number;
      averageVisitors: number;
    };
    instagram: {
      qualified: number;
      averageFollowers: number;
    };
    threads: {
      qualified: number;
      averageFollowers: number;
    };
  };
  
  lastUpdated: string;
}

// 선정 결과 필터링 옵션
export interface SelectionFilter {
  isSelected?: boolean;
  campaignId?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  platform?: 'naverBlog' | 'instagram' | 'threads';
  processingStatus?: 'pending' | 'completed' | 'failed';
}