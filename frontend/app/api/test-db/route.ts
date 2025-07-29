import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

/**
 * 데이터베이스 연결 테스트 API
 */
export async function GET() {
  try {
    // 데이터베이스 연결 확인
    const isConnected = await DatabaseService.checkConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        message: '데이터베이스 연결 실패',
        error: 'Connection failed'
      }, { status: 500 });
    }

    // 통계 조회로 기본 동작 확인
    const stats = await DatabaseService.getStats();

    return NextResponse.json({
      success: true,
      message: '데이터베이스 연결 성공',
      data: {
        connected: true,
        stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('데이터베이스 테스트 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '데이터베이스 테스트 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

/**
 * 개발용 데이터 초기화 API (개발 환경에서만 사용)
 */
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      success: false,
      message: '프로덕션 환경에서는 사용할 수 없습니다.'
    }, { status: 403 });
  }

  try {
    await DatabaseService.clearAll();
    
    return NextResponse.json({
      success: true,
      message: '모든 데이터가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('데이터 삭제 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '데이터 삭제 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}