/**
 * 선정/비선정 결과 저장소
 * 현재는 메모리 기반이지만 향후 PostgreSQL로 교체 예정
 */

import { SelectionRecord, SelectionBatchProcess, SelectionStats, SelectionFilter } from '@/types/selection';

// 메모리 저장소
let selectionsMemory: SelectionRecord[] = [];
let batchProcessesMemory: SelectionBatchProcess[] = [];

export class SelectionStorage {
  /**
   * 선정 결과 저장
   */
  static async saveSelectionResult(record: SelectionRecord): Promise<{ success: boolean; record: SelectionRecord }> {
    try {
      const now = new Date().toISOString();
      const newRecord: SelectionRecord = {
        ...record,
        id: record.id || this.generateId(),
        createdAt: record.createdAt || now,
        updatedAt: now
      };

      // 기존 레코드가 있으면 업데이트, 없으면 새로 추가
      const existingIndex = selectionsMemory.findIndex(r => r.applicantEmail === record.applicantEmail);
      
      if (existingIndex >= 0) {
        selectionsMemory[existingIndex] = { ...selectionsMemory[existingIndex], ...newRecord };
        return { success: true, record: selectionsMemory[existingIndex] };
      } else {
        selectionsMemory.push(newRecord);
        return { success: true, record: newRecord };
      }
    } catch (error) {
      console.error('선정 결과 저장 오류:', error);
      throw new Error('선정 결과 저장에 실패했습니다.');
    }
  }

  /**
   * 여러 선정 결과를 배치로 저장
   */
  static async saveBatchSelectionResults(records: SelectionRecord[]): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let savedCount = 0;

    for (const record of records) {
      try {
        await this.saveSelectionResult(record);
        savedCount++;
      } catch (error) {
        const errorMessage = `${record.applicantEmail}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
        errors.push(errorMessage);
        console.error('배치 저장 오류:', errorMessage);
      }
    }

    return {
      success: errors.length === 0,
      savedCount,
      errors
    };
  }

  /**
   * 선정 결과 조회 (이메일 기준)
   */
  static async getSelectionResult(applicantEmail: string): Promise<SelectionRecord | null> {
    return selectionsMemory.find(r => r.applicantEmail === applicantEmail) || null;
  }

  /**
   * 모든 선정 결과 조회 (필터링 지원)
   */
  static async getSelectionResults(filter?: SelectionFilter): Promise<SelectionRecord[]> {
    let results = [...selectionsMemory];

    if (filter) {
      if (filter.isSelected !== undefined) {
        results = results.filter(r => r.isSelected === filter.isSelected);
      }

      if (filter.campaignId) {
        results = results.filter(r => r.campaignId === filter.campaignId);
      }

      if (filter.processingStatus) {
        results = results.filter(r => r.processingStatus === filter.processingStatus);
      }

      if (filter.platform) {
        results = results.filter(r => r.meetsCriteria[filter.platform!]);
      }

      if (filter.dateRange) {
        const startDate = new Date(filter.dateRange.startDate);
        const endDate = new Date(filter.dateRange.endDate);
        results = results.filter(r => {
          const recordDate = new Date(r.selectionDate);
          return recordDate >= startDate && recordDate <= endDate;
        });
      }
    }

    // 최신 순으로 정렬
    return results.sort((a, b) => new Date(b.selectionDate).getTime() - new Date(a.selectionDate).getTime());
  }

  /**
   * 선정 결과 업데이트
   */
  static async updateSelectionResult(
    applicantEmail: string, 
    updates: Partial<SelectionRecord>
  ): Promise<{ success: boolean; record?: SelectionRecord }> {
    try {
      const index = selectionsMemory.findIndex(r => r.applicantEmail === applicantEmail);
      
      if (index === -1) {
        return { success: false };
      }

      selectionsMemory[index] = {
        ...selectionsMemory[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      return { success: true, record: selectionsMemory[index] };
    } catch (error) {
      console.error('선정 결과 업데이트 오류:', error);
      throw new Error('선정 결과 업데이트에 실패했습니다.');
    }
  }

  /**
   * 배치 프로세스 저장
   */
  static async saveBatchProcess(process: SelectionBatchProcess): Promise<SelectionBatchProcess> {
    const existingIndex = batchProcessesMemory.findIndex(p => p.id === process.id);
    
    if (existingIndex >= 0) {
      batchProcessesMemory[existingIndex] = process;
      return batchProcessesMemory[existingIndex];
    } else {
      batchProcessesMemory.push(process);
      return process;
    }
  }

  /**
   * 배치 프로세스 조회
   */
  static async getBatchProcess(processId: string): Promise<SelectionBatchProcess | null> {
    return batchProcessesMemory.find(p => p.id === processId) || null;
  }

  /**
   * 선정 통계 생성
   */
  static async getSelectionStats(filter?: SelectionFilter): Promise<SelectionStats> {
    const records = await this.getSelectionResults(filter);
    
    const totalProcessed = records.length;
    const selectedCount = records.filter(r => r.isSelected).length;
    const rejectedCount = totalProcessed - selectedCount;
    const selectionRate = totalProcessed > 0 ? (selectedCount / totalProcessed) * 100 : 0;

    // 플랫폼별 통계 계산
    const naverBlogQualified = records.filter(r => r.meetsCriteria.naverBlog);
    const instagramQualified = records.filter(r => r.meetsCriteria.instagram);
    const threadsQualified = records.filter(r => r.meetsCriteria.threads);

    const calculateAverageVisitors = (records: SelectionRecord[]): number => {
      const validRecords = records.filter(r => r.snsData.naverBlog?.visitors);
      if (validRecords.length === 0) return 0;
      return validRecords.reduce((sum, r) => sum + (r.snsData.naverBlog?.visitors || 0), 0) / validRecords.length;
    };

    const calculateAverageFollowers = (records: SelectionRecord[], platform: 'instagram' | 'threads'): number => {
      const validRecords = records.filter(r => r.snsData[platform]?.followers);
      if (validRecords.length === 0) return 0;
      return validRecords.reduce((sum, r) => sum + (r.snsData[platform]?.followers || 0), 0) / validRecords.length;
    };

    return {
      totalProcessed,
      selectedCount,
      rejectedCount,
      selectionRate,
      platformStats: {
        naverBlog: {
          qualified: naverBlogQualified.length,
          averageVisitors: calculateAverageVisitors(naverBlogQualified)
        },
        instagram: {
          qualified: instagramQualified.length,
          averageFollowers: calculateAverageFollowers(instagramQualified, 'instagram')
        },
        threads: {
          qualified: threadsQualified.length,
          averageFollowers: calculateAverageFollowers(threadsQualified, 'threads')
        }
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 선정 결과 삭제
   */
  static async deleteSelectionResult(applicantEmail: string): Promise<{ success: boolean }> {
    try {
      const index = selectionsMemory.findIndex(r => r.applicantEmail === applicantEmail);
      
      if (index === -1) {
        return { success: false };
      }

      selectionsMemory.splice(index, 1);
      return { success: true };
    } catch (error) {
      console.error('선정 결과 삭제 오류:', error);
      throw new Error('선정 결과 삭제에 실패했습니다.');
    }
  }

  /**
   * 모든 선정 결과 삭제 (테스트용)
   */
  static async clearAllSelectionResults(): Promise<{ success: boolean }> {
    try {
      selectionsMemory = [];
      batchProcessesMemory = [];
      return { success: true };
    } catch (error) {
      console.error('선정 결과 전체 삭제 오류:', error);
      throw new Error('선정 결과 전체 삭제에 실패했습니다.');
    }
  }

  /**
   * 고유 ID 생성
   */
  private static generateId(): string {
    return `sel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default SelectionStorage;