import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/initDatabase';

export async function POST() {
  try {
    console.log('데이터베이스 초기화 API 호출됨');
    
    const result = await initializeDatabase();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('데이터베이스 초기화 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '데이터베이스 초기화를 위해서는 POST 요청을 사용하세요.',
    endpoint: '/api/init-db',
    method: 'POST'
  });
}