'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { isValidGoogleSheetsUrl, getSheetUrlErrorMessage } from '@/utils/sheetUtils';

interface ConnectedSheet {
  sheetId: string;
  title: string;
  url: string;
  sheets: Array<{
    id: number;
    title: string;
  }>;
}

interface SheetConnectorProps {
  onSheetConnected?: (sheet: ConnectedSheet) => void;
  className?: string;
}

export default function SheetConnector({ onSheetConnected, className = '' }: SheetConnectorProps) {
  const { data: session } = useSession();
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectedSheet, setConnectedSheet] = useState<ConnectedSheet | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      setError('로그인이 필요합니다.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // 클라이언트 사이드 유효성 검증
      if (!isValidGoogleSheetsUrl(sheetUrl)) {
        setError(getSheetUrlErrorMessage(sheetUrl));
        return;
      }

      const response = await axios.post('/api/sheets/connect', {
        sheetUrl: sheetUrl.trim()
      });

      if (response.data.success) {
        const sheet = response.data.data;
        setConnectedSheet(sheet);
        setSuccess(`'${sheet.title}' 시트가 성공적으로 연동되었습니다.`);
        setSheetUrl('');
        
        // 콜백 호출
        if (onSheetConnected) {
          onSheetConnected(sheet);
        }
      }

    } catch (error: unknown) {
      console.error('시트 연동 오류:', error);
      
      const axiosError = error as { response?: { data?: { error?: string } }; code?: string };
      if (axiosError.response?.data?.error) {
        setError(axiosError.response.data.error);
      } else if (axiosError.code === 'ECONNREFUSED') {
        setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('시트 연동 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConnectedSheet(null);
    setSuccess('');
    setError('');
    setSheetUrl('');
  };

  if (!session) {
    return (
      <div className={`bg-white rounded-lg p-6 border border-gray-200 ${className}`}>
        <h3 className="text-lg font-semibold text-text mb-4">구글시트 연동</h3>
        <p className="text-gray-600">구글시트를 연동하려면 먼저 로그인해주세요.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-6 border border-gray-200 ${className}`}>
      <h3 className="text-lg font-semibold text-text mb-4">구글시트 연동</h3>
      
      {connectedSheet ? (
        // 연동 완료 상태
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-green-400 mr-3 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-green-800 font-medium">{success}</p>
                <div className="mt-2 text-sm text-green-700">
                  <p><strong>시트명:</strong> {connectedSheet.title}</p>
                  <p><strong>워크시트:</strong> {connectedSheet.sheets.length}개</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              다른 시트 연동
            </button>
            <a
              href={connectedSheet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-text text-white px-4 py-2 rounded-lg font-medium hover:bg-text/90 transition-colors"
            >
              시트 열기
            </a>
          </div>
        </div>
      ) : (
        // 연동 폼
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sheetUrl" className="block text-sm font-medium text-text mb-2">
              구글시트 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="sheetUrl"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-text/20 focus:border-text ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              구글시트 URL을 복사해서 붙여넣어주세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-red-400 mr-3 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !sheetUrl.trim()}
            className="w-full bg-text text-white py-3 px-4 rounded-lg font-medium hover:bg-text/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                연동 중...
              </>
            ) : (
              '시트 연동하기'
            )}
          </button>
        </form>
      )}

      {/* 도움말 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-text mb-2">연동 방법</h4>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>구글시트에서 &apos;공유&apos; 버튼을 클릭하세요</li>
          <li>&apos;링크가 있는 모든 사용자&apos;로 권한을 설정하세요</li>
          <li>공유 링크를 복사해서 위 입력란에 붙여넣으세요</li>
        </ol>
      </div>
    </div>
  );
}