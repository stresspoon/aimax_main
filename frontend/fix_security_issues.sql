-- Supabase Security Advisor 문제 해결 스크립트
-- 1. RLS(Row-Level Security) 활성화
-- 2. 보안 정책 설정  
-- 3. 함수 보안 문제 해결

-- =============================================================================
-- 1단계: 모든 테이블에 RLS 활성화
-- =============================================================================

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sns_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_histories ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2단계: NextAuth 관련 테이블 정책 설정 (가장 중요!)
-- =============================================================================

-- Users 테이블 정책
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
CREATE POLICY "Service role can manage users" 
ON public.users FOR ALL 
TO service_role 
USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid()::text = id);

-- Accounts 테이블 정책 (NextAuth OAuth 계정)
DROP POLICY IF EXISTS "Service role can manage accounts" ON public.accounts;
CREATE POLICY "Service role can manage accounts" 
ON public.accounts FOR ALL 
TO service_role 
USING (true);

-- Sessions 테이블 정책 (NextAuth 세션)
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.sessions;
CREATE POLICY "Service role can manage sessions" 
ON public.sessions FOR ALL 
TO service_role 
USING (true);

-- =============================================================================
-- 3단계: 애플리케이션 데이터 테이블 정책 설정
-- =============================================================================

-- Campaigns 테이블 정책 (사용자는 자신의 캠페인만 접근)
DROP POLICY IF EXISTS "Users can manage own campaigns" ON public.campaigns;
CREATE POLICY "Users can manage own campaigns" 
ON public.campaigns FOR ALL 
TO authenticated 
USING (auth.uid()::text = "userId");

-- Applicants 테이블 정책 (캠페인 소유자만 접근)
DROP POLICY IF EXISTS "Users can manage applicants in own campaigns" ON public.applicants;
CREATE POLICY "Users can manage applicants in own campaigns" 
ON public.applicants FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = applicants."campaignId" 
    AND campaigns."userId" = auth.uid()::text
  )
);

-- SNS Profiles 테이블 정책 (신청자 소유자만 접근)
DROP POLICY IF EXISTS "Users can manage sns_profiles in own campaigns" ON public.sns_profiles;
CREATE POLICY "Users can manage sns_profiles in own campaigns" 
ON public.sns_profiles FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.applicants 
    JOIN public.campaigns ON applicants."campaignId" = campaigns.id
    WHERE applicants.id = sns_profiles."applicantId" 
    AND campaigns."userId" = auth.uid()::text
  )
);

-- Selection Results 테이블 정책 (캠페인 소유자만 접근)
DROP POLICY IF EXISTS "Users can manage selection_results in own campaigns" ON public.selection_results;
CREATE POLICY "Users can manage selection_results in own campaigns" 
ON public.selection_results FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = selection_results."campaignId" 
    AND campaigns."userId" = auth.uid()::text
  )
);

-- Mail Histories 테이블 정책 (캠페인 소유자만 접근)
DROP POLICY IF EXISTS "Users can manage mail_histories in own campaigns" ON public.mail_histories;
CREATE POLICY "Users can manage mail_histories in own campaigns" 
ON public.mail_histories FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = mail_histories."campaignId" 
    AND campaigns."userId" = auth.uid()::text
  )
);

-- Sync Logs 테이블 정책 (모든 인증된 사용자가 접근 가능)
DROP POLICY IF EXISTS "Authenticated users can view sync_logs" ON public.sync_logs;
CREATE POLICY "Authenticated users can view sync_logs" 
ON public.sync_logs FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Service role can manage sync_logs" ON public.sync_logs;
CREATE POLICY "Service role can manage sync_logs" 
ON public.sync_logs FOR ALL 
TO service_role 
USING (true);

-- =============================================================================
-- 4단계: 함수 보안 문제 해결
-- =============================================================================

-- update_updated_at_column 함수 보안 강화
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 함수에 적절한 권한 부여
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- =============================================================================
-- 5단계: Service Role에 필요한 권한 부여
-- =============================================================================

-- 모든 테이블에 대한 service_role 권한 부여 (API에서 사용)
GRANT ALL ON public.campaigns TO service_role;
GRANT ALL ON public.applicants TO service_role;
GRANT ALL ON public.sns_profiles TO service_role;
GRANT ALL ON public.selection_results TO service_role;
GRANT ALL ON public.mail_histories TO service_role;
GRANT ALL ON public.sync_logs TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.accounts TO service_role;
GRANT ALL ON public.sessions TO service_role;

-- 시퀀스에 대한 권한도 부여
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================================================
-- 6단계: 익명 사용자 정책 (필요한 경우)
-- =============================================================================

-- 만약 익명 접근이 필요한 경우 (예: 회원가입 전 데이터 확인)
-- 현재는 모든 접근을 인증된 사용자로 제한

-- =============================================================================
-- 완료 메시지
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Supabase Security Advisor 문제 해결 완료';
    RAISE NOTICE '   - RLS가 모든 테이블에 활성화됨';
    RAISE NOTICE '   - 사용자별 데이터 접근 정책 설정 완료';
    RAISE NOTICE '   - NextAuth 테이블 정책 설정 완료';  
    RAISE NOTICE '   - 함수 보안 문제 해결 완료';
    RAISE NOTICE '   - Service Role 권한 설정 완료';
END $$;