'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Applicant, SyncResult, ApplicantSheet } from '@/types/applicant';
import { InfluenceVerification } from '@/types/influence';
import InfluenceVerifier from '../influence/InfluenceVerifier';

interface ApplicantManagerProps {
  connectedSheet?: {
    sheetId: string;
    title: string;
    sheets: Array<{ id: number; title: string }>;
  };
}

export default function ApplicantManager({ connectedSheet }: ApplicantManagerProps) {
  const { data: session } = useSession();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showInfluenceVerifier, setShowInfluenceVerifier] = useState(false);

  // 시트 설정 상태
  const [sheetConfig, setSheetConfig] = useState<ApplicantSheet | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (session) {
      loadApplicants();
      loadSyncLogs();
    }
  }, [session]);

  const loadApplicants = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/applicants');
      setApplicants(response.data.data);
    } catch (error) {
      console.error('신청자 목록 로드 오류:', error);
      setError('신청자 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const response = await axios.get('/api/sheets/sync');
      setSyncLogs(response.data.data);
    } catch (error) {
      console.error('동기화 로그 로드 오류:', error);
    }
  };

  const handleSync = async () => {
    if (!sheetConfig) {
      setError('먼저 시트 설정을 완료해주세요.');
      return;
    }

    try {
      setIsSyncing(true);
      setError('');
      setSuccess('');

      const response = await axios.post('/api/sheets/sync', {
        sheetConfig
      });

      const result = response.data.data as SyncResult;
      
      if (result.success) {
        setSuccess(`동기화 완료: 신규 ${result.newApplicants}명, 업데이트 ${result.updatedApplicants}명`);
        await loadApplicants();
        await loadSyncLogs();
      } else {
        setError(`동기화 실패: ${result.errors.join(', ')}`);
      }

    } catch (error: unknown) {
      console.error('동기화 오류:', error);
      const axiosError = error as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || '동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateApplicantStatus = async (email: string, status: 'pending' | 'approved' | 'rejected', notes?: string) => {
    try {
      await axios.put('/api/applicants', {
        email,
        status,
        notes
      });

      // 로컬 상태 업데이트
      setApplicants(prev => prev.map(app => 
        app.email === email 
          ? { ...app, status, notes: notes || app.notes }
          : app
      ));

      setSuccess('신청자 상태가 업데이트되었습니다.');
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
      setError('상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  if (!session) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <p className="text-gray-600">신청자 관리 기능을 사용하려면 로그인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        {/* 임시 저장소 안내 */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="text-yellow-400 mr-3 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-yellow-800 text-sm font-medium">임시 저장소 사용 중</p>
              <p className="text-yellow-700 text-xs mt-1">
                현재 데이터는 메모리에 임시 저장되며, 서버 재시작 시 초기화됩니다. 실제 환경에서는 데이터베이스 연동이 필요합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">신청자 관리</h3>
          
          <div className="flex gap-2">
            {connectedSheet && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                시트 설정
              </button>
            )}
            
            <button
              onClick={handleSync}
              disabled={isSyncing || !sheetConfig}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  동기화 중...
                </>
              ) : (
                '데이터 동기화'
              )}
            </button>
          </div>
        </div>

        {/* 상태 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            {success}
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{applicants.length}</div>
            <div className="text-sm text-gray-600">총 신청자</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {applicants.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">대기 중</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {applicants.filter(a => a.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">승인</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {applicants.filter(a => a.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600">거부</div>
          </div>
        </div>
      </div>

      {/* 시트 설정 패널 */}
      {showConfig && connectedSheet && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">시트 동기화 설정</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                워크시트 선택
              </label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={async (e) => {
                  const selectedSheet = connectedSheet.sheets.find(s => s.title === e.target.value);
                  if (selectedSheet) {
                    try {
                      // 시트 구조 분석
                      const response = await axios.post('/api/sheets/analyze', {
                        sheetId: connectedSheet.sheetId,
                        sheetName: selectedSheet.title
                      });

                      if (response.data.success) {
                        const analysis = response.data.data;
                        setSheetConfig({
                          sheetId: connectedSheet.sheetId,
                          sheetName: selectedSheet.title,
                          headerRow: 1,
                          columnMapping: {
                            name: analysis.suggestedMapping.name || '성함',
                            email: analysis.suggestedMapping.email || '메일주소',
                            phone: analysis.suggestedMapping.phone || '연락처',
                            instagram: analysis.suggestedMapping.instagram || '리뷰 작성할 SNS 계정 URL',
                            snsUrls: analysis.suggestedMapping.snsUrls || ['리뷰 작성할 SNS 계정 URL', '다른 SNS에도 올릴 사람..?'],
                            followers: analysis.suggestedMapping.followers || '',
                            applicationDate: analysis.suggestedMapping.applicationDate || '타임스탬프',
                            status: analysis.suggestedMapping.status || '',
                            notes: analysis.suggestedMapping.notes || '개인정보 활용 동의'
                          }
                        });
                      }
                    } catch (error) {
                      console.error('시트 분석 오류:', error);
                      // 기본값으로 설정
                      setSheetConfig({
                        sheetId: connectedSheet.sheetId,
                        sheetName: selectedSheet.title,
                        headerRow: 1,
                        columnMapping: {
                          name: '성함',
                          email: '메일주소',
                          phone: '연락처',
                          instagram: '리뷰 작성할 SNS 계정 URL',
                          snsUrls: ['리뷰 작성할 SNS 계정 URL', '다른 SNS에도 올릴 사람..?'],
                          followers: '',
                          applicationDate: '타임스탬프',
                          status: '',
                          notes: '개인정보 활용 동의'
                        }
                      });
                    }
                  }
                }}
              >
                <option value="">워크시트를 선택하세요</option>
                {connectedSheet.sheets.map(sheet => (
                  <option key={sheet.id} value={sheet.title}>
                    {sheet.title}
                  </option>
                ))}
              </select>
            </div>

            {sheetConfig && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    선택된 시트: <strong>{sheetConfig.sheetName}</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    아래 매핑을 확인하고 필요시 수정하세요. 빈 값은 해당 정보가 없다는 의미입니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름 컬럼</label>
                    <input
                      type="text"
                      value={sheetConfig.columnMapping.name}
                      onChange={(e) => setSheetConfig(prev => prev ? {
                        ...prev,
                        columnMapping: { ...prev.columnMapping, name: e.target.value }
                      } : null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="성함"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일 컬럼 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={sheetConfig.columnMapping.email}
                      onChange={(e) => setSheetConfig(prev => prev ? {
                        ...prev,
                        columnMapping: { ...prev.columnMapping, email: e.target.value }
                      } : null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="메일주소"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처 컬럼</label>
                    <input
                      type="text"
                      value={sheetConfig.columnMapping.phone || ''}
                      onChange={(e) => setSheetConfig(prev => prev ? {
                        ...prev,
                        columnMapping: { ...prev.columnMapping, phone: e.target.value }
                      } : null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="연락처"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">메인 SNS URL 컬럼</label>
                    <input
                      type="text"
                      value={sheetConfig.columnMapping.instagram || ''}
                      onChange={(e) => setSheetConfig(prev => prev ? {
                        ...prev,
                        columnMapping: { ...prev.columnMapping, instagram: e.target.value }
                      } : null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="리뷰 작성할 SNS 계정 URL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">추가 SNS URL 컬럼들</label>
                    <div className="space-y-2">
                      {(sheetConfig.columnMapping.snsUrls || []).map((url, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => {
                              const newUrls = [...(sheetConfig.columnMapping.snsUrls || [])];
                              newUrls[index] = e.target.value;
                              setSheetConfig(prev => prev ? {
                                ...prev,
                                columnMapping: { ...prev.columnMapping, snsUrls: newUrls }
                              } : null);
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder={`SNS URL 컬럼 ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = (sheetConfig.columnMapping.snsUrls || []).filter((_, i) => i !== index);
                              setSheetConfig(prev => prev ? {
                                ...prev,
                                columnMapping: { ...prev.columnMapping, snsUrls: newUrls }
                              } : null);
                            }}
                            className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newUrls = [...(sheetConfig.columnMapping.snsUrls || []), ''];
                          setSheetConfig(prev => prev ? {
                            ...prev,
                            columnMapping: { ...prev.columnMapping, snsUrls: newUrls }
                          } : null);
                        }}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm border border-blue-300 rounded"
                      >
                        + SNS 컬럼 추가
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">신청일 컬럼</label>
                    <input
                      type="text"
                      value={sheetConfig.columnMapping.applicationDate || ''}
                      onChange={(e) => setSheetConfig(prev => prev ? {
                        ...prev,
                        columnMapping: { ...prev.columnMapping, applicationDate: e.target.value }
                      } : null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="타임스탬프"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">메모 컬럼</label>
                    <input
                      type="text"
                      value={sheetConfig.columnMapping.notes || ''}
                      onChange={(e) => setSheetConfig(prev => prev ? {
                        ...prev,
                        columnMapping: { ...prev.columnMapping, notes: e.target.value }
                      } : null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="개인정보 활용 동의"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>💡 팁:</strong> 시트의 실제 컬럼명을 정확히 입력해주세요. 
                    대소문자와 띄어쓰기도 정확히 일치해야 합니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 신청자 목록 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900">신청자 목록</h4>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : applicants.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            아직 신청자가 없습니다. 데이터 동기화를 실행해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    신청자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연락처
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SNS 계정
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applicants.map((applicant) => (
                  <tr key={applicant.email} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{applicant.name}</div>
                        <div className="text-sm text-gray-500">{applicant.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {applicant.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {applicant.snsProfiles && applicant.snsProfiles.length > 0 ? (
                          applicant.snsProfiles.map((profile, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                profile.platform === 'instagram' 
                                  ? 'bg-pink-100 text-pink-800'
                                  : profile.platform === 'blog'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {profile.platform === 'instagram' ? 'IG' : 
                                 profile.platform === 'blog' ? '블로그' : 'Threads'}
                              </span>
                              <span className="text-sm">
                                {profile.handle ? `@${profile.handle}` : '링크'}
                              </span>
                              {profile.followers && (
                                <span className="text-xs text-gray-500">
                                  {profile.followers.toLocaleString()}
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          // 기존 호환성 유지
                          <div>
                            <div>@{applicant.instagramHandle || '-'}</div>
                            {applicant.followers && (
                              <div className="text-xs text-gray-500">
                                {applicant.followers.toLocaleString()} 팔로워
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={applicant.status}
                        onChange={(e) => updateApplicantStatus(
                          applicant.email, 
                          e.target.value as 'pending' | 'approved' | 'rejected'
                        )}
                        className={`text-sm rounded-full px-3 py-1 font-medium border-0 focus:ring-2 focus:ring-offset-2 ${
                          applicant.status === 'approved' 
                            ? 'bg-green-100 text-green-800 focus:ring-green-500' :
                          applicant.status === 'rejected'
                            ? 'bg-red-100 text-red-800 focus:ring-red-500'
                            : 'bg-yellow-100 text-yellow-800 focus:ring-yellow-500'
                        }`}
                      >
                        <option value="pending">대기</option>
                        <option value="approved">승인</option>
                        <option value="rejected">거부</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedApplicant(applicant);
                            setShowInfluenceVerifier(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          영향력 검증
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          상세보기
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 동기화 로그 */}
      {syncLogs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-md font-semibold text-gray-900">최근 동기화 로그</h4>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {syncLogs.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {log.success ? '✅' : '❌'} 
                      {log.success ? '동기화 성공' : '동기화 실패'}
                    </div>
                    <div className="text-xs text-gray-500">
                      신규: {log.newApplicants}명, 업데이트: {log.updatedApplicants}명
                      {log.errors.length > 0 && ` | 오류: ${log.errors.length}개`}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.lastSyncTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 영향력 검증 모달 */}
      {showInfluenceVerifier && selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedApplicant.name} - SNS 영향력 검증
              </h3>
              <button
                onClick={() => {
                  setShowInfluenceVerifier(false);
                  setSelectedApplicant(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <InfluenceVerifier
                applicantEmail={selectedApplicant.email}
                initialUrls={{
                  instagram: selectedApplicant.snsProfiles?.find(p => p.platform === 'instagram')?.url ||
                    (selectedApplicant.instagramHandle 
                      ? `https://www.instagram.com/${selectedApplicant.instagramHandle.replace('@', '')}`
                      : undefined),
                  naverBlog: selectedApplicant.snsProfiles?.find(p => p.platform === 'blog')?.url,
                  threads: selectedApplicant.snsProfiles?.find(p => p.platform === 'threads')?.url
                }}
                onVerificationComplete={(result: InfluenceVerification) => {
                  console.log('검증 완료:', result);
                  setSuccess(`${selectedApplicant.name}님의 영향력 검증이 완료되었습니다.`);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}