'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', description: '' });

  const features = [
    {
      id: 'seo-writing',
      title: 'SEO 기반 글쓰기',
      description: 'AI가 키워드를 분석해 SEO 최적화된 블로그 글을 자동으로 생성합니다',
      icon: '✍️',
      isActive: true,
      href: '/ai-writing'
    },
    {
      id: 'sns-content',
      title: 'SNS 콘텐츠 기획',
      description: '30일 캘린더와 게시물별 카피, 해시태그를 자동 생성합니다',
      icon: '📱',
      isActive: false,
      href: '/sns-content'
    },
    {
      id: 'product-page',
      title: '상세페이지 기획',
      description: '제품 특징을 분석해 매력적인 상세페이지 요소를 생성합니다',
      icon: '🛍️',
      isActive: false,
      href: '/product-page'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">
            AIMAX 대시보드
          </h1>
          <p className="text-text/70 text-lg">
            AI로 마케팅 콘텐츠를 쉽고 빠르게 제작하세요
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`
                relative bg-white rounded-lg p-6 shadow-sm border border-gray-200
                transition-all duration-200 hover:shadow-md cursor-pointer
                ${feature.isActive 
                  ? 'hover:border-blue-300' 
                  : 'opacity-75'
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
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    개발 중
                  </span>
                </div>
              )}
              
              <div className="text-4xl mb-4" aria-hidden="true">
                {feature.icon}
              </div>
              
              <h2 className="text-xl font-semibold text-text mb-2">
                {feature.title}
              </h2>
              
              <p className="text-text/70 text-sm leading-relaxed">
                {feature.description}
              </p>
              
              {feature.isActive && (
                <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                  시작하기
                  <span className="ml-1" aria-hidden="true">→</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-text/50 text-sm">
            더 많은 기능이 곧 출시됩니다
          </p>
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
            className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🚧</div>
              <h2 id="modal-title" className="text-2xl font-semibold text-text mb-2">
                {modalContent.title}
              </h2>
              <p className="text-text/70 mb-2">
                준비 중입니다
              </p>
              <p className="text-text/60 text-sm mb-6">
                {modalContent.description}
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
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