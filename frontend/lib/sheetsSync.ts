/**
 * Google Sheets 데이터 동기화 로직
 */

import { google } from 'googleapis';
import { Applicant, SyncResult, SheetDataRow, ApplicantSheet } from '@/types/applicant';
import { ApplicantStorage } from './applicantStorage';

export class SheetsSync {
  private accessToken: string;
  private sheets: ReturnType<typeof google.sheets>;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * 구글시트에서 신청자 데이터를 읽어와 로컬 DB와 동기화
   */
  async syncApplicants(sheetConfig: ApplicantSheet): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      newApplicants: 0,
      updatedApplicants: 0,
      errors: [],
      lastSyncTime: new Date().toISOString()
    };

    try {
      // 시트 데이터 읽기
      const sheetData = await this.readSheetData(
        sheetConfig.sheetId, 
        sheetConfig.sheetName,
        sheetConfig.headerRow
      );

      if (!sheetData || sheetData.length === 0) {
        result.errors.push('시트에서 데이터를 찾을 수 없습니다.');
        return result;
      }

      // 각 행을 신청자 객체로 변환하고 저장
      for (let i = 0; i < sheetData.length; i++) {
        try {
          const applicant = this.mapRowToApplicant(
            sheetData[i], 
            sheetConfig.columnMapping,
            sheetConfig.headerRow + 1 + i // 실제 행 번호
          );

          if (applicant.email) {
            const upsertResult = await ApplicantStorage.upsertApplicant(applicant);
            
            if (upsertResult.isNew) {
              result.newApplicants++;
            } else {
              result.updatedApplicants++;
            }
          } else {
            result.errors.push(`행 ${sheetConfig.headerRow + 1 + i}: 이메일이 없습니다.`);
          }
        } catch (error) {
          result.errors.push(`행 ${sheetConfig.headerRow + 1 + i}: ${error}`);
        }
      }

      result.success = result.errors.length === 0 || (result.newApplicants + result.updatedApplicants) > 0;

      // 동기화 결과 로그 저장
      await ApplicantStorage.logSyncResult(result);

      return result;

    } catch (error) {
      result.errors.push(`동기화 오류: ${error}`);
      await ApplicantStorage.logSyncResult(result);
      return result;
    }
  }

  /**
   * Google Sheets API로 시트 데이터 읽기
   */
  private async readSheetData(
    sheetId: string, 
    sheetName: string, 
    startRow: number = 1
  ): Promise<SheetDataRow[]> {
    try {
      const range = `${sheetName}!A${startRow}:Z1000`; // 최대 1000행까지 읽기
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return [];
      }

      // 첫 번째 행을 헤더로 사용
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // 각 데이터 행을 객체로 변환
      return dataRows.map(row => {
        const rowData: SheetDataRow = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });
        return rowData;
      });

    } catch (error) {
      console.error('시트 데이터 읽기 오류:', error);
      throw error;
    }
  }

  /**
   * 시트 행 데이터를 신청자 객체로 변환
   */
  private mapRowToApplicant(
    rowData: SheetDataRow, 
    columnMapping: ApplicantSheet['columnMapping'],
    rowIndex: number
  ): Applicant {
    const getColumnValue = (column: string | undefined): string => {
      if (!column) return '';
      return String(rowData[column] || '');
    };

    const getNumberValue = (column: string | undefined): number => {
      if (!column) return 0;
      const value = rowData[column];
      return typeof value === 'number' ? value : parseInt(String(value), 10) || 0;
    };

    const applicant: Applicant = {
      name: getColumnValue(columnMapping.name),
      email: getColumnValue(columnMapping.email),
      phone: getColumnValue(columnMapping.phone),
      instagramHandle: getColumnValue(columnMapping.instagram),
      followers: getNumberValue(columnMapping.followers),
      applicationDate: getColumnValue(columnMapping.applicationDate) || new Date().toISOString(),
      status: this.mapStatus(getColumnValue(columnMapping.status)),
      notes: getColumnValue(columnMapping.notes),
      sheetRowIndex: rowIndex,
      lastUpdated: new Date().toISOString()
    };

    return applicant;
  }

  /**
   * 시트의 상태 값을 표준 상태로 매핑
   */
  private mapStatus(sheetStatus: string): 'pending' | 'approved' | 'rejected' {
    const status = sheetStatus.toLowerCase().trim();
    
    if (status.includes('승인') || status.includes('approved') || status.includes('선정')) {
      return 'approved';
    } else if (status.includes('거부') || status.includes('rejected') || status.includes('탈락')) {
      return 'rejected';
    } else {
      return 'pending';
    }
  }

  /**
   * 특정 시트의 구조 분석 (컬럼 매핑 도움)
   */
  async analyzeSheetStructure(sheetId: string, sheetName: string): Promise<{
    headers: string[];
    sampleData: SheetDataRow[];
    suggestedMapping: Partial<ApplicantSheet['columnMapping']>;
  }> {
    try {
      const range = `${sheetName}!A1:Z10`; // 처음 10행만 분석
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('시트에 데이터가 없습니다.');
      }

      const headers = rows[0];
      const sampleRows = rows.slice(1, 4); // 샘플 데이터 3행

      const sampleData: SheetDataRow[] = sampleRows.map(row => {
        const rowData: SheetDataRow = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });
        return rowData;
      });

      // 컬럼명을 기반으로 매핑 제안
      const suggestedMapping = this.suggestColumnMapping(headers);

      return {
        headers,
        sampleData,
        suggestedMapping
      };

    } catch (error) {
      console.error('시트 구조 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 컬럼명을 기반으로 매핑 자동 제안
   */
  private suggestColumnMapping(headers: string[]): Partial<ApplicantSheet['columnMapping']> {
    const mapping: Partial<ApplicantSheet['columnMapping']> = {};

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('이름') || lowerHeader.includes('name')) {
        mapping.name = header;
      } else if (lowerHeader.includes('이메일') || lowerHeader.includes('email')) {
        mapping.email = header;
      } else if (lowerHeader.includes('전화') || lowerHeader.includes('phone') || lowerHeader.includes('연락처')) {
        mapping.phone = header;
      } else if (lowerHeader.includes('인스타') || lowerHeader.includes('instagram')) {
        mapping.instagram = header;
      } else if (lowerHeader.includes('팔로워') || lowerHeader.includes('followers')) {
        mapping.followers = header;
      } else if (lowerHeader.includes('신청일') || lowerHeader.includes('date') || lowerHeader.includes('날짜')) {
        mapping.applicationDate = header;
      } else if (lowerHeader.includes('상태') || lowerHeader.includes('status')) {
        mapping.status = header;
      } else if (lowerHeader.includes('메모') || lowerHeader.includes('notes') || lowerHeader.includes('비고')) {
        mapping.notes = header;
      }
    });

    return mapping;
  }
}