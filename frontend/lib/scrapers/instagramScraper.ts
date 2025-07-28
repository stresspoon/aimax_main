/**
 * Instagram 팔로워 수 스크래핑
 */

import * as cheerio from 'cheerio';
import { ScrapingResult } from '@/types/influence';

export class InstagramScraper {
  private static readonly BASE_URL = 'https://www.instagram.com';
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Instagram 프로필에서 팔로워 수를 스크래핑
   */
  static async scrapeFollowers(username: string): Promise<ScrapingResult> {
    try {
      const url = `${this.BASE_URL}/${username}/`;
      
      console.log(`Instagram 스크래핑 시작: ${url}`);

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

      // Instagram의 메타 태그에서 팔로워 수 추출
      let followers = 0;

      // 방법 1: JSON-LD 스크립트에서 추출
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonData = JSON.parse($(element).html() || '');
          if (jsonData['@type'] === 'Person' && jsonData.interactionStatistic) {
            const followerStat = jsonData.interactionStatistic.find(
              (stat: { '@type': string; interactionType: string; userInteractionCount?: number }) => 
              stat['@type'] === 'InteractionCounter' && 
              stat.interactionType === 'https://schema.org/FollowAction'
            );
            if (followerStat && followerStat.userInteractionCount) {
              followers = parseInt(followerStat.userInteractionCount, 10);
            }
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      });

      // 방법 2: 페이지 내 텍스트에서 팔로워 수 패턴 찾기
      if (followers === 0) {
        const pageText = $.text();
        const followerPatterns = [
          /(\d+(?:,\d+)*)\s*followers?/i,
          /팔로워\s*(\d+(?:,\d+)*)/i,
          /"edge_followed_by":\{"count":(\d+)\}/i
        ];

        for (const pattern of followerPatterns) {
          const match = pageText.match(pattern);
          if (match) {
            followers = parseInt(match[1].replace(/,/g, ''), 10);
            break;
          }
        }
      }

      // 방법 3: meta 태그에서 추출
      if (followers === 0) {
        const description = $('meta[name="description"]').attr('content') || '';
        const followerMatch = description.match(/(\d+(?:,\d+)*)\s*followers?/i);
        if (followerMatch) {
          followers = parseInt(followerMatch[1].replace(/,/g, ''), 10);
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
      console.error('Instagram 스크래핑 오류:', error);
      return {
        success: false,
        error: `스크래핑 중 오류 발생: ${error}`
      };
    }
  }

  /**
   * Instagram URL에서 username 추출
   */
  static extractUsername(url: string): string | null {
    try {
      const patterns = [
        /instagram\.com\/([^\/\?]+)/i,
        /instagram\.com\/p\/([^\/\?]+)/i
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Instagram URL 유효성 검사
   */
  static isValidInstagramUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('instagram.com');
    } catch {
      return false;
    }
  }
}