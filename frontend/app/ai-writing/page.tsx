'use client';

import Link from 'next/link';

export default function AIWriting() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← 대시보드로 돌아가기
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">
            ✍️ SEO 기반 글쓰기
          </h1>
          <p className="text-text/70 text-lg">
            AI가 키워드를 분석해 SEO 최적화된 블로그 글을 자동으로 생성합니다
          </p>
        </header>

        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-semibold text-text mb-2">
              AI 글쓰기 기능 개발 중
            </h2>
            <p className="text-text/70 mb-6">
              곧 멋진 AI 글쓰기 기능을 만나보실 수 있습니다.
            </p>
            <Link 
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}