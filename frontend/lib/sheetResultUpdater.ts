/**
 * 구글시트에 선정/비선정 결과 업데이트 서비스
 */

import { google } from 'googleapis';
import { SelectionRecord } from '@/types/selection';
import { ApplicantSheet } from '@/types/applicant';

export interface SheetUpdateResult {
  success: boolean;
  updatedRows: number;
  errors: string[];
  updatedAt: string;
}

export interface SheetUpdateBatch {
  sheetId: string;
  sheetName: string;
  updates: {
    email: string;
    isSelected: boolean;
    selectionReason: string;
    rowIndex: number;
  }[];
}

export class SheetResultUpdater {
  private accessToken: string;
  private sheets: ReturnType<typeof google.sheets>;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * 단일 선정 결과를 구글시트에 업데이트
   */
  async updateSelectionResult(
    sheetConfig: ApplicantSheet,
    selectionRecord: SelectionRecord,
    applicantRowIndex: number
  ): Promise<SheetUpdateResult> {
    try {
      const updates = [{
        email: selectionRecord.applicantEmail,
        isSelected: selectionRecord.isSelected,
        selectionReason: selectionRecord.selectionReason,
        rowIndex: applicantRowIndex
      }];

      const batchUpdate: SheetUpdateBatch = {
        sheetId: sheetConfig.sheetId,
        sheetName: sheetConfig.sheetName,
        updates
      };

      return await this.updateBatchResults(batchUpdate, sheetConfig);
    } catch (error) {
      console.error('단일 결과 업데이트 오류:', error);
      return {
        success: false,
        updatedRows: 0,
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 여러 선정 결과를 구글시트에 배치 업데이트
   */
  async updateBatchResults(
    batch: SheetUpdateBatch,
    sheetConfig: ApplicantSheet
  ): Promise<SheetUpdateResult> {
    const errors: string[] = [];
    let updatedRows = 0;

    try {
      // 선정/비선정 결과 컬럼과 사유 컬럼 확인
      const headers = await this.getSheetHeaders(batch.sheetId, batch.sheetName);
      const resultColumnIndex = this.findResultColumn(headers);
      const reasonColumnIndex = this.findReasonColumn(headers);
      
      // sheetConfig 사용 (warning 제거)
      console.log(`Updating sheet: ${sheetConfig.sheetName}`);

      if (resultColumnIndex === -1) {
        // 결과 컬럼이 없으면 새로 추가
        await this.addResultColumns(batch.sheetId, batch.sheetName, headers.length);
      }

      // 배치 업데이트 요청 준비
      const batchUpdateRequests = [];

      for (const update of batch.updates) {
        try {
          // 선정/비선정 결과 업데이트
          const resultColumnLetter = this.numberToColumnLetter(
            resultColumnIndex === -1 ? headers.length + 1 : resultColumnIndex + 1
          );
          const reasonColumnLetter = this.numberToColumnLetter(
            reasonColumnIndex === -1 ? headers.length + 2 : reasonColumnIndex + 1
          );

          const resultValue = update.isSelected ? '선정' : '비선정';
          
          batchUpdateRequests.push({
            range: `${batch.sheetName}!${resultColumnLetter}${update.rowIndex}`,
            values: [[resultValue]]
          });

          batchUpdateRequests.push({
            range: `${batch.sheetName}!${reasonColumnLetter}${update.rowIndex}`,
            values: [[update.selectionReason]]
          });

          updatedRows++;
        } catch (error) {
          const errorMessage = `${update.email}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
          errors.push(errorMessage);
          console.error('개별 업데이트 오류:', errorMessage);
        }
      }

      // 배치 업데이트 실행
      if (batchUpdateRequests.length > 0) {
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: batch.sheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: batchUpdateRequests
          }
        });
      }

      return {
        success: errors.length === 0,
        updatedRows,
        errors,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('배치 업데이트 오류:', error);
      return {
        success: false,
        updatedRows: 0,
        errors: [error instanceof Error ? error.message : '구글시트 업데이트 실패'],
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 시트 헤더 정보 조회
   */
  private async getSheetHeaders(sheetId: string, sheetName: string): Promise<string[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!1:1`
      });

      return response.data.values?.[0] || [];
    } catch (error) {
      console.error('헤더 조회 오류:', error);
      return [];
    }
  }

  /**
   * 선정 결과 컬럼 찾기
   */
  private findResultColumn(headers: string[]): number {
    const possibleNames = ['선정결과', '선정_결과', '결과', '선정여부', '선정', 'result', 'selection_result'];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * 선정 사유 컬럼 찾기
   */
  private findReasonColumn(headers: string[]): number {
    const possibleNames = ['선정사유', '선정_사유', '사유', '이유', 'reason', 'selection_reason'];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * 결과 컬럼이 없을 때 새로 추가
   */
  private async addResultColumns(sheetId: string, sheetName: string, startColumnIndex: number): Promise<void> {
    try {
      // 헤더 행에 새 컬럼 추가
      const resultColumnLetter = this.numberToColumnLetter(startColumnIndex + 1);
      const reasonColumnLetter = this.numberToColumnLetter(startColumnIndex + 2);

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `${sheetName}!${resultColumnLetter}1`,
              values: [['선정결과']]
            },
            {
              range: `${sheetName}!${reasonColumnLetter}1`,
              values: [['선정사유']]
            }
          ]
        }
      });
    } catch (error) {
      console.error('컬럼 추가 오류:', error);
      throw new Error('결과 컬럼 추가에 실패했습니다.');
    }
  }

  /**
   * 숫자를 구글시트 컬럼 문자로 변환 (1 -> A, 2 -> B, ...)
   */
  private numberToColumnLetter(num: number): string {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }

  /**
   * 선정 결과 통계를 시트에 추가 (선택사항)
   */
  async addSelectionSummary(
    sheetId: string,
    sheetName: string,
    totalApplicants: number,
    selectedCount: number,
    rejectedCount: number
  ): Promise<SheetUpdateResult> {
    try {
      // 시트 끝에 통계 정보 추가
      const summaryData = [
        ['', ''], // 빈 줄
        ['=== 선정 결과 요약 ===', ''],
        ['총 신청자', totalApplicants],
        ['선정자', selectedCount],
        ['비선정자', rejectedCount],
        ['선정률', `${((selectedCount / totalApplicants) * 100).toFixed(1)}%`],
        ['업데이트 일시', new Date().toLocaleString('ko-KR')]
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:B`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: summaryData
        }
      });

      return {
        success: true,
        updatedRows: summaryData.length,
        errors: [],
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('통계 추가 오류:', error);
      return {
        success: false,
        updatedRows: 0,
        errors: [error instanceof Error ? error.message : '통계 추가 실패'],
        updatedAt: new Date().toISOString()
      };
    }
  }
}