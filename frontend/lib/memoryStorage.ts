/**
 * 메모리 기반 데이터 저장소 (Vercel 서버리스 환경용)
 * 실제 환경에서는 PostgreSQL이나 다른 데이터베이스로 교체해야 함
 */

import { Applicant, SyncResult } from '@/types/applicant';

// 메모리 저장소
let applicantsMemory: Applicant[] = [];
let syncLogsMemory: SyncResult[] = [];

export class MemoryStorage {
  
  static async getAllApplicants(): Promise<Applicant[]> {
    return [...applicantsMemory]; // 복사본 반환
  }

  static async saveApplicants(applicants: Applicant[]): Promise<void> {
    applicantsMemory = [...applicants]; // 복사본 저장
  }

  static async upsertApplicant(applicant: Applicant): Promise<{ isNew: boolean; applicant: Applicant }> {
    // 이메일을 기준으로 기존 신청자 찾기
    const existingIndex = applicantsMemory.findIndex(a => a.email === applicant.email);
    
    const now = new Date().toISOString();
    const updatedApplicant: Applicant = {
      ...applicant,
      id: applicant.id || this.generateId(),
      lastUpdated: now
    };

    if (existingIndex >= 0) {
      // 기존 신청자 업데이트
      applicantsMemory[existingIndex] = {
        ...applicantsMemory[existingIndex],
        ...updatedApplicant,
      };
      return { isNew: false, applicant: applicantsMemory[existingIndex] };
    } else {
      // 새 신청자 추가
      applicantsMemory.push(updatedApplicant);
      return { isNew: true, applicant: updatedApplicant };
    }
  }

  static async getApplicantByEmail(email: string): Promise<Applicant | null> {
    return applicantsMemory.find(a => a.email === email) || null;
  }

  static async logSyncResult(result: SyncResult): Promise<void> {
    syncLogsMemory.unshift(result); // 최신 로그를 앞에 추가
    
    // 최근 100개 로그만 유지
    if (syncLogsMemory.length > 100) {
      syncLogsMemory = syncLogsMemory.slice(0, 100);
    }
  }

  static async getSyncLogs(): Promise<SyncResult[]> {
    return [...syncLogsMemory]; // 복사본 반환
  }

  private static generateId(): string {
    return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 개발/테스트용 데이터 초기화
  static clearAll(): void {
    applicantsMemory = [];
    syncLogsMemory = [];
  }

  // 현재 저장된 데이터 상태 확인
  static getStatus(): { applicantsCount: number; syncLogsCount: number } {
    return {
      applicantsCount: applicantsMemory.length,
      syncLogsCount: syncLogsMemory.length
    };
  }
}