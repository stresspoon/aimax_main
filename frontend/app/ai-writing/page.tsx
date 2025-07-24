'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Step1Data {
  topic: string;
}

interface Step2Data {
  generatedTitle: string;
  editedTitle: string;
  contentType: 'informational' | 'sales' | '';
}

interface Step3Data {
  primaryKeyword: string;
  subKeywords: string[];
}

interface GeneratedContent {
  sections: {
    introduction: string;
    body: string[];
    conclusion: string;
  };
  totalCharCount: number;
}

type Step = 1 | 2 | 3 | 4 | 5;

// API 설정
const API_BASE_URL = 'http://localhost:8000';

export default function AIWriting() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step data
  const [step1Data, setStep1Data] = useState<Step1Data>({ topic: '' });
  const [step2Data, setStep2Data] = useState<Step2Data>({
    generatedTitle: '',
    editedTitle: '',
    contentType: ''
  });
  const [step3Data, setStep3Data] = useState<Step3Data>({
    primaryKeyword: '',
    subKeywords: ['', '', '']
  });
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({
    sections: { introduction: '', body: [], conclusion: '' },
    totalCharCount: 0
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string>('');

  // Step 1: Generate SEO title using Gemini API
  const generateSEOTitle = async () => {
    if (!step1Data.topic.trim()) {
      setErrors({ topic: '키워드나 주제를 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setApiError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-title`, {
        topic: step1Data.topic
      });

      const { title } = response.data;
      setStep2Data(prev => ({
        ...prev,
        generatedTitle: title,
        editedTitle: title
      }));
      setCurrentStep(2);
    } catch (error: unknown) {
      console.error('제목 생성 오류:', error);
      const axiosError = error as { response?: { data?: { detail?: string } }; code?: string };
      if (axiosError.response?.data?.detail) {
        setApiError(`제목 생성 실패: ${axiosError.response.data.detail}`);
      } else if (axiosError.code === 'ECONNREFUSED') {
        setApiError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        setApiError('제목 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Proceed to keyword selection
  const proceedToKeywords = () => {
    if (!step2Data.editedTitle.trim()) {
      setErrors({ title: '제목을 입력해주세요.' });
      return;
    }
    if (!step2Data.contentType) {
      setErrors({ contentType: '글의 성격을 선택해주세요.' });
      return;
    }

    setErrors({});
    setCurrentStep(3);
  };

  // Step 3: Get keyword recommendations from Naver API
  const getKeywordRecommendations = async () => {
    setIsLoading(true);
    setApiError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/recommend-keywords`, {
        topic: step1Data.topic
      });

      const { primary_keyword, sub_keywords } = response.data;
      setStep3Data({
        primaryKeyword: primary_keyword,
        subKeywords: sub_keywords
      });
    } catch (error: unknown) {
      console.error('키워드 추천 오류:', error);
      const axiosError = error as { response?: { data?: { detail?: string } }; code?: string };
      if (axiosError.response?.data?.detail) {
        setApiError(`키워드 추천 실패: ${axiosError.response.data.detail}`);
      } else if (axiosError.code === 'ECONNREFUSED') {
        setApiError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        setApiError('키워드 추천 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 생성된 콘텐츠 상태 확장
  const [seoMetrics, setSeoMetrics] = useState({
    seo_score: 0,
    keyword_density: 0,
    readability_score: 0
  });
  const [contentOutline, setContentOutline] = useState<string[]>([]);
  const [metaDescription, setMetaDescription] = useState('');

  // Step 4: Generate content based on guidelines
  const generateContent = async () => {
    if (!step3Data.primaryKeyword.trim()) {
      setErrors({ primaryKeyword: '핵심 키워드를 입력해주세요.' });
      return;
    }
    if (step3Data.subKeywords.filter(k => k.trim()).length < 3) {
      setErrors({ subKeywords: '보조 키워드를 최소 3개 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setApiError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-content`, {
        topic: step1Data.topic,
        title: step2Data.editedTitle,
        content_type: step2Data.contentType,
        primary_keyword: step3Data.primaryKeyword,
        sub_keywords: step3Data.subKeywords.filter(k => k.trim())
      });

      const { sections, seo_metrics, outline, meta_description, total_char_count } = response.data;
      
      setGeneratedContent({
        sections: sections,
        totalCharCount: total_char_count
      });
      setSeoMetrics(seo_metrics);
      setContentOutline(outline);
      setMetaDescription(meta_description);
      setCurrentStep(4);
    } catch (error: unknown) {
      console.error('콘텐츠 생성 오류:', error);
      const axiosError = error as { response?: { data?: { detail?: string } }; code?: string };
      if (axiosError.response?.data?.detail) {
        setApiError(`콘텐츠 생성 실패: ${axiosError.response.data.detail}`);
      } else if (axiosError.code === 'ECONNREFUSED') {
        setApiError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        setApiError('콘텐츠 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Content editing functions
  const updateSection = (section: 'introduction' | 'conclusion', value: string) => {
    setGeneratedContent(prev => {
      const newSections = { ...prev.sections, [section]: value };
      const fullContent = newSections.introduction + '\n\n' + newSections.body.join('\n\n') + '\n\n' + newSections.conclusion;
      return {
        sections: newSections,
        totalCharCount: fullContent.length
      };
    });
  };

  const updateBodySection = (index: number, value: string) => {
    setGeneratedContent(prev => {
      const newBody = [...prev.sections.body];
      newBody[index] = value;
      const newSections = { ...prev.sections, body: newBody };
      const fullContent = newSections.introduction + '\n\n' + newSections.body.join('\n\n') + '\n\n' + newSections.conclusion;
      return {
        sections: newSections,
        totalCharCount: fullContent.length
      };
    });
  };

  const copyToClipboard = async () => {
    const fullContent = generatedContent.sections.introduction + '\n\n' + 
                       generatedContent.sections.body.join('\n\n') + '\n\n' + 
                       generatedContent.sections.conclusion;
    
    try {
      await navigator.clipboard.writeText(fullContent);
      alert('글이 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('복사 실패:', err);
      alert('복사에 실패했습니다.');
    }
  };

  // Step progress indicator
  const getStepTitle = (step: Step) => {
    switch (step) {
      case 1: return '키워드/주제 입력';
      case 2: return '제목 확인 및 글 성격 선택';
      case 3: return '키워드 설정';
      case 4: return '글 생성 및 편집';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
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
            단계별로 진행하여 SEO 최적화된 고품질 블로그 글을 생성합니다
          </p>
        </header>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <p className="text-text font-medium text-center">
            {getStepTitle(currentStep)}
          </p>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          {/* Step 1: Topic Input */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-text mb-6 text-center">
                어떤 주제로 글을 작성하시겠어요?
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-text mb-2">
                    키워드 또는 주제 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="topic"
                    value={step1Data.topic}
                    onChange={(e) => setStep1Data({ topic: e.target.value })}
                    placeholder="예: 디지털 마케팅, 홈트레이닝, 재테크 방법"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.topic ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.topic && <span className="text-red-500 text-sm mt-1 block">{errors.topic}</span>}
                </div>

                {/* API 에러 표시 */}
                {apiError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <div className="text-red-400 mr-3 mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <p className="text-red-800 text-sm">{apiError}</p>
                        <button
                          onClick={() => {
                            setApiError('');
                            generateSEOTitle();
                          }}
                          className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium underline"
                        >
                          다시 시도
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={generateSEOTitle}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      AI가 SEO 제목을 생성하고 있습니다...
                    </>
                  ) : (
                    '🎯 SEO 제목 생성하기'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Title Review and Content Type */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-text mb-6 text-center">
                생성된 제목을 확인하고 글의 성격을 선택하세요
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="editTitle" className="block text-sm font-medium text-text mb-2">
                    제목 (수정 가능) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="editTitle"
                    value={step2Data.editedTitle}
                    onChange={(e) => setStep2Data(prev => ({ ...prev, editedTitle: e.target.value }))}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.title && <span className="text-red-500 text-sm mt-1 block">{errors.title}</span>}
                  <p className="text-gray-500 text-sm mt-1">제목이 마음에 들지 않으면 직접 수정할 수 있습니다.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-3">
                    글의 성격 선택 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      step2Data.contentType === 'informational' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="contentType"
                        value="informational"
                        checked={step2Data.contentType === 'informational'}
                        onChange={(e) => setStep2Data(prev => ({ ...prev, contentType: e.target.value as 'informational' }))}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl mb-2">📚</div>
                        <h3 className="font-semibold text-text mb-1">정보성</h3>
                        <p className="text-sm text-gray-600">독자에게 유용한 정보와 지식을 제공하는 글</p>
                      </div>
                    </label>
                    
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      step2Data.contentType === 'sales' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="contentType"
                        value="sales"
                        checked={step2Data.contentType === 'sales'}
                        onChange={(e) => setStep2Data(prev => ({ ...prev, contentType: e.target.value as 'sales' }))}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl mb-2">💰</div>
                        <h3 className="font-semibold text-text mb-1">판매성</h3>
                        <p className="text-sm text-gray-600">제품이나 서비스 판매를 목적으로 하는 글</p>
                      </div>
                    </label>
                  </div>
                  {errors.contentType && <span className="text-red-500 text-sm mt-1 block">{errors.contentType}</span>}
                </div>

                <button
                  onClick={proceedToKeywords}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  다음 단계로 →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Keyword Setting */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-text mb-6 text-center">
                글에 포함할 키워드를 설정하세요
              </h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-text">
                      핵심 키워드 (1개) <span className="text-red-500">*</span>
                    </label>
                    <button
                      onClick={getKeywordRecommendations}
                      disabled={isLoading}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          추천 중...
                        </>
                      ) : (
                        <>🔍 키워드 추천</>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={step3Data.primaryKeyword}
                    onChange={(e) => setStep3Data(prev => ({ ...prev, primaryKeyword: e.target.value }))}
                    placeholder="글의 핵심이 되는 키워드를 입력하세요"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.primaryKeyword ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.primaryKeyword && <span className="text-red-500 text-sm mt-1 block">{errors.primaryKeyword}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    보조 키워드 (최소 3개) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {step3Data.subKeywords.map((keyword, index) => (
                      <input
                        key={index}
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                          const newSubKeywords = [...step3Data.subKeywords];
                          newSubKeywords[index] = e.target.value;
                          setStep3Data(prev => ({ ...prev, subKeywords: newSubKeywords }));
                        }}
                        placeholder={`보조 키워드 ${index + 1}`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ))}
                    <button
                      onClick={() => setStep3Data(prev => ({ ...prev, subKeywords: [...prev.subKeywords, ''] }))}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      + 보조 키워드 추가
                    </button>
                  </div>
                  {errors.subKeywords && <span className="text-red-500 text-sm mt-1 block">{errors.subKeywords}</span>}
                </div>

                {/* API 에러 표시 */}
                {apiError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <div className="text-red-400 mr-3 mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <p className="text-red-800 text-sm">{apiError}</p>
                        <button
                          onClick={() => {
                            setApiError('');
                            generateContent();
                          }}
                          className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium underline"
                        >
                          다시 시도
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={generateContent}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      AI가 글을 생성하고 있습니다...
                    </>
                  ) : (
                    '✨ 글 생성 시작'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Content Generation and Editing */}
          {currentStep === 4 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-text">
                  생성된 글 편집
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    총 <span className="font-semibold text-blue-600">{generatedContent.totalCharCount.toLocaleString()}</span>자
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    📄 전체 복사
                  </button>
                </div>
              </div>

              {/* SEO 메트릭 */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-text mb-4">📊 SEO 분석 결과</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${seoMetrics.seo_score >= 80 ? 'text-green-600' : seoMetrics.seo_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {seoMetrics.seo_score}점
                    </div>
                    <div className="text-sm text-gray-600">SEO 점수</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${seoMetrics.keyword_density >= 2 ? 'text-green-600' : 'text-red-600'}`}>
                      {seoMetrics.keyword_density}%
                    </div>
                    <div className="text-sm text-gray-600">키워드 밀도</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${seoMetrics.readability_score >= 70 ? 'text-green-600' : seoMetrics.readability_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {seoMetrics.readability_score}점
                    </div>
                    <div className="text-sm text-gray-600">가독성 점수</div>
                  </div>
                </div>
              </div>

              {/* 목차 */}
              {contentOutline.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-text mb-4">📋 목차</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    {contentOutline.map((item, index) => (
                      <li key={index} className="text-text">{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 메타 설명 */}
              {metaDescription && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-text mb-4">🏷️ 메타 설명</h3>
                  <p className="text-text text-sm leading-relaxed">{metaDescription}</p>
                  <div className="text-right mt-2">
                    <span className="text-gray-500 text-xs">{metaDescription.length}/160자</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Introduction */}
                <div>
                  <h3 className="text-lg font-semibold text-text mb-2">도입부</h3>
                  <textarea
                    value={generatedContent.sections.introduction}
                    onChange={(e) => updateSection('introduction', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Body Sections */}
                {generatedContent.sections.body.map((section, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-semibold text-text mb-2">본문 {index + 1}</h3>
                    <textarea
                      value={section}
                      onChange={(e) => updateBodySection(index, e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                ))}

                {/* Conclusion */}
                <div>
                  <h3 className="text-lg font-semibold text-text mb-2">결론</h3>
                  <textarea
                    value={generatedContent.sections.conclusion}
                    onChange={(e) => updateSection('conclusion', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}