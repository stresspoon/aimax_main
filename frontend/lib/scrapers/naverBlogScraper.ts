/**
 * 네이버 블로그 방문자 수 스크래핑
 */

import * as cheerio from 'cheerio';
import { ScrapingResult } from '@/types/influence';

export class NaverBlogScraper {
  private static readonly BASE_URL = 'https://blog.naver.com';
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * 네이버 블로그에서 방문자 수를 스크래핑
   */
  static async scrapeVisitors(blogId: string): Promise<ScrapingResult> {
    try {
      const url = `${this.BASE_URL}/${blogId}`;
      
      console.log(`네이버 블로그 스크래핑 시작: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
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

      let visitors = 0;

      // 방법 1: 방문자 수 영역에서 직접 추출
      const visitorElements = [
        'span[data-type="visitor"]',
        '.visitorcnt',
        '.visitor_count',
        '.blog_visitor'
      ];

      for (const selector of visitorElements) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          const numberMatch = text.match(/(\d+(?:,\d+)*)/);
          if (numberMatch) {
            visitors = parseInt(numberMatch[1].replace(/,/g, ''), 10);
            break;
          }
        }
      }

      // 방법 2: 페이지 텍스트에서 방문자 수 패턴 찾기
      if (visitors === 0) {
        const pageText = $.text();
        const visitorPatterns = [
          /Today\s*(\d+(?:,\d+)*)/i,
          /오늘\s*(\d+(?:,\d+)*)/i,
          /방문자\s*(\d+(?:,\d+)*)/i,
          /Total\s*(\d+(?:,\d+)*)/i,
          /전체\s*(\d+(?:,\d+)*)/i
        ];

        for (const pattern of visitorPatterns) {
          const match = pageText.match(pattern);
          if (match) {
            visitors = parseInt(match[1].replace(/,/g, ''), 10);
            break;
          }
        }
      }

      // 방법 3: 스크립트 내 데이터에서 추출
      if (visitors === 0) {
        $('script').each((_, element) => {
          const scriptContent = $(element).html() || '';
          const visitorMatch = scriptContent.match(/visitor["\']?\s*:\s*["\']?(\d+)/i);
          if (visitorMatch) {
            visitors = parseInt(visitorMatch[1], 10);
            return false; // break
          }
        });
      }

      // 방법 4: iframe 내 컨텐츠 확인 (네이버 블로그는 종종 iframe 사용)
      if (visitors === 0) {
        const iframes = $('iframe');
        for (let i = 0; i < iframes.length; i++) {
          const iframeSrc = $(iframes[i]).attr('src');
          if (iframeSrc && iframeSrc.includes('blog.naver.com')) {
            try {
              const iframeResponse = await fetch(iframeSrc, {
                headers: { 'User-Agent': this.USER_AGENT }
              });
              if (iframeResponse.ok) {
                const iframeHtml = await iframeResponse.text();
                const $iframe = cheerio.load(iframeHtml);
                const iframeText = $iframe.text();
                
                const visitorMatch = iframeText.match(/Today\s*(\d+(?:,\d+)*)|오늘\s*(\d+(?:,\d+)*)/i);
                if (visitorMatch) {
                  visitors = parseInt((visitorMatch[1] || visitorMatch[2]).replace(/,/g, ''), 10);
                  break;
                }
              }
            } catch (iframeError) {
              console.warn('iframe 스크래핑 실패:', iframeError);
            }
          }
        }
      }

      if (visitors > 0) {
        return {
          success: true,
          data: {
            visitors,
            username: blogId
          }
        };
      } else {
        return {
          success: false,
          error: '방문자 수를 찾을 수 없습니다. 블로그가 비공개이거나 존재하지 않을 수 있습니다.'
        };
      }

    } catch (error) {
      console.error('네이버 블로그 스크래핑 오류:', error);
      return {
        success: false,
        error: `스크래핑 중 오류 발생: ${error}`
      };
    }
  }

  /**
   * 네이버 블로그 URL에서 블로그 ID 추출
   */
  static extractBlogId(url: string): string | null {
    try {
      const patterns = [
        /blog\.naver\.com\/([^\/\?]+)/i,
        /m\.blog\.naver\.com\/([^\/\?]+)/i
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
   * 네이버 블로그 URL 유효성 검사
   */
  static isValidNaverBlogUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('blog.naver.com');
    } catch {
      return false;
    }
  }
}