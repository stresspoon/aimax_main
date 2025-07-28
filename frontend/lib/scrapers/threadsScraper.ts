/**
 * Threads 팔로워 수 스크래핑
 */

import * as cheerio from 'cheerio';
import { ScrapingResult } from '@/types/influence';

export class ThreadsScraper {
  private static readonly BASE_URL = 'https://www.threads.net';
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Threads 프로필에서 팔로워 수를 스크래핑
   */
  static async scrapeFollowers(username: string): Promise<ScrapingResult> {
    try {
      const url = `${this.BASE_URL}/@${username}`;
      
      console.log(`Threads 스크래핑 시작: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      let followers = 0;

      // 방법 1: 페이지 내 텍스트에서 팔로워 수 패턴 찾기
      const pageText = $.text();
      const followerPatterns = [
        /(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*followers?/i,
        /팔로워\s*(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)/i,
        /(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*명이\s*팔로우/i
      ];

      for (const pattern of followerPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          followers = this.parseFollowerCount(match[1]);
          break;
        }
      }

      // 방법 2: JSON 데이터에서 추출
      if (followers === 0) {
        $('script').each((_, element) => {
          const scriptContent = $(element).html() || '';
          
          // Threads는 종종 JSON 형태로 데이터를 저장
          const jsonMatches = [
            /"follower_count":(\d+)/i,
            /"followers_count":(\d+)/i,
            /"edge_followed_by":\{"count":(\d+)\}/i
          ];

          for (const jsonPattern of jsonMatches) {
            const match = scriptContent.match(jsonPattern);
            if (match) {
              followers = parseInt(match[1], 10);
              return false; // break
            }
          }
        });
      }

      // 방법 3: meta 태그에서 추출
      if (followers === 0) {
        const description = $('meta[name="description"]').attr('content') || '';
        const followerMatch = description.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*followers?/i);
        if (followerMatch) {
          followers = this.parseFollowerCount(followerMatch[1]);
        }
      }

      // 방법 4: 특정 CSS 선택자로 팔로워 수 찾기
      if (followers === 0) {
        const followerSelectors = [
          '[data-testid="follower-count"]',
          '.follower-count',
          '.followers-count',
          '[aria-label*="followers"]'
        ];

        for (const selector of followerSelectors) {
          const element = $(selector);
          if (element.length > 0) {
            const text = element.text().trim();
            const numberMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)/);
            if (numberMatch) {
              followers = this.parseFollowerCount(numberMatch[1]);
              break;
            }
          }
        }
      }

      if (followers > 0) {
        return {
          success: true,
          data: {
            followers,
            username
          }
        };
      } else {
        return {
          success: false,
          error: '팔로워 수를 찾을 수 없습니다. 프로필이 비공개이거나 존재하지 않을 수 있습니다.'
        };
      }

    } catch (error) {
      console.error('Threads 스크래핑 오류:', error);
      return {
        success: false,
        error: `스크래핑 중 오류 발생: ${error}`
      };
    }
  }

  /**
   * 팔로워 수 문자열을 숫자로 변환 (K, M 단위 처리)
   */
  private static parseFollowerCount(countStr: string): number {
    const cleanStr = countStr.replace(/,/g, '').toLowerCase();
    
    if (cleanStr.includes('k')) {
      return Math.round(parseFloat(cleanStr.replace('k', '')) * 1000);
    } else if (cleanStr.includes('m')) {
      return Math.round(parseFloat(cleanStr.replace('m', '')) * 1000000);
    } else if (cleanStr.includes('b')) {
      return Math.round(parseFloat(cleanStr.replace('b', '')) * 1000000000);
    } else {
      return parseInt(cleanStr, 10) || 0;
    }
  }

  /**
   * Threads URL에서 username 추출
   */
  static extractUsername(url: string): string | null {
    try {
      const patterns = [
        /threads\.net\/@([^\/\?]+)/i,
        /threads\.net\/([^\/\?@]+)/i
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1].replace('@', '');
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Threads URL 유효성 검사
   */
  static isValidThreadsUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('threads.net');
    } catch {
      return false;
    }
  }
}