/**
 * 선정/비선정 프로세스 통합 처리 서비스
 */

import { SelectionService, SelectionResult } from './selectionService';
import { SelectionStorage } from './selectionStorage';
import { SheetResultUpdater, SheetUpdateResult } from './sheetResultUpdater';
import { MemoryStorage } from './memoryStorage';
import { Applicant, ApplicantSheet } from '@/types/applicant';
import { InfluenceVerification } from '@/types/influence';
import { SelectionRecord, SelectionBatchProcess } from '@/types/selection';

export interface ProcessSelectionOptions {
  sheetConfig: ApplicantSheet;
  accessToken: string;
  updateSheet?: boolean; // 구글시트 업데이트 여부 (기본값: true)
  sendNotification?: boolean; // 알림 발송 여부 (기본값: false, 향후 구현)
}

export interface ProcessSelectionResult {
  success: boolean;
  processId: string;
  totalProcessed: number;
  selectedCount: number;
  rejectedCount: number;
  sheetUpdateResult?: SheetUpdateResult;
  errors: string[];
  completedAt: string;
}

export class SelectionProcessor {
  private selectionService: SelectionService;

  constructor() {
    this.selectionService = new SelectionService();
  }

  /**
   * 모든 신청자에 대해 선정/비선정 프로세스 실행
   */
  async processAllApplicants(options: ProcessSelectionOptions): Promise<ProcessSelectionResult> {
    const processId = this.generateProcessId();
    
    // 배치 프로세스 초기화
    const batchProcess: SelectionBatchProcess = {
      id: processId,
      totalApplicants: 0,
      processedApplicants: 0,
      selectedCount: 0,
      rejectedCount: 0,
      status: 'running',
      startTime: new Date().toISOString(),
      errors: []
    };

    try {
      // 1. 모든 신청자 조회
      const applicants = await MemoryStorage.getAllApplicants();
      batchProcess.totalApplicants = applicants.length;
      await SelectionStorage.saveBatchProcess(batchProcess);

      if (applicants.length === 0) {
        return {
          success: true,
          processId,
          totalProcessed: 0,
          selectedCount: 0,
          rejectedCount: 0,
          errors: ['처리할 신청자가 없습니다.'],
          completedAt: new Date().toISOString()
        };
      }

      // 2. 영향력 검증 결과 수집
      const verificationMap = new Map<string, InfluenceVerification>();
      // TODO: 실제 영향력 검증 데이터 연결 (현재는 더미 데이터)
      
      // 3. 선정/비선정 로직 실행
      const selectionResults = await this.selectionService.processBatchSelection(applicants, verificationMap);
      
      // 4. 선정 결과를 DB에 저장
      const selectionRecords = await this.createSelectionRecords(applicants, selectionResults);
      const saveResult = await SelectionStorage.saveBatchSelectionResults(selectionRecords);
      
      // 5. 구글시트 업데이트 (옵션)
      let sheetUpdateResult: SheetUpdateResult | undefined;
      if (options.updateSheet !== false) {
        sheetUpdateResult = await this.updateGoogleSheet(
          options.sheetConfig,
          options.accessToken,
          selectionRecords,
          applicants
        );
      }

      // 6. 통계 계산
      const selectedCount = selectionResults.filter(r => r.isSelected).length;
      const rejectedCount = selectionResults.length - selectedCount;

      // 7. 배치 프로세스 완료 처리
      batchProcess.processedApplicants = selectionResults.length;
      batchProcess.selectedCount = selectedCount;
      batchProcess.rejectedCount = rejectedCount;
      batchProcess.status = 'completed';
      batchProcess.endTime = new Date().toISOString();
      batchProcess.errors = [...saveResult.errors, ...(sheetUpdateResult?.errors || [])];
      
      await SelectionStorage.saveBatchProcess(batchProcess);

      return {
        success: saveResult.errors.length === 0 && (sheetUpdateResult?.success !== false),
        processId,
        totalProcessed: selectionResults.length,
        selectedCount,
        rejectedCount,
        sheetUpdateResult,
        errors: batchProcess.errors,
        completedAt: batchProcess.endTime!
      };

    } catch (error) {
      console.error('선정 프로세스 오류:', error);
      
      // 배치 프로세스 실패 처리
      batchProcess.status = 'failed';
      batchProcess.endTime = new Date().toISOString();
      batchProcess.errors.push(error instanceof Error ? error.message : '알 수 없는 오류');
      await SelectionStorage.saveBatchProcess(batchProcess);

      return {
        success: false,
        processId,
        totalProcessed: 0,
        selectedCount: 0,
        rejectedCount: 0,
        errors: batchProcess.errors,
        completedAt: batchProcess.endTime!
      };
    }
  }

  /**
   * 특정 신청자에 대해서만 선정 프로세스 실행
   */
  async processSingleApplicant(
    applicantEmail: string,
    options: ProcessSelectionOptions
  ): Promise<ProcessSelectionResult> {
    try {
      // 1. 신청자 정보 조회
      const applicant = await MemoryStorage.getApplicantByEmail(applicantEmail);
      if (!applicant) {
        return {
          success: false,
          processId: this.generateProcessId(),
          totalProcessed: 0,
          selectedCount: 0,
          rejectedCount: 0,
          errors: ['신청자를 찾을 수 없습니다.'],
          completedAt: new Date().toISOString()
        };
      }

      // 2. 영향력 검증 결과 조회
      // TODO: 실제 영향력 검증 데이터 연결
      const verificationMap = new Map<string, InfluenceVerification>();
      
      // 3. 선정 로직 실행
      const selectionResults = await this.selectionService.processBatchSelection([applicant], verificationMap);
      const selectionResult = selectionResults[0];

      // 4. 선정 결과 저장
      const selectionRecord = await this.createSelectionRecord(applicant, selectionResult);
      await SelectionStorage.saveSelectionResult(selectionRecord);

      // 5. 구글시트 업데이트
      let sheetUpdateResult: SheetUpdateResult | undefined;
      if (options.updateSheet !== false) {
        const sheetUpdater = new SheetResultUpdater(options.accessToken);
        sheetUpdateResult = await sheetUpdater.updateSelectionResult(
          options.sheetConfig,
          selectionRecord,
          applicant.sheetRowIndex
        );
      }

      return {
        success: true,
        processId: this.generateProcessId(),
        totalProcessed: 1,
        selectedCount: selectionResult.isSelected ? 1 : 0,
        rejectedCount: selectionResult.isSelected ? 0 : 1,
        sheetUpdateResult,
        errors: [],
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('단일 신청자 처리 오류:', error);
      return {
        success: false,
        processId: this.generateProcessId(),
        totalProcessed: 0,
        selectedCount: 0,
        rejectedCount: 0,
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        completedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 선정 결과를 SelectionRecord로 변환
   */
  private async createSelectionRecords(
    applicants: Applicant[],
    selectionResults: SelectionResult[]
  ): Promise<SelectionRecord[]> {
    const records: SelectionRecord[] = [];

    for (let i = 0; i < applicants.length; i++) {
      const applicant = applicants[i];
      const result = selectionResults[i];
      
      if (result) {
        records.push(await this.createSelectionRecord(applicant, result));
      }
    }

    return records;
  }

  /**
   * 단일 SelectionRecord 생성
   */
  private async createSelectionRecord(
    applicant: Applicant,
    selectionResult: SelectionResult
  ): Promise<SelectionRecord> {
    // SNS 데이터 추출
    const snsData: SelectionRecord['snsData'] = {};
    
    if (applicant.snsProfiles) {
      for (const profile of applicant.snsProfiles) {
        switch (profile.platform) {
          case 'blog':
            snsData.naverBlog = {
              url: profile.url,
              visitors: profile.followers // blog의 경우 followers가 실제로는 visitors
            };
            break;
          case 'instagram':
            snsData.instagram = {
              url: profile.url,
              followers: profile.followers,
              handle: profile.handle
            };
            break;
          case 'threads':
            snsData.threads = {
              url: profile.url,
              followers: profile.followers,
              handle: profile.handle
            };
            break;
        }
      }
    }

    return {
      applicantEmail: applicant.email,
      applicantName: applicant.name,
      isSelected: selectionResult.isSelected,
      selectionReason: selectionResult.selectionReason,
      selectionDate: selectionResult.selectionDate,
      meetsCriteria: selectionResult.meetsCriteria,
      qualifyingPlatforms: selectionResult.qualifyingPlatforms,
      snsData,
      processingStatus: 'completed',
      sheetUpdated: false,
      emailSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 구글시트 업데이트 실행
   */
  private async updateGoogleSheet(
    sheetConfig: ApplicantSheet,
    accessToken: string,
    selectionRecords: SelectionRecord[],
    applicants: Applicant[]
  ): Promise<SheetUpdateResult> {
    try {
      const sheetUpdater = new SheetResultUpdater(accessToken);
      
      const updates = selectionRecords.map(record => {
        const applicant = applicants.find(a => a.email === record.applicantEmail);
        return {
          email: record.applicantEmail,
          isSelected: record.isSelected,
          selectionReason: record.selectionReason,
          rowIndex: applicant?.sheetRowIndex || 0
        };
      });

      const result = await sheetUpdater.updateBatchResults({
        sheetId: sheetConfig.sheetId,
        sheetName: sheetConfig.sheetName,
        updates
      }, sheetConfig);

      // 성공한 경우 SelectionRecord의 sheetUpdated 플래그 업데이트
      if (result.success) {
        for (const record of selectionRecords) {
          await SelectionStorage.updateSelectionResult(record.applicantEmail, {
            sheetUpdated: true,
            sheetUpdateDate: new Date().toISOString()
          });
        }
      }

      return result;
    } catch (error) {
      console.error('시트 업데이트 오류:', error);
      return {
        success: false,
        updatedRows: 0,
        errors: [error instanceof Error ? error.message : '시트 업데이트 실패'],
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 프로세스 ID 생성
   */
  private generateProcessId(): string {
    return `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 기본 선정 프로세서 인스턴스
export const defaultSelectionProcessor = new SelectionProcessor();