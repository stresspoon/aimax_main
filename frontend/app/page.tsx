'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { LoginButton } from '../components/auth/LoginButton';

export default function Home() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-text">AIMAX</span>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">BETA</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <div className="bg-white rounded-lg p-1 border border-gray-200">
                <LoginButton />
              </div>
            </div>
            <div className="md:hidden">
              <LoginButton />
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background decoration inspired by landingpage design */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-text/5"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-text/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-text/5 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-block bg-white px-4 py-2 rounded-full border border-gray-200 mb-6">
              <span className="text-text/70 text-sm">✨ 지금 베타 무료 체험 중</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-text mb-6 tracking-tight leading-tight">
            글 하나로 시작된<br />
            <span className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-transparent">자동화</span>
          </h1>
          <p className="text-2xl md:text-3xl text-text mb-4 font-semibold">
            AIMAX는 팔리는 루틴을 만듭니다
          </p>
          <p className="text-lg md:text-xl text-text/70 mb-12 leading-relaxed max-w-3xl mx-auto">
            지금 블로그 글쓰기부터, 곧 체험단까지.<br />
            비즈니스를 위한 자동화 SaaS, AIMAX
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              href="/dashboard"
              className="bg-text text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-text/90 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-text"
              style={{ backgroundColor: '#131313' }}
            >
              지금 무료로 글 써보기 →
            </Link>
            <div className="flex items-center space-x-2 text-sm text-text/70">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>무료 체험 • 즉시 사용 가능</span>
            </div>
          </div>
          
          {/* Hero Image with AIMAX Dashboard Preview */}
          <div className="relative w-full max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-text/20 via-transparent to-text/20 rounded-3xl blur-2xl"></div>
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
              <Image
                src="/landing_main.png"
                alt="AIMAX 대시보드 미리보기"
                width={1280}
                height={800}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
              이런 고민, 해보셨다면
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              "블로그 글을 매일 써야 한다는 건 알지만 막막하다",
              "체험단을 모집해봤지만, 매번 복잡하고 효율이 낮다", 
              "좋은 제품인데 콘텐츠가 안 따라준다",
              "대행 없이 내가 직접 운영하고 싶은데, 시간이 없다"
            ].map((problem, index) => (
              <div key={index} className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl group-hover:scale-110 transition-transform">😔</div>
                  <p className="text-text leading-relaxed font-medium">{problem}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-text text-white p-8 rounded-2xl text-center">
            <p className="text-lg md:text-xl leading-relaxed">
              <strong>AIMAX는 이런 고민을 가진 브랜드 운영자와 소상공인을 위해 만들어졌습니다.</strong><br />
              지금은 블로그부터, 곧 체험단까지 자동화됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* What is AIMAX Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
              AIMAX는 무엇인가?
            </h2>
            <p className="text-xl text-text leading-relaxed">
              AIMAX는 제품과 서비스를 판매하는 모든 사람들을 위한<br />
              <strong>&apos;팔리는 콘텐츠 + 자동화 운영&apos;을 한 번에 설계할 수 있는 SaaS</strong>입니다.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Current Features */}
            <div className="group bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold text-text mb-6 flex items-center">
                  <span className="text-green-500 mr-3 text-3xl">✅</span>
                  지금 가능한 기능
                </h3>
                <ul className="space-y-4">
                  {[
                    "정보성 / 판매성 블로그 글 자동 생성",
                    "원하는 키워드, 타깃, 분위기 입력만으로 브랜드에 맞춘 콘텐츠 완성",
                    "하루 10분 투자로 블로그를 자동 운영하는 습관화 구조"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-text leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Coming Features */}
            <div className="group bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold text-text mb-6 flex items-center">
                  <span className="text-blue-500 mr-3 text-3xl">🔄</span>
                  개발 중 기능 (예고)
                </h3>
                <ul className="space-y-4">
                  {[
                    "체험단 모집 자동화 (신청폼, 선정, 안내 메시지)",
                    "리뷰 수집 및 사진 자동 추출",
                    "리뷰 콘텐츠를 활용한 브랜드 블로그 포스트 자동 생성",
                    "상세페이지, SNS 콘텐츠 자동화 연동"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-text leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <div className="bg-text text-white p-6 rounded-xl inline-block">
              <p className="text-lg font-semibold">
                단순히 글을 쓰는 게 아니라, 글 → 체험 → 리뷰 → 매출로 이어지는 구조까지 자동화합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
              AIMAX는 이런 식으로 활용됩니다
            </h2>
          </div>
          
          <div className="space-y-6">
            {[
              { step: "1", title: "블로그 글 자동 작성", desc: "키워드만 입력하면 SEO 최적화된 글 완성" },
              { step: "2", title: "CTA 삽입 → 체험단 신청 유도", desc: "자연스럽게 체험단 모집으로 연결" },
              { step: "3", title: "신청자 자동 관리", desc: "체험자 선정부터 안내까지 자동화 (예정)" },
              { step: "4", title: "체험 후 리뷰/사진 자동 수집", desc: "후기 콘텐츠 자동 수집 및 정리 (예정)" },
              { step: "5", title: "브랜드 블로그로 재활용", desc: "수집된 콘텐츠로 새로운 글 자동 생성" }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-6 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="bg-text text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-text text-lg mb-1">{item.title}</h4>
                  <p className="text-text/70">{item.desc}</p>
                </div>
                {index < 4 && (
                  <div className="text-text/30 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <div className="bg-text text-white p-6 rounded-xl inline-block">
              <p className="text-xl font-bold">
                콘텐츠로 팔리는 구조를 만드는 자동 루틴
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Now Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
              왜 지금 AIMAX를 써야 하는가?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: "💰",
                title: "비용 절약",
                desc: "기존 대행 서비스에 매달 수십만 원 쓰고 있지 않나요?"
              },
              {
                icon: "⚡",
                title: "즉시 효과",
                desc: "글쓰기만 해결해도 체험단 운영의 반은 끝입니다"
              },
              {
                icon: "🎯",
                title: "전체 설계",
                desc: "AIMAX는 블로그만이 아니라 브랜드 전체 운영 흐름을 설계합니다"
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h4 className="font-bold text-text text-lg mb-3">{benefit.title}</h4>
                <p className="text-text/70 leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="bg-text text-white p-8 rounded-2xl text-center">
            <p className="text-lg leading-relaxed mb-4">
              <strong>지금 시작하는 사용자에게는 향후 모든 기능이 순차 오픈됩니다.</strong>
            </p>
            <p className="text-lg leading-relaxed">
              지금 가입하신 분들에겐 앞으로 자동화 루틴 설계 도구 전부를 가장 먼저 제공합니다.
            </p>
          </div>
        </div>
      </section>


      {/* Future Vision Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
              향후 비전
            </h2>
            <p className="text-xl text-text mb-8">
              AIMAX는 곧 다음 기능들을 공개할 예정입니다.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              "체험단 자동 모집 & 운영 기능",
              "블로그 후기 기반 브랜드 콘텐츠 자동 생성",
              "상세페이지 자동 기획 도구",
              "자동화된 리뷰 마케팅 관리 도구"
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🚀</div>
                  <span className="text-text font-medium">{feature}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <div className="bg-text text-white p-6 rounded-xl inline-block">
              <p className="text-lg font-semibold">
                지금 시작하면, 이 모든 흐름의 &apos;초기 사용자&apos;가 됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
              자주 묻는 질문
            </h2>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: "블로그 글 진짜 자동으로 써지나요?",
                a: "네, 키워드만 넣으면 지금 바로 글을 받을 수 있습니다."
              },
              {
                q: "체험단 자동화도 진짜 가능한가요?",
                a: "실제 운영 경험을 기반으로 개발 중이며, 연내 오픈 예정입니다."
              },
              {
                q: "지금 가입하면 비용이 드나요?",
                a: "지금은 베타 체험 단계로, 무료로 글쓰기를 이용하실 수 있습니다."
              },
              {
                q: "어떤 종류의 글을 쓸 수 있나요?",
                a: "정보성 글과 판매성 글 모두 가능하며, SEO 최적화까지 자동으로 처리됩니다."
              },
              {
                q: "생성된 글의 품질은 어떤가요?",
                a: "전문 카피라이터의 글쓰기 가이드라인을 적용하여 고품질 콘텐츠를 생성합니다."
              },
              {
                q: "다른 블로그 플랫폼과 연동이 가능한가요?",
                a: "현재는 복사/붙여넣기 방식이며, 향후 주요 플랫폼과의 자동 연동을 준비 중입니다."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <h4 className="font-bold text-text text-lg">Q. {faq.q}</h4>
                  <div className={`transform transition-transform ${openFAQ === index ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {openFAQ === index && (
                  <div className="px-6 pb-6">
                    <p className="text-text/70 leading-relaxed">A. {faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-text mb-6">
            지금 AIMAX를 시작하세요
          </h2>
          <p className="text-xl md:text-2xl text-text mb-12 leading-relaxed">
            글 하나가 비즈니스 자동화의 시작이 됩니다.
          </p>
          
          <div className="space-y-6">
            <Link 
              href="/dashboard"
              className="inline-block bg-text text-white px-12 py-5 rounded-xl font-bold text-xl hover:bg-text/90 transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
              style={{ backgroundColor: '#131313' }}
            >
              지금 무료로 글 써보기
            </Link>
            
            <div className="text-sm text-text/70">
              ✅ 베타 무료 체험 • ✅ 회원가입 간편 • ✅ 즉시 사용 가능
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">AIMAX</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                팔리는 콘텐츠 자동화 SaaS
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">서비스</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link href="/dashboard" className="hover:text-white">블로그 글쓰기</Link></li>
                <li><span className="opacity-50">체험단 자동화 (준비중)</span></li>
                <li><span className="opacity-50">리뷰 관리 (준비중)</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">고객지원</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="#" className="hover:text-white">자주 묻는 질문</a></li>
                <li><a href="#" className="hover:text-white">이용가이드</a></li>
                <li><a href="#" className="hover:text-white">문의하기</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">정책</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="#" className="hover:text-white">이용약관</a></li>
                <li><a href="#" className="hover:text-white">개인정보처리방침</a></li>
                <li><a href="#" className="hover:text-white">환불정책</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 pt-8 text-center">
            <p className="text-white/70 text-sm">
              © 2025 AIMAX by AIXLIFE. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}