/**
 * 신청자 데이터 로컬 저장 관리
 * 실제 환경에서는 PostgreSQL로 대체
 */

import fs from 'fs';
import path from 'path';
import { Applicant, SyncResult } from '@/types/applicant';

const DATA_DIR = path.join(process.cwd(), 'data');
const APPLICANTS_FILE = path.join(DATA_DIR, 'applicants.json');
const SYNC_LOG_FILE = path.join(DATA_DIR, 'sync_log.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class ApplicantStorage {
  
  static async getAllApplicants(): Promise<Applicant[]> {
    try {
      if (!fs.existsSync(APPLICANTS_FILE)) {
        return [];
      }
      const data = fs.readFileSync(APPLICANTS_FILE, 'utf-8');
      return JSON.parse(data) as Applicant[];
    } catch (error) {
      console.error('Error reading applicants:', error);
      return [];
    }
  }

  static async saveApplicants(applicants: Applicant[]): Promise<void> {
    try {
      fs.writeFileSync(APPLICANTS_FILE, JSON.stringify(applicants, null, 2));
    } catch (error) {
      console.error('Error saving applicants:', error);
      throw error;
    }
  }

  static async upsertApplicant(applicant: Applicant): Promise<{ isNew: boolean; applicant: Applicant }> {
    const applicants = await this.getAllApplicants();
    
    // 이메일을 기준으로 기존 신청자 찾기
    const existingIndex = applicants.findIndex(a => a.email === applicant.email);
    
    const now = new Date().toISOString();
    const updatedApplicant: Applicant = {
      ...applicant,
      id: applicant.id || this.generateId(),
      lastUpdated: now
    };

    if (existingIndex >= 0) {
      // 기존 신청자 업데이트
      applicants[existingIndex] = {
        ...applicants[existingIndex],
        ...updatedApplicant,
      };
      await this.saveApplicants(applicants);
      return { isNew: false, applicant: applicants[existingIndex] };
    } else {
      // 새 신청자 추가
      applicants.push(updatedApplicant);
      await this.saveApplicants(applicants);
      return { isNew: true, applicant: updatedApplicant };
    }
  }

  static async getApplicantByEmail(email: string): Promise<Applicant | null> {
    const applicants = await this.getAllApplicants();
    return applicants.find(a => a.email === email) || null;
  }

  static async logSyncResult(result: SyncResult): Promise<void> {
    try {
      let logs: SyncResult[] = [];
      if (fs.existsSync(SYNC_LOG_FILE)) {
        const data = fs.readFileSync(SYNC_LOG_FILE, 'utf-8');
        logs = JSON.parse(data);
      }
      
      logs.unshift(result); // 최신 로그를 앞에 추가
      
      // 최근 100개 로그만 유지
      if (logs.length > 100) {
        logs = logs.slice(0, 100);
      }
      
      fs.writeFileSync(SYNC_LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error logging sync result:', error);
    }
  }

  static async getSyncLogs(): Promise<SyncResult[]> {
    try {
      if (!fs.existsSync(SYNC_LOG_FILE)) {
        return [];
      }
      const data = fs.readFileSync(SYNC_LOG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading sync logs:', error);
      return [];
    }
  }

  private static generateId(): string {
    return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}