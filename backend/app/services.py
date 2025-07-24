import google.generativeai as genai
import textstat
import re
import time
from typing import List, Dict, Any
from .config import settings
from .models import (
    ContentGenerationRequest, ContentGenerationResponse, 
    ContentSections, SEOMetrics,
    TitleGenerationRequest, TitleGenerationResponse,
    KeywordRecommendationRequest, KeywordRecommendationResponse
)

class GeminiService:
    def __init__(self):
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.model = genai.GenerativeModel(settings.gemini_model)
        else:
            self.model = None
    
    def _is_configured(self) -> bool:
        return self.model is not None
    
    async def generate_seo_title(self, request: TitleGenerationRequest) -> TitleGenerationResponse:
        start_time = time.time()
        
        if not self._is_configured():
            # 시뮬레이션 모드 (API 키가 없을 때)
            title = f"{request.topic}에 대한 완벽 가이드: 전문가가 알려주는 핵심 포인트"
            generation_time = time.time() - start_time
            return TitleGenerationResponse(title=title, generation_time=generation_time)
        
        prompt = f"""
        다음 주제에 대해 SEO에 최적화된 블로그 제목을 생성해주세요:
        주제: {request.topic}
        
        요구사항:
        1. 제목은 50-60자 이내
        2. 핵심 키워드가 제목 앞부분에 포함
        3. 클릭을 유도하는 매력적인 표현 사용
        4. 검색 의도를 반영한 제목
        5. 한국어로 작성
        
        제목만 출력해주세요.
        """
        
        try:
            response = self.model.generate_content(prompt)
            title = response.text.strip()
            generation_time = time.time() - start_time
            
            return TitleGenerationResponse(
                title=title,
                generation_time=generation_time
            )
        except Exception as e:
            # API 오류 시 시뮬레이션으로 폴백
            title = f"{request.topic}에 대한 완벽 가이드: 전문가가 알려주는 핵심 포인트"
            generation_time = time.time() - start_time
            return TitleGenerationResponse(title=title, generation_time=generation_time)
    
    async def recommend_keywords(self, request: KeywordRecommendationRequest) -> KeywordRecommendationResponse:
        if not self._is_configured():
            # 시뮬레이션 모드
            return KeywordRecommendationResponse(
                primary_keyword=request.topic,
                sub_keywords=[f"{request.topic} 방법", f"{request.topic} 효과", f"{request.topic} 추천"]
            )
        
        prompt = f"""
        다음 주제에 대해 SEO 키워드를 추천해주세요:
        주제: {request.topic}
        
        다음 형식으로 응답해주세요:
        핵심키워드: [핵심 키워드 1개]
        보조키워드: [보조 키워드 3개, 쉼표로 구분]
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            
            # 응답 파싱
            lines = text.split('\n')
            primary_keyword = request.topic
            sub_keywords = [f"{request.topic} 방법", f"{request.topic} 효과", f"{request.topic} 추천"]
            
            for line in lines:
                if '핵심키워드:' in line:
                    primary_keyword = line.split(':', 1)[1].strip()
                elif '보조키워드:' in line:
                    sub_keywords = [k.strip() for k in line.split(':', 1)[1].split(',')]
            
            return KeywordRecommendationResponse(
                primary_keyword=primary_keyword,
                sub_keywords=sub_keywords[:3] if len(sub_keywords) >= 3 else sub_keywords + [f"{request.topic} 추천"]
            )
        except Exception:
            # API 오류 시 시뮬레이션으로 폴백
            return KeywordRecommendationResponse(
                primary_keyword=request.topic,
                sub_keywords=[f"{request.topic} 방법", f"{request.topic} 효과", f"{request.topic} 추천"]
            )
    
    async def generate_content(self, request: ContentGenerationRequest) -> ContentGenerationResponse:
        start_time = time.time()
        
        # 컨텐츠 타입별 가이드라인
        guidelines = self._get_content_guidelines(request.content_type.value)
        
        if not self._is_configured():
            # 시뮬레이션 모드
            return self._generate_simulated_content(request, guidelines, start_time)
        
        # Gemini API로 컨텐츠 생성
        prompt = self._build_content_prompt(request, guidelines)
        
        try:
            response = self.model.generate_content(prompt)
            content_text = response.text.strip()
            
            # 응답 파싱 및 구조화
            sections = self._parse_generated_content(content_text, request)
            
            # SEO 메트릭 계산
            full_content = sections.introduction + ' '.join(sections.body) + sections.conclusion
            seo_metrics = self._calculate_seo_metrics(full_content, request.primary_keyword, request.sub_keywords)
            
            # 목차 생성
            outline = self._generate_outline(sections)
            
            # 메타 설명 생성
            meta_description = self._generate_meta_description(request.title, request.primary_keyword)
            
            generation_time = time.time() - start_time
            
            return ContentGenerationResponse(
                title=request.title,
                outline=outline,
                sections=sections,
                meta_description=meta_description,
                seo_metrics=seo_metrics,
                total_char_count=len(full_content),
                generation_time=generation_time
            )
            
        except Exception:
            # API 오류 시 시뮬레이션으로 폴백
            return self._generate_simulated_content(request, guidelines, start_time)
    
    def _get_content_guidelines(self, content_type: str) -> Dict[str, Any]:
        if content_type == 'informational':
            return {
                'introduction': '정보 제공을 목적으로 한 도입부를 작성합니다.',
                'body_parts': [
                    '주제에 대한 기본 개념 설명',
                    '상세한 방법론 또는 절차',
                    '실제 사례와 예시',
                    '주의사항 및 팁'
                ],
                'conclusion': '정보를 요약하고 독자의 이해를 돕는 결론'
            }
        else:
            return {
                'introduction': '독자의 관심을 끌고 구매 욕구를 자극하는 도입부',
                'body_parts': [
                    '제품/서비스의 핵심 가치 제안',
                    '고객 혜택과 차별점',
                    '사회적 증거와 추천사',
                    '구매 결정을 돕는 FAQ'
                ],
                'conclusion': '구매 유도와 행동 촉구 메시지'
            }
    
    def _build_content_prompt(self, request: ContentGenerationRequest, guidelines: Dict[str, Any]) -> str:
        return f"""
주제: {request.topic}
제목: {request.title}
글의 성격: {request.content_type.value}
핵심 키워드: {request.primary_keyword}
보조 키워드: {', '.join(request.sub_keywords)}

다음 가이드라인에 따라 블로그 글을 작성해주세요:

도입부: {guidelines['introduction']}
본문 구성: {', '.join(guidelines['body_parts'])}
결론: {guidelines['conclusion']}

요구사항:
1. 총 글자 수 1,000자 이상
2. 핵심 키워드를 자연스럽게 본문에 포함
3. 보조 키워드들을 적절히 활용
4. SEO에 최적화된 구조
5. 가독성이 좋은 문장

다음 형식으로 작성해주세요:
[도입부]
(도입부 내용)

[본문1]
(첫 번째 본문 내용)

[본문2]
(두 번째 본문 내용)

[본문3]
(세 번째 본문 내용)

[본문4]
(네 번째 본문 내용)

[결론]
(결론 내용)
"""
    
    def _parse_generated_content(self, content_text: str, request: ContentGenerationRequest) -> ContentSections:
        # 간단한 파싱 로직 (실제로는 더 정교하게 구현)
        sections = content_text.split('[')
        
        introduction = ""
        body = []
        conclusion = ""
        
        for section in sections:
            if section.startswith('도입부]'):
                introduction = section.replace('도입부]', '').strip()
            elif section.startswith('본문'):
                body_content = re.sub(r'본문\d+\]', '', section).strip()
                if body_content:
                    body.append(body_content)
            elif section.startswith('결론]'):
                conclusion = section.replace('결론]', '').strip()
        
        # 파싱 실패 시 기본 구조로 폴백
        if not introduction or not body or not conclusion:
            guidelines = self._get_content_guidelines(request.content_type.value)
            return self._create_fallback_sections(request, guidelines)
        
        return ContentSections(
            introduction=introduction,
            body=body,
            conclusion=conclusion
        )
    
    def _create_fallback_sections(self, request: ContentGenerationRequest, guidelines: Dict[str, Any]) -> ContentSections:
        introduction = f"{request.title}에 대해 알아보겠습니다.\n\n{request.primary_keyword}는 현재 많은 사람들이 관심을 갖고 있는 주제입니다. {guidelines['introduction']}"
        
        body = []
        for i, part in enumerate(guidelines['body_parts']):
            sub_keyword = request.sub_keywords[i] if i < len(request.sub_keywords) else request.sub_keywords[0]
            body_section = f"## {i + 1}. {part}\n\n{request.primary_keyword}와 관련하여 {part}에 대해 상세히 설명드리겠습니다. {sub_keyword}에 대한 내용도 포함하여 독자분들이 실질적인 도움을 받을 수 있도록 작성했습니다.\n\n[구체적인 내용이 여기에 들어갑니다...]"
            body.append(body_section)
        
        conclusion = f"결론적으로, {request.primary_keyword}에 대한 이해를 바탕으로 {guidelines['conclusion']}"
        
        return ContentSections(
            introduction=introduction,
            body=body,
            conclusion=conclusion
        )
    
    def _generate_simulated_content(self, request: ContentGenerationRequest, guidelines: Dict[str, Any], start_time: float) -> ContentGenerationResponse:
        sections = self._create_fallback_sections(request, guidelines)
        
        full_content = sections.introduction + ' '.join(sections.body) + sections.conclusion
        seo_metrics = self._calculate_seo_metrics(full_content, request.primary_keyword, request.sub_keywords)
        outline = self._generate_outline(sections)
        meta_description = self._generate_meta_description(request.title, request.primary_keyword)
        generation_time = time.time() - start_time
        
        return ContentGenerationResponse(
            title=request.title,
            outline=outline,
            sections=sections,
            meta_description=meta_description,
            seo_metrics=seo_metrics,
            total_char_count=len(full_content),
            generation_time=generation_time
        )
    
    def _calculate_seo_metrics(self, content: str, primary_keyword: str, sub_keywords: List[str]) -> SEOMetrics:
        # 키워드 밀도 계산
        total_words = len(content.split())
        primary_count = content.lower().count(primary_keyword.lower())
        sub_count = sum(content.lower().count(keyword.lower()) for keyword in sub_keywords)
        
        keyword_density = ((primary_count * 2 + sub_count) / total_words) * 100 if total_words > 0 else 0
        
        # 가독성 점수 (textstat 사용)
        try:
            readability_score = max(0, min(100, int(textstat.flesch_reading_ease(content))))
        except:
            readability_score = 70  # 기본값
        
        # SEO 점수 계산 (간단한 로직)
        seo_score = 0
        
        # 키워드 밀도 점수 (2-5% 최적)
        if 2 <= keyword_density <= 5:
            seo_score += 30
        elif 1 <= keyword_density < 2 or 5 < keyword_density <= 7:
            seo_score += 20
        elif keyword_density > 0:
            seo_score += 10
        
        # 글자 수 점수
        char_count = len(content)
        if char_count >= 1000:
            seo_score += 25
        elif char_count >= 500:
            seo_score += 15
        
        # 가독성 점수
        if readability_score >= 70:
            seo_score += 25
        elif readability_score >= 50:
            seo_score += 15
        
        # 기본 구조 점수
        seo_score += 20
        
        return SEOMetrics(
            seo_score=min(100, seo_score),
            keyword_density=round(keyword_density, 2),
            readability_score=readability_score
        )
    
    def _generate_outline(self, sections: ContentSections) -> List[str]:
        outline = ["1. 도입부"]
        
        for i, body_section in enumerate(sections.body):
            # 본문에서 헤딩 추출 시도
            lines = body_section.split('\n')
            heading = f"{i + 2}. 본문 {i + 1}"
            for line in lines:
                if line.startswith('##'):
                    heading = line.replace('##', '').strip()
                    break
            outline.append(heading)
        
        outline.append(f"{len(sections.body) + 2}. 결론")
        return outline
    
    def _generate_meta_description(self, title: str, primary_keyword: str) -> str:
        meta = f"{primary_keyword}에 대한 완전한 가이드입니다. {title.split(':')[0]}의 핵심 정보와 실용적인 팁을 제공합니다."
        return meta[:160]  # 160자 제한

# 싱글톤 서비스 인스턴스
gemini_service = GeminiService()