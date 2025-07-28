'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { InfluenceVerification, DEFAULT_INFLUENCE_CRITERIA } from '@/types/influence';

interface InfluenceVerifierProps {
  applicantEmail: string;
  initialUrls?: {
    naverBlog?: string;
    instagram?: string;
    threads?: string;
  };
  onVerificationComplete?: (result: InfluenceVerification) => void;
}

export default function InfluenceVerifier({ 
  applicantEmail, 
  initialUrls = {},
  onVerificationComplete 
}: InfluenceVerifierProps) {
  const { data: session } = useSession();
  const [urls, setUrls] = useState(initialUrls);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<InfluenceVerification | null>(null);
  const [error, setError] = useState('');
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  const handleVerify = async () => {
    if (!session) {
      setError('로그인이 필요합니다.');
      return;
    }

    // URL 중 최소 하나는 입력되어야 함
    const hasAnyUrl = Object.values(urls).some(url => url && url.trim());
    if (!hasAnyUrl) {
      setError('최소 하나의 SNS URL을 입력해주세요.');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');

      const response = await axios.post('/api/influence/verify', {
        applicantEmail,
        urls: {
          naverBlog: urls.naverBlog?.trim() || undefined,
          instagram: urls.instagram?.trim() || undefined,
          threads: urls.threads?.trim() || undefined,
        }
      });

      const result = response.data.data as InfluenceVerification;
      setVerificationResult(result);
      
      if (onVerificationComplete) {
        onVerificationComplete(result);
      }

    } catch (error: unknown) {
      console.error('검증 오류:', error);
      const axiosError = error as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || '검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleProfileExpansion = (platform: string) => {
    const newExpanded = new Set(expandedProfiles);
    if (newExpanded.has(platform)) {
      newExpanded.delete(platform);
    } else {
      newExpanded.add(platform);
    }
    setExpandedProfiles(newExpanded);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toLocaleString();
    }
  };

  const getPlatformName = (platform: string): string => {
    switch (platform) {
      case 'naver_blog': return '네이버 블로그';
      case 'instagram': return '인스타그램';
      case 'threads': return 'Threads';
      default: return platform;
    }
  };

  const getPlatformIcon = (platform: string): string => {
    switch (platform) {
      case 'naver_blog': return '📝';
      case 'instagram': return '📷';
      case 'threads': return '🧵';
      default: return '🔗';
    }
  };

  const getStatusBadge = (isValid: boolean, meetsRequirement: boolean) => {
    if (!isValid) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">실패</span>;
    } else if (meetsRequirement) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">통과</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">미달</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-gray-900">SNS 영향력 검증</h4>
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isVerifying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              검증 중...
            </>
          ) : (
            '검증 시작'
          )}
        </button>
      </div>

      {/* 기준 안내 */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-900 mb-2">영향력 기준</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-800">
          <div>📝 네이버 블로그: {DEFAULT_INFLUENCE_CRITERIA.naverBlog.minVisitors}명 이상</div>
          <div>📷 인스타그램: {DEFAULT_INFLUENCE_CRITERIA.instagram.minFollowers}명 이상</div>
          <div>🧵 Threads: {DEFAULT_INFLUENCE_CRITERIA.threads.minFollowers}명 이상</div>
        </div>
      </div>

      {/* URL 입력 폼 */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📝 네이버 블로그 URL
          </label>
          <input
            type="url"
            value={urls.naverBlog || ''}
            onChange={(e) => setUrls(prev => ({ ...prev, naverBlog: e.target.value }))}
            placeholder="https://blog.naver.com/username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isVerifying}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📷 인스타그램 URL
          </label>
          <input
            type="url"
            value={urls.instagram || ''}
            onChange={(e) => setUrls(prev => ({ ...prev, instagram: e.target.value }))}
            placeholder="https://www.instagram.com/username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isVerifying}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🧵 Threads URL
          </label>
          <input
            type="url"
            value={urls.threads || ''}
            onChange={(e) => setUrls(prev => ({ ...prev, threads: e.target.value }))}
            placeholder="https://www.threads.net/@username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isVerifying}
          />
        </div>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* 검증 결과 */}
      {verificationResult && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h5 className="text-md font-semibold text-gray-900">검증 결과</h5>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                총점: <span className="font-bold text-lg">{verificationResult.overallResult.totalScore}점</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                verificationResult.overallResult.meetsAllCriteria
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {verificationResult.overallResult.meetsAllCriteria ? '✅ 기준 충족' : '❌ 기준 미달'}
              </div>
            </div>
          </div>

          {/* 플랫폼별 결과 */}
          <div className="space-y-3">
            {verificationResult.profiles.map((profile, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div 
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleProfileExpansion(profile.platform)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getPlatformIcon(profile.platform)}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {getPlatformName(profile.platform)}
                      </div>
                      <div className="text-sm text-gray-600">
                        @{profile.username}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {profile.isValid && (
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {profile.platform === 'naver_blog' 
                            ? formatNumber(profile.visitors || 0)
                            : formatNumber(profile.followers || 0)
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {profile.platform === 'naver_blog' ? '방문자' : '팔로워'}
                        </div>
                      </div>
                    )}
                    
                    {getStatusBadge(
                      profile.isValid,
                      profile.platform === 'naver_blog'
                        ? verificationResult.overallResult.meetsCriteria.naverBlog
                        : profile.platform === 'instagram'
                        ? verificationResult.overallResult.meetsCriteria.instagram
                        : verificationResult.overallResult.meetsCriteria.threads
                    )}
                    
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedProfiles.has(profile.platform) ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {/* 상세 정보 (확장 시) */}
                {expandedProfiles.has(profile.platform) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">URL:</span>
                        <a 
                          href={profile.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline break-all"
                        >
                          {profile.url}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-600">검증 시간:</span>
                        <span className="ml-2">
                          {new Date(profile.lastChecked).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {profile.errorMessage && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        <strong>오류:</strong> {profile.errorMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            검증 완료: {new Date(verificationResult.verificationDate).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}