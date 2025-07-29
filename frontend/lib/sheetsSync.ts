/**
 * Google Sheets 데이터 동기화 로직
 */

import { google } from 'googleapis';
import { Applicant, SyncResult, SheetDataRow, ApplicantSheet, SNSProfile } from '@/types/applicant';
import { DatabaseService } from './database';

export class SheetsSync {
  private accessToken: string;
  private sheets: ReturnType<typeof google.sheets>;
  private campaignId: string;

  constructor(accessToken: string, campaignId: string = 'default') {
    this.accessToken = accessToken;
    this.campaignId = campaignId;
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

          // 이메일 검증 - 필수 필드이고 올바른 형식이어야 함
          if (!applicant.email || applicant.email.trim() === '') {
            result.errors.push(`행 ${sheetConfig.headerRow + 1 + i}: 이메일이 없습니다.`);
            continue;
          }

          // 기본적인 이메일 형식 검증
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(applicant.email)) {
            result.errors.push(`행 ${sheetConfig.headerRow + 1 + i}: 올바르지 않은 이메일 형식입니다. (${applicant.email})`);
            continue;
          }

          // 이름도 필수로 체크
          if (!applicant.name || applicant.name.trim() === '') {
            result.errors.push(`행 ${sheetConfig.headerRow + 1 + i}: 이름이 없습니다.`);
            continue;
          }

          const upsertResult = await DatabaseService.upsertApplicant(applicant, this.campaignId);
          
          if (upsertResult.isNew) {
            result.newApplicants++;
          } else {
            result.updatedApplicants++;
          }
        } catch (error) {
          result.errors.push(`행 ${sheetConfig.headerRow + 1 + i}: ${error}`);
        }
      }

      result.success = result.errors.length === 0 || (result.newApplicants + result.updatedApplicants) > 0;

      // 동기화 결과 로그 저장
      await DatabaseService.logSyncResult(result);

      return result;

    } catch (error) {
      result.errors.push(`동기화 오류: ${error}`);
      await DatabaseService.logSyncResult(result);
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
   * Instagram URL에서 핸들 추출
   */
  private extractInstagramHandle(url: string): string {
    if (!url) return '';
    
    // Instagram URL에서 사용자명 추출
    const instagramMatch = url.match(/instagram\.com\/([^\/\?]+)/i);
    if (instagramMatch && instagramMatch[1]) {
      return instagramMatch[1].replace('@', '');
    }
    
    // 이미 핸들 형태라면 그대로 사용
    if (url.startsWith('@')) {
      return url.substring(1);
    }
    
    return url;
  }

  /**
   * URL에서 SNS 플랫폼 식별 및 프로필 생성
   */
  private parseSNSUrl(url: string): SNSProfile | null {
    if (!url || url.trim() === '') return null;
    
    const cleanUrl = url.trim();
    
    // Instagram 감지
    if (cleanUrl.includes('instagram.com') || cleanUrl.includes('@') && !cleanUrl.includes('blog')) {
      const handle = this.extractInstagramHandle(cleanUrl);
      return {
        platform: 'instagram',
        url: cleanUrl.includes('instagram.com') ? cleanUrl : `https://www.instagram.com/${handle}`,
        handle: handle
      };
    }
    
    // 네이버 블로그 감지
    if (cleanUrl.includes('blog.naver.com') || cleanUrl.includes('naver') || cleanUrl.includes('blog')) {
      return {
        platform: 'blog',
        url: cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`
      };
    }
    
    // Threads 감지
    if (cleanUrl.includes('threads.net') || cleanUrl.includes('threads')) {
      return {
        platform: 'threads',
        url: cleanUrl.startsWith('http') ? cleanUrl : `https://www.threads.net/${cleanUrl}`
      };
    }
    
    // 기본적으로 Instagram으로 처리 (기존 호환성)
    const handle = this.extractInstagramHandle(cleanUrl);
    if (handle) {
      return {
        platform: 'instagram',
        url: cleanUrl.includes('instagram.com') ? cleanUrl : `https://www.instagram.com/${handle}`,
        handle: handle
      };
    }
    
    return null;
  }
  
  /**
   * 다중 SNS URL 컬럼들을 파싱하여 SNS 프로필 배열 생성
   */
  private parseSNSProfiles(rowData: SheetDataRow, columnMapping: ApplicantSheet['columnMapping']): SNSProfile[] {
    const profiles: SNSProfile[] = [];
    
    // 기존 instagram 컬럼 처리 (하위 호환성)
    if (columnMapping.instagram) {
      const instagramUrl = String(rowData[columnMapping.instagram] || '').trim();
      if (instagramUrl) {
        const profile = this.parseSNSUrl(instagramUrl);
        if (profile) profiles.push(profile);
      }
    }
    
    // 추가 SNS URL 컬럼들 처리
    if (columnMapping.snsUrls && columnMapping.snsUrls.length > 0) {
      columnMapping.snsUrls.forEach(columnName => {
        const url = String(rowData[columnName] || '').trim();
        if (url) {
          const profile = this.parseSNSUrl(url);
          if (profile) {
            // 중복 URL 체크 (같은 플랫폼의 같은 URL이 있으면 건너뛰기)
            const isDuplicate = profiles.some(p => 
              p.platform === profile.platform && 
              (p.url === profile.url || p.handle === profile.handle)
            );
            if (!isDuplicate) {
              profiles.push(profile);
            }
          }
        }
      });
    }
    
    return profiles;
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
      const value = String(rowData[column] || '').trim();
      return value;
    };

    const getNumberValue = (column: string | undefined): number => {
      if (!column) return 0;
      const value = rowData[column];
      return typeof value === 'number' ? value : parseInt(String(value), 10) || 0;
    };

    const rawEmail = getColumnValue(columnMapping.email);
    const rawName = getColumnValue(columnMapping.name);
    const snsUrl = getColumnValue(columnMapping.instagram);
    
    // 다중 SNS 프로필 파싱
    const snsProfiles = this.parseSNSProfiles(rowData, columnMapping);
    
    // 기존 호환성을 위한 Instagram 정보 추출
    const instagramProfile = snsProfiles.find(p => p.platform === 'instagram');

    const applicant: Applicant = {
      name: rawName,
      email: rawEmail,
      phone: getColumnValue(columnMapping.phone),
      snsProfiles: snsProfiles,
      // 기존 호환성을 위해 유지
      instagramHandle: instagramProfile?.handle || this.extractInstagramHandle(snsUrl),
      followers: instagramProfile?.followers || getNumberValue(columnMapping.followers),
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
    const snsUrls: string[] = [];

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      // 이름 매핑 - "성함", "이름", "name" 등
      if (lowerHeader.includes('성함') || lowerHeader.includes('이름') || lowerHeader.includes('name')) {
        mapping.name = header;
      } 
      // 이메일 매핑 - "메일주소", "이메일", "email" 등
      else if (lowerHeader.includes('메일주소') || lowerHeader.includes('이메일') || lowerHeader.includes('email') || lowerHeader.includes('메일')) {
        mapping.email = header;
      } 
      // 연락처 매핑 - "연락처", "전화", "phone" 등
      else if (lowerHeader.includes('연락처') || lowerHeader.includes('전화') || lowerHeader.includes('phone') || lowerHeader.includes('핸드폰')) {
        mapping.phone = header;
      } 
      // 메인 SNS URL 매핑 - "리뷰 작성할 SNS 계정 URL" 등
      else if (lowerHeader.includes('리뷰') && lowerHeader.includes('sns') && lowerHeader.includes('계정')) {
        mapping.instagram = header;
        snsUrls.push(header);
      }
      // 추가 SNS URL 컬럼들 매핑 - "다른 SNS에도" 등
      else if ((lowerHeader.includes('sns') || lowerHeader.includes('계정') || lowerHeader.includes('url') || lowerHeader.includes('인스타') || lowerHeader.includes('instagram') || lowerHeader.includes('블로그') || lowerHeader.includes('blog') || lowerHeader.includes('스레드') || lowerHeader.includes('threads')) && !snsUrls.includes(header)) {
        snsUrls.push(header);
        // 첫 번째 SNS 컬럼이 아직 설정되지 않았다면 instagram으로 설정
        if (!mapping.instagram) {
          mapping.instagram = header;
        }
      } 
      // 팔로워 수 매핑
      else if (lowerHeader.includes('팔로워') || lowerHeader.includes('followers')) {
        mapping.followers = header;
      } 
      // 신청일/타임스탬프 매핑
      else if (lowerHeader.includes('타임스탬프') || lowerHeader.includes('신청일') || lowerHeader.includes('date') || lowerHeader.includes('날짜') || lowerHeader.includes('timestamp')) {
        mapping.applicationDate = header;
      } 
      // 상태 매핑
      else if (lowerHeader.includes('상태') || lowerHeader.includes('status')) {
        mapping.status = header;
      } 
      // 메모/비고 매핑
      else if (lowerHeader.includes('메모') || lowerHeader.includes('notes') || lowerHeader.includes('비고') || lowerHeader.includes('기타') || lowerHeader.includes('동의')) {
        mapping.notes = header;
      }
    });

    // 다중 SNS URL 컬럼들 설정
    if (snsUrls.length > 0) {
      mapping.snsUrls = snsUrls;
    }

    return mapping;
  }
}