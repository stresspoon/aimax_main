from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum

class ContentType(str, Enum):
    INFORMATIONAL = "informational"
    SALES = "sales"

class ContentGenerationRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500, description="키워드 또는 주제")
    title: str = Field(..., min_length=1, max_length=200, description="SEO 최적화된 제목")
    content_type: ContentType = Field(..., description="글의 성격 (정보성 또는 판매성)")
    primary_keyword: str = Field(..., min_length=1, max_length=100, description="핵심 키워드")
    sub_keywords: List[str] = Field(..., min_items=3, description="보조 키워드 (최소 3개)")
    
    @validator('sub_keywords')
    def validate_sub_keywords(cls, v):
        if len([k for k in v if k.strip()]) < 3:
            raise ValueError('보조 키워드는 최소 3개 이상 입력해야 합니다.')
        return [k.strip() for k in v if k.strip()]

class ContentSections(BaseModel):
    introduction: str = Field(..., description="도입부")
    body: List[str] = Field(..., description="본문 섹션들")
    conclusion: str = Field(..., description="결론")

class SEOMetrics(BaseModel):
    seo_score: int = Field(..., ge=0, le=100, description="SEO 점수 (0-100)")
    keyword_density: float = Field(..., ge=0, le=100, description="키워드 포함률 (%)")
    readability_score: int = Field(..., ge=0, le=100, description="가독성 점수")

class ContentGenerationResponse(BaseModel):
    title: str = Field(..., description="최종 제목")
    outline: List[str] = Field(..., description="목차")
    sections: ContentSections = Field(..., description="섹션별 내용")
    meta_description: str = Field(..., max_length=160, description="메타 설명")
    seo_metrics: SEOMetrics = Field(..., description="SEO 지표")
    total_char_count: int = Field(..., description="총 글자 수")
    generation_time: float = Field(..., description="생성 소요 시간 (초)")

class TitleGenerationRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500, description="키워드 또는 주제")

class TitleGenerationResponse(BaseModel):
    title: str = Field(..., description="생성된 SEO 제목")
    generation_time: float = Field(..., description="생성 소요 시간 (초)")

class KeywordRecommendationRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500, description="주제")

class KeywordRecommendationResponse(BaseModel):
    primary_keyword: str = Field(..., description="추천 핵심 키워드")
    sub_keywords: List[str] = Field(..., description="추천 보조 키워드")