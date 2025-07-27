'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginButton } from '../../components/auth/LoginButton';

export default function Dashboard() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', description: '' });

  const features = [
    {
      id: 'seo-writing',
      title: 'SEO 기반 글쓰기',
      description: 'AI가 키워드를 분석해 SEO 최적화된 블로그 글을 자동으로 생성합니다',
      icon: '',
      isActive: true,
      href: '/ai-writing'
    },
    {
      id: 'sns-content',
      title: 'SNS 콘텐츠 기획',
      description: '30일 캘린더와 게시물별 카피, 해시태그를 자동 생성합니다',
      icon: '',
      isActive: false,
      href: '/sns-content'
    },
    {
      id: 'product-page',
      title: '상세페이지 기획',
      description: '제품 특징을 분석해 매력적인 상세페이지 요소를 생성합니다',
      icon: '',
      isActive: false,
      href: '/product-page'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Home button */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-text/70 hover:text-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>홈으로 돌아가기</span>
          </Link>
        </div>
        
        <header className="mb-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-text mb-4 tracking-tight">
                AIMAX 대시보드
              </h1>
              <p className="text-text text-xl font-light">
                AI로 마케팅 콘텐츠를 쉽고 빠르게 제작하세요
              </p>
            </div>
            <div className="hidden md:block">
              <LoginButton />
            </div>
          </div>
          <div className="md:hidden flex justify-center">
            <LoginButton />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`
                relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100
                transition-all duration-300 hover:shadow-xl cursor-pointer hover:transform hover:scale-[1.02]
                ${feature.isActive 
                  ? 'hover:border-text/20 ring-2 ring-text/5' 
                  : 'opacity-60 hover:opacity-80'
                }
              `}
              role="button"
              tabIndex={0}
              aria-label={`${feature.title} - ${feature.isActive ? '사용 가능' : '개발 중'}`}
              onClick={() => {
                if (feature.isActive) {
                  router.push(feature.href);
                } else {
                  setModalContent({
                    title: feature.title,
                    description: feature.description
                  });
                  setShowModal(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (feature.isActive) {
                    router.push(feature.href);
                  } else {
                    setModalContent({
                      title: feature.title,
                      description: feature.description
                    });
                    setShowModal(true);
                  }
                }
              }}
            >
              {!feature.isActive && (
                <div className="absolute top-4 right-4">
                  <span className="bg-white text-text text-xs px-2 py-1 rounded-full border border-text/30">
                    개발 중
                  </span>
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                <div className="w-16 h-16 bg-text/10 rounded-2xl flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-text/20 rounded-lg"></div>
                </div>
                <h2 className="text-xl font-bold text-text mb-3 text-center">
                  {feature.title}
                </h2>
                <p className="text-text text-sm leading-relaxed text-center mb-6">
                  {feature.description}
                </p>
              </div>
              
              {feature.isActive && (
                <div className="mt-auto pt-4">
                  <div className="bg-text text-white text-sm font-semibold py-2 px-4 rounded-lg text-center">
                    시작하기
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-md mx-auto">
            <div className="w-12 h-12 bg-text/10 rounded-xl mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-text mb-2">더 많은 기능들</h3>
            <p className="text-text text-sm">
              더 많은 AI 기능이 곧 출시됩니다
            </p>
          </div>
        </div>
      </div>

      {/* 준비 중 모달 */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-text/10 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <div className="w-10 h-10 bg-text/20 rounded-xl"></div>
              </div>
              <h2 id="modal-title" className="text-2xl font-bold text-text mb-3">
                {modalContent.title}
              </h2>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <p className="text-orange-800 font-semibold text-sm mb-1">
                  현재 개발 중입니다
                </p>
                <p className="text-orange-700 text-xs">
                  빠른 시일 내에 이용 가능할 예정입니다
                </p>
              </div>
              <p className="text-text text-sm mb-8 leading-relaxed">
                {modalContent.description}
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-text text-white py-3 px-6 rounded-xl font-semibold hover:bg-text/90 transition-all duration-200"
                autoFocus
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}