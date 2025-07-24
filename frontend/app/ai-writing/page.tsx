'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FormData {
  keyword: string;
  field: string;
  tone: string;
  additionalInfo: string;
}

interface GeneratedContent {
  title: string;
  outline: string[];
  content: string;
  metaDescription: string;
}

export default function AIWriting() {
  const [formData, setFormData] = useState<FormData>({
    keyword: '',
    field: '',
    tone: '',
    additionalInfo: ''
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const toneOptions = [
    { value: '', label: '톤 선택' },
    { value: 'professional', label: '전문적' },
    { value: 'friendly', label: '친근한' },
    { value: 'formal', label: '공식적' },
    { value: 'casual', label: '캐주얼' },
    { value: 'persuasive', label: '설득적' }
  ];

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.keyword.trim()) {
      newErrors.keyword = '키워드를 입력해주세요';
    }
    if (!formData.field.trim()) {
      newErrors.field = '분야를 입력해주세요';
    }
    if (!formData.tone) {
      newErrors.tone = '톤을 선택해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    // 시뮬레이션: 실제로는 API 호출
    setTimeout(() => {
      setGeneratedContent({
        title: `${formData.keyword}에 대한 완벽 가이드: ${formData.field} 전문가가 알려주는 핵심 포인트`,
        outline: [
          `${formData.keyword}란 무엇인가?`,
          `${formData.field}에서 ${formData.keyword}의 중요성`,
          `${formData.keyword} 활용 방법 5가지`,
          `실제 사례와 성공 스토리`,
          `자주 묻는 질문과 답변`,
          `결론 및 향후 전망`
        ],
        content: `# ${formData.keyword}에 대한 완벽 가이드\n\n${formData.field} 분야에서 ${formData.keyword}는 매우 중요한 요소입니다. 이 글에서는 ${formData.keyword}의 개념부터 실제 활용 방법까지 상세히 다루어보겠습니다.\n\n## 1. ${formData.keyword}란 무엇인가?\n\n${formData.keyword}는 ${formData.field} 분야에서 핵심적인 역할을 하는 개념입니다...\n\n## 2. ${formData.field}에서 ${formData.keyword}의 중요성\n\n현대 ${formData.field} 환경에서 ${formData.keyword}의 중요성은 날로 증가하고 있습니다...\n\n## 3. ${formData.keyword} 활용 방법 5가지\n\n### 3.1 첫 번째 방법\n구체적인 활용 방안에 대해 설명합니다...\n\n### 3.2 두 번째 방법\n실무에서 적용 가능한 방법을 제시합니다...\n\n[내용이 계속됩니다...]`,
        metaDescription: `${formData.field} 전문가가 알려주는 ${formData.keyword} 완벽 가이드. 개념부터 실제 활용 방법까지 상세히 설명합니다.`
      });
      setIsLoading(false);
    }, 2000);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${type}이(가) 클립보드에 복사되었습니다.`);
    } catch (err) {
      console.error('복사 실패:', err);
      alert('복사에 실패했습니다.');
    }
  };

  const getCharacterCount = (text: string) => text.length;

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
            AI가 키워드를 분석해 SEO 최적화된 블로그 글을 자동으로 생성합니다
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 입력 폼 */}
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold text-text mb-6">콘텐츠 정보 입력</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 키워드 입력 */}
              <div>
                <label htmlFor="keyword" className="block text-sm font-medium text-text mb-2">
                  키워드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="keyword"
                  value={formData.keyword}
                  onChange={(e) => handleInputChange('keyword', e.target.value)}
                  placeholder="예: 디지털 마케팅, 온라인 쇼핑몰"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.keyword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-red-500 text-sm">{errors.keyword}</span>
                  <span className="text-gray-500 text-sm">{getCharacterCount(formData.keyword)}/100</span>
                </div>
              </div>

              {/* 분야 입력 */}
              <div>
                <label htmlFor="field" className="block text-sm font-medium text-text mb-2">
                  분야 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="field"
                  value={formData.field}
                  onChange={(e) => handleInputChange('field', e.target.value)}
                  placeholder="예: IT, 패션, 음식, 여행"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.field ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-red-500 text-sm">{errors.field}</span>
                  <span className="text-gray-500 text-sm">{getCharacterCount(formData.field)}/50</span>
                </div>
              </div>

              {/* 톤 선택 */}
              <div>
                <label htmlFor="tone" className="block text-sm font-medium text-text mb-2">
                  글의 톤 <span className="text-red-500">*</span>
                </label>
                <select
                  id="tone"
                  value={formData.tone}
                  onChange={(e) => handleInputChange('tone', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.tone ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {toneOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.tone && <span className="text-red-500 text-sm mt-1 block">{errors.tone}</span>}
              </div>

              {/* 추가 정보 */}
              <div>
                <label htmlFor="additionalInfo" className="block text-sm font-medium text-text mb-2">
                  추가 정보 (선택사항)
                </label>
                <textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="타겟 독자, 특별히 강조하고 싶은 포인트 등을 입력해주세요"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="text-right mt-1">
                  <span className="text-gray-500 text-sm">{getCharacterCount(formData.additionalInfo)}/500</span>
                </div>
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    AI가 글을 생성하고 있습니다...
                  </>
                ) : (
                  '✨ AI 글쓰기 시작'
                )}
              </button>
            </form>
          </div>

          {/* 결과 표시 */}
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold text-text mb-6">생성된 콘텐츠</h2>
            
            {!generatedContent ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <p>좌측 폼을 작성하고 AI 글쓰기를 시작해보세요</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 제목 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-text">제목</h3>
                    <button
                      onClick={() => copyToClipboard(generatedContent.title, '제목')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      📋 복사
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-text font-medium">{generatedContent.title}</p>
                  </div>
                </div>

                {/* 목차 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-text">목차</h3>
                    <button
                      onClick={() => copyToClipboard(generatedContent.outline.join('\n'), '목차')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      📋 복사
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ol className="list-decimal list-inside space-y-1">
                      {generatedContent.outline.map((item, index) => (
                        <li key={index} className="text-text">{item}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* 본문 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-text">본문</h3>
                    <button
                      onClick={() => copyToClipboard(generatedContent.content, '본문')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      📋 복사
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-text text-sm whitespace-pre-wrap font-sans">
                      {generatedContent.content}
                    </pre>
                  </div>
                </div>

                {/* 메타 설명 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-text">메타 설명</h3>
                    <button
                      onClick={() => copyToClipboard(generatedContent.metaDescription, '메타 설명')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      📋 복사
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-text">{generatedContent.metaDescription}</p>
                  </div>
                </div>

                {/* 전체 복사 버튼 */}
                <button
                  onClick={() => {
                    const fullContent = `제목: ${generatedContent.title}\n\n목차:\n${generatedContent.outline.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n본문:\n${generatedContent.content}\n\n메타 설명:\n${generatedContent.metaDescription}`;
                    copyToClipboard(fullContent, '전체 콘텐츠');
                  }}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  📄 전체 콘텐츠 복사
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}