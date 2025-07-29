-- RLS 롤백 스크립트 (문제 발생 시 사용)
-- 이 스크립트는 RLS 설정으로 인해 애플리케이션이 작동하지 않을 때만 사용하세요

-- =============================================================================
-- 긴급 롤백: 모든 테이블의 RLS 비활성화
-- =============================================================================

-- ⚠️ 경고: 이 스크립트는 보안을 약화시킵니다. 임시로만 사용하세요!

ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sns_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_histories DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 부분 롤백: NextAuth 테이블만 RLS 비활성화 (권장)
-- =============================================================================

-- NextAuth가 정상 작동하도록 관련 테이블만 RLS 비활성화
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 단계적 적용: 중요하지 않은 테이블부터 RLS 비활성화
-- =============================================================================

-- 1단계: 로그 테이블 (데이터 손실 위험 낮음)
-- ALTER TABLE public.sync_logs DISABLE ROW LEVEL SECURITY;

-- 2단계: 메일 히스토리 (복구 가능한 데이터)
-- ALTER TABLE public.mail_histories DISABLE ROW LEVEL SECURITY;

-- 3단계: 선정 결과 (재생성 가능한 데이터)
-- ALTER TABLE public.selection_results DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '⚠️ RLS 롤백이 실행되었습니다';
    RAISE NOTICE '   보안이 약화된 상태이므로 가능한 빨리 RLS를 다시 활성화하세요';
END $$;