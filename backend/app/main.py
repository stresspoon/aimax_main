from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .models import (
    ContentGenerationRequest, ContentGenerationResponse,
    TitleGenerationRequest, TitleGenerationResponse,
    KeywordRecommendationRequest, KeywordRecommendationResponse
)
from .services import gemini_service

app = FastAPI(
    title="AIMAX API",
    description="AIMAX: 나만의 AI 비지니스 파트너",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World", "environment": settings.environment}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/generate-title", response_model=TitleGenerationResponse)
async def generate_title(request: TitleGenerationRequest):
    """키워드/주제를 기반으로 SEO 최적화된 제목을 생성합니다."""
    try:
        result = await gemini_service.generate_seo_title(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"제목 생성 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/recommend-keywords", response_model=KeywordRecommendationResponse)
async def recommend_keywords(request: KeywordRecommendationRequest):
    """주제를 기반으로 키워드를 추천합니다."""
    try:
        result = await gemini_service.recommend_keywords(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"키워드 추천 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/generate-content", response_model=ContentGenerationResponse)
async def generate_content(request: ContentGenerationRequest):
    """SEO 기준을 만족하는 블로그 글을 생성합니다."""
    try:
        result = await gemini_service.generate_content(request)
        
        # SEO 기준 검증
        if result.seo_metrics.seo_score < 80:
            raise HTTPException(
                status_code=400, 
                detail=f"SEO 점수가 기준(80점)에 미달합니다. 현재 점수: {result.seo_metrics.seo_score}점"
            )
        
        if result.seo_metrics.keyword_density < 2:
            raise HTTPException(
                status_code=400,
                detail=f"키워드 포함률이 기준(2%)에 미달합니다. 현재 포함률: {result.seo_metrics.keyword_density}%"
            )
        
        if result.total_char_count < 1000:
            raise HTTPException(
                status_code=400,
                detail=f"글자 수가 기준(1,000자)에 미달합니다. 현재 글자 수: {result.total_char_count}자"
            )
        
        if result.generation_time > 60:
            raise HTTPException(
                status_code=400,
                detail=f"생성 시간이 기준(60초)을 초과했습니다. 소요 시간: {result.generation_time:.1f}초"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"콘텐츠 생성 중 오류가 발생했습니다: {str(e)}")