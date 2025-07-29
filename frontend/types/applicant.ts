/**
 * 신청자 데이터 타입 정의
 */

export interface SNSProfile {
  platform: 'instagram' | 'blog' | 'threads';
  url: string;
  handle?: string;
  followers?: number;
}

export interface Applicant {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  snsProfiles: SNSProfile[];
  // 기존 호환성을 위해 유지
  instagramHandle?: string;
  followers?: number;
  applicationDate: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  sheetRowIndex: number; // Google Sheets에서의 행 번호
  lastUpdated: string;
}

export interface SyncResult {
  success: boolean;
  newApplicants: number;
  updatedApplicants: number;
  errors: string[];
  lastSyncTime: string;
}

export interface SheetDataRow {
  [key: string]: string | number | undefined;
}

export interface ApplicantSheet {
  sheetId: string;
  sheetName: string;
  headerRow: number;
  columnMapping: {
    name: string;
    email: string;
    phone?: string;
    instagram?: string;
    snsUrls?: string[]; // 다중 SNS URL 컬럼들
    followers?: string;
    applicationDate?: string;
    status?: string;
    notes?: string;
  };
}