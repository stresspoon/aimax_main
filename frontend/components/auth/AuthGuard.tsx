'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { LoginButton } from './LoginButton';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text mx-auto mb-4"></div>
          <p className="text-text">로그인 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-text/10 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text mb-4">로그인이 필요합니다</h2>
              <p className="text-text/70 mb-6">
                AI 글쓰기 기능을 사용하려면 Google 계정으로 로그인해주세요.
              </p>
              <LoginButton />
              <p className="text-sm text-text/50 mt-4">
                로그인 후 모든 기능을 무료로 이용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}