import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-text">
          AIMAX
        </h1>
        <p className="text-xl text-text/80 mb-8">
          나만의 AI 비지니스 파트너
        </p>
        <div className="bg-white/50 rounded-lg p-8 backdrop-blur-sm">
          <p className="text-text/70 mb-6">
            생성형 AI를 활용한 마케팅 콘텐츠 자동화 플랫폼
          </p>
          <Link 
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            대시보드로 이동
          </Link>
        </div>
      </main>
    </div>
  );
}
