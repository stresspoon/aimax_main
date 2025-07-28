import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';
import { extractSheetId, isValidGoogleSheetsUrl } from '@/utils/sheetUtils';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const { sheetUrl } = body;

    // URL 유효성 검증
    if (!sheetUrl || typeof sheetUrl !== 'string') {
      return NextResponse.json(
        { error: '구글시트 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!isValidGoogleSheetsUrl(sheetUrl)) {
      return NextResponse.json(
        { error: '올바른 구글시트 URL을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 시트 ID 추출
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return NextResponse.json(
        { error: '구글시트 ID를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // TODO: NextAuth에서 access_token 가져오기 (현재는 임시 구현)
    // 실제로는 session에서 access_token을 가져와야 함
    const accessToken = (session as { accessToken?: string }).accessToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: '구글 인증 토큰이 없습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    // Google Sheets API 클라이언트 설정
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({ version: 'v4', auth });

    // 시트 접근 권한 및 존재 여부 확인
    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const spreadsheet = response.data;
      
      return NextResponse.json({
        success: true,
        message: '구글시트 연동이 완료되었습니다.',
        data: {
          sheetId,
          title: spreadsheet.properties?.title || '제목 없음',
          url: sheetUrl,
          sheets: spreadsheet.sheets?.map(sheet => ({
            id: sheet.properties?.sheetId,
            title: sheet.properties?.title,
          })) || []
        }
      });

    } catch (sheetsError: unknown) {
      console.error('Google Sheets API 오류:', sheetsError);
      const error = sheetsError as { code?: number };

      if (error.code === 403) {
        return NextResponse.json(
          { error: '구글시트에 접근할 권한이 없습니다. 시트 공유 설정을 확인해주세요.' },
          { status: 403 }
        );
      }

      if (error.code === 404) {
        return NextResponse.json(
          { error: '구글시트를 찾을 수 없습니다. URL을 다시 확인해주세요.' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: '구글시트 연동 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('시트 연동 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // TODO: 사용자별 연동된 시트 목록 조회
    // 현재는 임시 응답
    return NextResponse.json({
      success: true,
      data: {
        connectedSheets: []
      }
    });

  } catch (error) {
    console.error('시트 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}