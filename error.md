# TypeScript "Cannot find name 'seoMetrics'" 오류 완벽 해결 가이드

에러 로그를 보면 `app/ai-writing/page.tsx` 파일의 **542번째 줄**에서 `seoMetrics` 변수를 찾을 수 없다는 TypeScript 컴파일 오류가 발생하고 있습니다[1][2].

## 문제 원인 분석

**핵심 문제**: 코드에서 `seoMetrics.seo_score`에 접근하려고 하지만, `seoMetrics` 변수가 **해당 스코프에서 선언되지 않았거나** **접근할 수 없는 위치**에 있어 TypeScript가 다음과 같은 오류를 발생시킵니다:

```
Type error: Cannot find name 'seoMetrics'.
```

이는 **변수 스코프 문제**[3][4], **state 초기화 문제**[5][6], 또는 **변수 선언 누락**[7][8]에서 발생하는 일반적인 TypeScript 오류입니다.

## 즉시 해결 방법

### 1단계: seoMetrics 변수 선언 확인

`seoMetrics` 변수가 올바르게 선언되었는지 확인하세요:

```typescript
// ❌ 문제가 되는 코드

  {seoMetrics.seo_score}점  // seoMetrics가 정의되지 않음


// ✅ 수정 방법 1: useState로 상태 선언
const [seoMetrics, setSeoMetrics] = useState(null);

// ✅ 수정 방법 2: 기본값으로 초기화
const [seoMetrics, setSeoMetrics] = useState({
  seo_score: 0
});
```

### 2단계: 안전한 접근 방식 적용

변수가 `undefined`일 가능성을 고려하여 안전하게 접근하세요[9][10]:

```typescript
// 옵셔널 체이닝 사용

  {seoMetrics?.seo_score || 0}점


// 조건부 렌더링 사용
{seoMetrics && (
  
    {seoMetrics.seo_score}점
  
)}

// 기본값 제공

  {seoMetrics?.seo_score ?? 0}점

```

### 3단계: 인터페이스 정의로 타입 안전성 확보

```typescript
// types/seo.ts
interface SEOMetrics {
  seo_score: number;
  readability_score?: number;
  keyword_density?: number;
  meta_description_length?: number;
}

// 컴포넌트에서 사용
const [seoMetrics, setSeoMetrics] = useState(null);
```

## 실제 구현 예시

### AI 글쓰기 페이지에서의 SEO 메트릭스 구현

```typescript
// app/ai-writing/page.tsx
import { useState, useEffect } from 'react';

interface SEOMetrics {
  seo_score: number;
  readability_score: number;
  keyword_density: number;
  meta_description_length: number;
}

export default function AIWritingPage() {
  const [seoMetrics, setSeoMetrics] = useState({
    seo_score: 0,
    readability_score: 0,
    keyword_density: 0,
    meta_description_length: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // SEO 메트릭스 계산 함수
  const calculateSEOMetrics = async (content: string) => {
    try {
      // API 호출 또는 로컬 계산
      const response = await fetch('/api/seo-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      const metrics = await response.json();
      setSeoMetrics(metrics);
    } catch (error) {
      console.error('SEO 분석 실패:', error);
      // 오류 시 기본값 유지
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
      {/* SEO 점수 표시 */}
      
        
          
            {isLoading ? (
              계산 중...
            ) : (
              `${seoMetrics.seo_score}점`
            )}
          
          SEO 점수
        
        
        {/* 추가 메트릭스 */}
        {!isLoading && (
          
            
              {seoMetrics.readability_score}
              가독성
            
            
              {seoMetrics.keyword_density}%
              키워드 밀도
            
          
        )}
      
    
  );
}
```

## 고급 해결책

### 1. Context를 활용한 전역 SEO 상태 관리

```typescript
// contexts/SEOContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface SEOContextType {
  seoMetrics: SEOMetrics | null;
  updateSEOMetrics: (metrics: SEOMetrics) => void;
  isCalculating: boolean;
}

const SEOContext = createContext(undefined);

export function SEOProvider({ children }: { children: ReactNode }) {
  const [seoMetrics, setSeoMetrics] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const updateSEOMetrics = (metrics: SEOMetrics) => {
    setSeoMetrics(metrics);
  };

  return (
    
      {children}
    
  );
}

export function useSEO() {
  const context = useContext(SEOContext);
  if (!context) {
    throw new Error('useSEO must be used within a SEOProvider');
  }
  return context;
}

// 사용 예시
function SEOScoreDisplay() {
  const { seoMetrics, isCalculating } = useSEO();
  
  if (isCalculating) {
    return SEO 점수 계산 중...;
  }
  
  return (
    
      {seoMetrics?.seo_score || 0}점
    
  );
}
```

### 2. Custom Hook을 활용한 SEO 로직 분리

```typescript
// hooks/useSEOAnalysis.ts
import { useState, useCallback } from 'react';

interface UseSEOAnalysisReturn {
  seoMetrics: SEOMetrics | null;
  isAnalyzing: boolean;
  error: string | null;
  analyzeSEO: (content: string) => Promise;
  resetMetrics: () => void;
}

export function useSEOAnalysis(): UseSEOAnalysisReturn {
  const [seoMetrics, setSeoMetrics] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const analyzeSEO = useCallback(async (content: string) => {
    if (!content.trim()) {
      setError('분석할 내용이 없습니다.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 로컬 SEO 분석 로직
      const wordCount = content.split(/\s+/).length;
      const readabilityScore = calculateReadability(content);
      const keywordDensity = calculateKeywordDensity(content);
      
      const metrics: SEOMetrics = {
        seo_score: Math.min(100, Math.max(0, 
          (readabilityScore * 0.4) + 
          (keywordDensity * 0.3) + 
          (wordCount > 300 ? 30 : wordCount / 10)
        )),
        readability_score: readabilityScore,
        keyword_density: keywordDensity,
        meta_description_length: content.substring(0, 160).length
      };

      setSeoMetrics(metrics);
    } catch (err) {
      setError('SEO 분석 중 오류가 발생했습니다.');
      console.error('SEO Analysis Error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const resetMetrics = useCallback(() => {
    setSeoMetrics(null);
    setError(null);
  }, []);

  return {
    seoMetrics,
    isAnalyzing,
    error,
    analyzeSEO,
    resetMetrics
  };
}

// 헬퍼 함수들
function calculateReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).length;
  const words = text.split(/\s+/).length;
  const avgWordsPerSentence = words / sentences;
  
  // 간단한 가독성 점수 (Flesch Reading Ease 근사치)
  return Math.max(0, Math.min(100, 100 - (avgWordsPerSentence * 1.5)));
}

function calculateKeywordDensity(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  
  // 가장 빈번한 단어의 밀도 계산
  const wordFreq: Record = {};
  words.forEach(word => {
    if (word.length > 3) { // 3글자 이상만 카운트
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  const maxFreq = Math.max(...Object.values(wordFreq));
  return Math.round((maxFreq / wordCount) * 100 * 100) / 100;
}
```

## 예방 및 모범 사례

### 1. TypeScript 설정 강화

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 2. ESLint 규칙 추가

```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-undefined-expression": "error",
    "prefer-const": "error"
  }
}
```

### 3. 컴포넌트 테스트

```typescript
// __tests__/SEOMetrics.test.tsx
import { render, screen } from '@testing-library/react';
import { SEOProvider } from '../contexts/SEOContext';
import SEOScoreDisplay from '../components/SEOScoreDisplay';

describe('SEO Metrics', () => {
  it('should display default score when no metrics available', () => {
    render(
      
        
      
    );
    
    expect(screen.getByText('0점')).toBeInTheDocument();
  });
});
```

## 문제 해결 체크리스트

- [ ] **seoMetrics 변수가 컴포넌트 스코프에서 선언**되어 있는지 확인
- [ ] **useState 또는 다른 상태 관리 방법**으로 초기화되었는지 확인
- [ ] **옵셔널 체이닝(?.)을 사용**하여 안전하게 접근하는지 확인
- [ ] **TypeScript 인터페이스**로 타입이 정의되어 있는지 확인
- [ ] **조건부 렌더링**으로 undefined 상태를 처리하는지 확인
- [ ] **기본값 제공**으로 사용자 경험을 개선했는지 확인

이 가이드를 따라 수정하면 **Vercel 배포 시 발생하는 `seoMetrics` 변수 미정의 오류가 완전히 해결**되고, 견고하고 타입 안전한 SEO 분석 기능을 구현할 수 있습니다[1][7][8].

[1] https://dev.to/turingvangisms/ts2304-cannot-find-name-0-8hf
[2] https://stackoverflow.com/questions/71321864/typescript-cannot-find-name-variable-in-react
[3] https://www.reddit.com/r/reactjs/comments/wrsq7l/cannot_find_name_although_its_not_referenced/
[4] https://stackoverflow.com/questions/73408579/cannot-find-name-although-its-not-referenced-typescript
[5] https://dev.to/dwjohnston/react-usestate-argument-of-type-string-is-not-assignable-to-parameter-of-type-setstateaction-undefined-27po
[6] https://www.youtube.com/watch?v=0YDW9-b-tJQ
[7] https://www.webdevtutor.net/blog/typescript-cannot-find-name-variable
[8] https://hatchjs.com/typescript-cannot-find-name/
[9] https://stackoverflow.com/questions/78405111/nextjs-typescript-object-is-possibly-undefined-nextjs-build-failure
[10] https://stackoverflow.com/questions/68629621/nextjs-typescript-object-is-possibly-undefined-after-guard
[11] https://www.youtube.com/watch?v=JtQo1OEJcRc
[12] https://www.youtube.com/watch?v=_2i21WigTN0
[13] https://www.youtube.com/watch?v=YIDJIcKImpM
[14] https://github.com/dotansimha/graphql-code-generator/issues/7791
[15] https://stackoverflow.com/questions/70426863/how-to-make-typescript-know-my-variable-is-not-undefined-anymore
[16] https://www.zipy.ai/blog/debug-react-native-undefined-variable-in-jsx-error
[17] https://4sii.tistory.com/350
[18] https://dev.to/krzysztofzuraw/how-to-type-nextjs-env-variables-in-typescript-50cg
[19] https://www.youtube.com/watch?v=b7FortjAvck
[20] https://stackoverflow.com/questions/69461972/typescript-says-nextjs-environment-variables-are-undefined
[21] https://www.youtube.com/watch?v=k_jmOhB20us
[22] https://www.youtube.com/watch?v=jETNVyeF1ao
[23] https://javascript.plainenglish.io/typescript-cannot-find-name-require-8e327dde6363
[24] https://han-joon-hyeok.github.io/posts/next-js-env-variable-undefined-with-docker/
[25] https://stackoverflow.com/questions/51378195/error-coming-when-using-the-state-value-in-react-using-typescript?rq=4
[26] https://www.reddit.com/r/reactjs/comments/q6ztlz/const_variable_in_an_inner_scope_is_undefined/
[27] https://github.com/vercel/next.js/discussions/37174
[28] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined
[29] https://uncertainty.oopy.io/cannot-find-name-div_replace_insert-cannot-find-module
[30] https://stackoverflow.com/questions/53361978/react-js-with-typescript-property-doesnt-exist-on-type-object-error-on-state/53368721
[31] https://github.com/eslint/eslint/issues/13127
[32] https://stackoverflow.com/questions/46987816/using-state-in-react-with-typescript/67851276
[33] https://www.youtube.com/watch?v=7DMnkqVRGZ8
[34] https://stackoverflow.com/questions/53102523/ts-cannot-find-name/53102862
[35] https://www.youtube.com/watch?v=J-3JMgrhPoU&vl=en
[36] https://exploringjs.com/es5/ch16.html
[37] https://blog.stackademic.com/solving-unexpected-errors-in-nest-js-ccb345cf4887?gi=d0b7b8ffec32
[38] https://github.com/preactjs/preact/issues/1880