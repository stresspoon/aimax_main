/**
 * 콘텐츠 생성 지침 유틸리티
 * 정보성과 판매성 콘텐츠를 위한 전문 가이드라인
 */

export const INFORMATIONAL_GUIDELINES = {
  role: "SEO 최적화 정보성 콘텐츠 전문가",
  goal: "독자에게 가치 있는 정보를 제공하여 신뢰를 구축하고, 브랜드를 해당 분야의 권위자로 포지셔닝",
  
  structure: {
    title: "핵심 키워드 + 숫자 + 베네핏",
    intro: "250자 - Hook, 이 글을 읽으면 얻는 것, 글의 구성 미리보기",
    body1: "400자 - 기초/원인/이유 (WHY)",
    body2: "400자 - 구체적 방법 1 (HOW)",
    body3: "400자 - 구체적 방법 2 (HOW)",
    body4: "350자 - 주의사항/FAQ (WHAT NOT)",
    conclusion: "250자 - 핵심 요약, 실천 독려, 추가 정보 CTA"
  },
  
  writingPrinciples: {
    tone: "친절한 전문가, 신뢰감 있는 조언자",
    sentence: "간결하고 명확하게, 전문용어는 쉽게 풀어서",
    paragraph: "3-4문장으로 구성, 여백 활용",
    data: "구체적 수치, 연구 결과, 통계 인용"
  },
  
  trustFactors: [
    "연구에 따르면, 전문가들은 등의 권위 활용",
    "구체적 예시와 시나리오 제시",
    "복잡한 개념은 비유로 설명"
  ],
  
  seoStrategy: {
    title: "핵심 키워드 필수 포함",
    subtitles: "키워드 변형 활용",
    body: "자연스러운 맥락에서 3-5회 분산"
  }
};

export const SALES_GUIDELINES = {
  role: "전환율 최적화 세일즈 카피라이터",
  goal: "독자의 감정을 움직이고 즉각적인 행동(구매, 신청, 문의)을 유도하는 설득력 있는 콘텐츠 작성",
  
  structure: {
    headline: "고통 또는 욕망 직격 - 당신의 [고통/욕망], [시간] 안에 해결됩니다",
    problemEmpathy: "250자 - 구체적 상황 묘사로 '이게 내 얘기네' 반응 유도",
    problemAggravation: "300자 - 해결 안 했을 때의 암울한 미래 그리기",
    solution: "400자 - 제품을 구세주처럼 등장, Feature가 아닌 Benefit 중심",
    proof: "350자 - 고객 후기, 판매 실적, 전문가 추천, Before/After 비교",
    offer: "300자 - 가격, 보너스, 보증 조건, 경쟁사 대비 우위",
    urgency: "200자 - 지금 사야 하는 이유, 놓쳤을 때의 후회",
    cta: "100자 - 명확하고 구체적인 행동 지시"
  },
  
  emotionalTouchPoints: [
    "스토리텔링: 성공 사례를 드라마처럼",
    "시각적 언어: 변화를 머릿속에 그리게",
    "파워 워드: 즉시, 보장, 입증된, 독점, 한정"
  ],
  
  psychologyTriggers: {
    lossAversion: "놓치면 후회합니다",
    socialProof: "이미 10,000명이 선택",
    authority: "전문가가 추천하는",
    reciprocity: "특별히 당신에게만"
  },
  
  frameworks: {
    lowAwareness: "AIDA (Attention-Interest-Desire-Action)",
    highAwareness: "PAS (Problem-Agitate-Solution)"
  }
};

/**
 * 콘텐츠 타입에 따른 제목 생성 가이드라인
 */
export function getTitleGuideline(contentType: string, keyword: string, subKeywords: string[]): string {
  if (contentType === 'informational') {
    return `
정보성 제목 생성 지침:
- 형식: "${keyword} + 숫자 + 베네핏"
- 예시: "${keyword} 완벽 가이드 7단계", "${keyword} 핵심 정리 5가지"
- 독자가 얻을 수 있는 구체적 가치를 명시
- 보조 키워드 자연스럽게 포함: ${subKeywords.join(', ')}
- 신뢰감을 주는 단어 사용: 완벽, 전문가, 검증된, 실전
`;
  } else {
    return `
판매성 제목 생성 지침:
- 형식: "고통/욕망 직격 + 해결 시간"
- 예시: "${keyword}로 고민 끝! 7일 만에 변화", "더 이상 ${keyword} 때문에 스트레스받지 마세요"
- 독자의 감정을 즉시 자극
- 보조 키워드로 구체적 베네핏 강조: ${subKeywords.join(', ')}
- 파워 워드 사용: 즉시, 보장, 한정, 독점, 입증된
`;
  }
}

/**
 * 콘텐츠 타입에 따른 키워드 추천 가이드라인
 */
export function getKeywordGuideline(contentType: string, topic: string): string {
  if (contentType === 'informational') {
    return `
정보성 키워드 추천 지침:
주제: ${topic}

다음 기준으로 키워드를 추천하세요:
1. 핵심 키워드: 주제의 핵심 개념 (검색량 높은 것)
2. 보조 키워드 6개:
   - WHY 키워드: 이유, 원인, 중요성 관련
   - HOW 키워드: 방법, 단계, 팁 관련  
   - WHAT 키워드: 정의, 종류, 특징 관련
   - 관련 전문용어 2개
   - 타겟 독자 관련 키워드 1개

각 키워드는 SEO 점수 80점 이상을 보장하도록 선정하세요.
`;
  } else {
    return `
판매성 키워드 추천 지침:
제품/서비스: ${topic}

다음 기준으로 키워드를 추천하세요:
1. 핵심 키워드: 제품/서비스의 핵심 기능
2. 보조 키워드 6개:
   - 고객 고통점 키워드: 문제, 고민, 스트레스 관련
   - 해결책 키워드: 솔루션, 방법, 효과 관련
   - 베네핏 키워드: 혜택, 결과, 변화 관련
   - 경쟁 우위 키워드: 독특함, 차별점 관련
   - 행동 유도 키워드: 구매, 신청, 시작 관련
   - 신뢰도 키워드: 보장, 검증, 추천 관련

전환율 향상을 위한 감정적 어필이 가능한 키워드로 선정하세요.
`;
  }
}

/**
 * 콘텐츠 타입에 따른 본문 생성 가이드라인
 */
export function getContentGuideline(contentType: string, title: string, primaryKeyword: string, subKeywords: string[]): string {
  const baseGuideline = `
제목: ${title}
핵심 키워드: ${primaryKeyword}
보조 키워드: ${subKeywords.join(', ')}

총 글자 수: 2000-3000자 분량의 상세하고 유용한 콘텐츠
`;

  if (contentType === 'informational') {
    return baseGuideline + `
정보성 콘텐츠 생성 지침:

당신은 'SEO 최적화 정보성 콘텐츠 전문가'입니다.

구조:
1. 도입부(400-500자): 
   - 강력한 첫 문장으로 독자 관심 포착
   - 이 글을 읽으면 얻을 수 있는 구체적 가치 제시
   - 글의 구성 미리보기
   - 핵심 키워드 2-3회 자연스럽게 포함

2. 본문 3개 섹션(각 800-1000자):
   섹션1 - 기초/원인/이유 (WHY): 
   - ${subKeywords[0] || '기본 개념'} 중심 설명
   - 구체적 데이터와 연구 결과 인용
   - 전문용어는 쉽게 풀어서 설명
   
   섹션2 - 구체적 방법 1 (HOW):
   - ${subKeywords[1] || '실용적 방법'} 중심 설명  
   - 단계별 실행 방법 제시
   - 실제 예시와 시나리오 포함
   
   섹션3 - 구체적 방법 2 (HOW):
   - ${subKeywords[2] || '고급 팁'} 중심 설명
   - 주의사항과 FAQ 포함
   - 실패 사례와 해결법 제시

3. 결론(300-400자):
   - 핵심 내용 명확한 요약
   - 오늘 당장 실천할 수 있는 액션 1가지 제시
   - 추가 정보 탐색 유도

작성 원칙:
- 톤: 친절한 전문가, 신뢰감 있는 조언자
- 권위 활용: "연구에 따르면", "전문가들은" 등
- 복잡한 개념은 비유로 설명
- 각 섹션마다 실용적 팁 1개 이상 포함
`;
  } else {
    return baseGuideline + `
판매성 콘텐츠 생성 지침:

당신은 '전환율 최적화 세일즈 카피라이터'입니다.

구조 (PAS 프레임워크 적용):
1. 문제 공감(400-500자):
   - 타겟 고객의 구체적 고통 상황 묘사
   - "이게 내 얘기네" 반응 유도
   - ${subKeywords[0] || '고객 고통점'} 키워드 활용

2. 문제 심화 및 해결책 제시(1200-1500자):
   섹션1 - 문제 심화:
   - 해결하지 않았을 때의 암울한 미래
   - ${subKeywords[1] || '문제점'} 구체적 사례
   - 감정적 스트레스 극대화
   
   섹션2 - 해결책 등장:
   - 제품/서비스를 구세주처럼 소개
   - ${subKeywords[2] || '해결책'} 중심 베네핏 강조
   - Feature가 아닌 Benefit 중심 설명
   
   섹션3 - 증거 제시:
   - 고객 후기와 성공 사례
   - Before/After 극적 비교
   - 판매 실적, 전문가 추천

3. 행동 유도(400-500자):
   - 특별한 오퍼와 보너스 제시
   - 희소성/긴급성 부여
   - 명확하고 강력한 CTA
   - 리스크 제거 (환불 보장 등)

작성 원칙:
- 감정적 어필 극대화
- 파워 워드 적극 활용: 즉시, 보장, 입증된, 독점, 한정
- 스토리텔링으로 몰입도 증대
- 심리 트리거 활용: 손실 회피, 사회적 증거, 권위, 호혜성
`;
  }
}