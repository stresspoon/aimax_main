'use client';

import { useState } from 'react';
import axios from 'axios';

interface BlogPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function BlogPublishModal({ 
  isOpen, 
  onClose, 
  title, 
  content 
}: BlogPublishModalProps) {
  const [publishMethod, setPublishMethod] = useState<'selenium' | 'manual'>('manual');
  const [publishType, setPublishType] = useState<'draft' | 'immediate' | 'reserve'>('draft');
  const [reserveAt, setReserveAt] = useState('');
  const [naverId, setNaverId] = useState('');
  const [naverPw, setNaverPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    method?: string;
    error?: string;
    details?: string;
    suggestion?: string;
    instructions?: {
      step1: string;
      step2: string;
      step3: string;
      step4: string;
    };
    alternativeMethod?: {
      title: string;
      content: string;
      message: string;
    };
  } | null>(null);

  if (!isOpen) return null;

  const handlePublish = async () => {
    setLoading(true);
    setResult(null);

    try {
      if (publishMethod === 'selenium') {
        // Selenium 자동 발행
        const response = await axios.post('/api/naver-blog/publish-selenium', {
          id: naverId,
          password: naverPw,
          title,
          contentHtml: content,
          publishType,
          reserveAt
        });
        
        setResult({
          success: true,
          message: response.data.message || 'Selenium 자동 발행이 완료되었습니다.',
          method: 'selenium'
        });
      } else {
        // 북마크릿 방식
        const response = await axios.post('/api/schedule/publish-bookmark', {
          title,
          contentHtml: content,
          publishType,
          reserveAt
        });
        
        setResult(response.data);
      }
    } catch (error: unknown) {
      console.error('발행 오류:', error);
      const axiosError = error as { response?: { data?: { error?: string; details?: string } } };
      setResult({
        success: false,
        error: axiosError.response?.data?.error || '발행 중 오류가 발생했습니다.',
        details: axiosError.response?.data?.details,
        suggestion: publishMethod === 'selenium' ? '수동 발행 방식을 시도해보세요.' : 'Selenium 자동 발행을 시도해보세요.'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">네이버 블로그 발행</h2>
        
        {/* 발행 방식 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">발행 방식</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="manual"
                checked={publishMethod === 'manual'}
                onChange={(e) => setPublishMethod(e.target.value as 'manual')}
                className="mr-2"
              />
              수동 발행 (안전)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="selenium"
                checked={publishMethod === 'selenium'}
                onChange={(e) => setPublishMethod(e.target.value as 'selenium')}
                className="mr-2"
              />
              Selenium 자동 발행 (실험적)
            </label>
          </div>
        </div>

        {/* 자동 발행 시 로그인 정보 */}
        {publishMethod === 'selenium' && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800 mb-2">
              ✨ Selenium 기반 자동 발행: writing 폴더의 성공 사례를 적용한 개선된 방식
            </p>
            <p className="text-xs text-blue-600 mb-3">
              • 클립보드 복사/붙여넢기 방식 사용<br/>
              • 네이버 봇 감지 우회<br/>
              • 더 안정적인 셀렉터 사용
            </p>
            <input
              type="text"
              placeholder="네이버 아이디"
              value={naverId}
              onChange={(e) => setNaverId(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <input
              type="password"
              placeholder="네이버 비밀번호"
              value={naverPw}
              onChange={(e) => setNaverPw(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        )}

        {/* 발행 타입 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">발행 타입</label>
          <select
            value={publishType}
            onChange={(e) => setPublishType(e.target.value as 'draft' | 'immediate' | 'reserve')}
            className="w-full p-2 border rounded"
          >
            <option value="draft">임시저장</option>
            <option value="immediate">즉시 발행</option>
            <option value="reserve">예약 발행</option>
          </select>
        </div>

        {/* 예약 시간 */}
        {publishType === 'reserve' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">예약 시간</label>
            <input
              type="datetime-local"
              value={reserveAt}
              onChange={(e) => setReserveAt(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <div className={`mb-4 p-4 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {result.success ? (
              <div>
                {result.method === 'bookmarklet' ? (
                  <div>
                    <h3 className="font-bold mb-2">수동 발행 가이드</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>{result.instructions?.step1}</li>
                      <li>{result.instructions?.step2}</li>
                      <li>아래 내용을 복사하여 붙여넣으세요:</li>
                    </ol>
                    
                    <div className="mt-4 space-y-2">
                      <div className="p-2 bg-gray-100 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold">제목:</span>
                          <button
                            onClick={() => copyToClipboard(title)}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                          >
                            복사
                          </button>
                        </div>
                        <div className="text-xs overflow-hidden">{title}</div>
                      </div>
                      
                      <div className="p-2 bg-gray-100 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold">본문 HTML:</span>
                          <button
                            onClick={() => copyToClipboard(content)}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                          >
                            복사
                          </button>
                        </div>
                        <div className="text-xs overflow-hidden max-h-40 overflow-y-auto">
                          {content}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-green-800">{result.message}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-red-800">{result.error}</p>
                {result.suggestion && (
                  <p className="text-sm mt-2">{result.suggestion}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            닫기
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '발행'}
          </button>
        </div>
      </div>
    </div>
  );
}