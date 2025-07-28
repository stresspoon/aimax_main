# Technical Requirements Document (TRD)

## 1. Executive Technical Summary
- **프로젝트 개요**  
  웹 기반 SaaS 형태의 체험단 자동화 시스템.  
  Frontend는 Next.js 기반 SPA, Backend는 Node.js(Express) 단일 서비스로 구현.  
  Google Sheets API·OAuth2로 신청 데이터 수집, Redis 기반 큐로 배치 처리, SNS API/크롤링으로 영향력 검증, SendGrid(AWS SES)로 메일 발송.  
- **핵심 기술 스택**  
  Frontend: Next.js + Tailwind CSS  
  Backend: Node.js + Express + Prisma ORM  
  DB: PostgreSQL, Cache/Queue: Redis + Bull  
  메일: SendGrid (AWS SES 대안)  
  인프라: Docker, AWS(EKS/ECR) 또는 GCP(GKE) + Kubernetes  
- **주요 기술 목표**  
  ·평균 응답 시간 ≤ 2초  
  ·동시 신청자 처리 100명/분 이상  
  ·메일 발송 성공률 ≥ 99.5%  
  ·시스템 가동률 ≥ 99.9%  
- **핵심 가정**  
  ·Google API 호출 할당량 충분  
  ·SNS 크롤링 및 API 호출 지연 허용 범위 내  
  ·단일 서비스로 시작 후 확장 필요시 마이크로서비스 전환 가능

## 2. Tech Stack

| Category        | Technology / Library       | Reasoning (선택 근거)                                       |
| --------------- | -------------------------- | ----------------------------------------------------------- |
| Frontend        | Next.js                    | SSR/SSG 지원으로 초기 로딩 및 SEO 최적화, React 생태계 활용 |
| Styling         | Tailwind CSS               | 유연한 유틸리티 클래스, 빠른 UI 구현                        |
| Backend         | Node.js + Express          | 가벼운 REST API 서버, 개발 생산성 및 커뮤니티 지원          |
| ORM             | Prisma                     | 타입 안전성, 직관적 쿼리 빌더, 마이그레이션 지원           |
| Database        | PostgreSQL                 | ACID 보장, JSONB 지원, 확장성                             |
| Cache / Queue   | Redis + Bull               | 빠른 캐싱, 안정적 작업 큐 관리                             |
| 메일 발송       | SendGrid (AWS SES)         | 신뢰도 높은 트랜잭션 메일, API 기반 대량 발송              |
| 인증·인가       | OAuth2 (Google), JWT       | 구글 로그인 간편화, 토큰 기반 세션 관리                    |
| SNS 검증        | Puppeteer / axios 크롤링   | 비공개 API 지원 시 헤드리스 브라우저 크롤링, API 호출 혼용 |
| 인프라·배포     | Docker, Kubernetes (EKS/GKE)| 컨테이너화·오케스트레이션, 자동 확장 및 롤링 업데이트      |
| 모니터링        | Prometheus + Grafana       | 메트릭 수집·시각화, 알림 설정 가능                         |
| 로깅·추적       | ELK Stack (Elasticsearch, Kibana, Logstash) | 중앙 집중형 로그 관리 및 분석              |

## 3. System Architecture Design

### Top-Level 빌딩 블록
- **Frontend (Next.js)**
  - 페이지 라우팅, OAuth2 로그인, 대시보드 UI  
- **Backend API (Express)**
  - RESTful 엔드포인트, 인증·인가, 비즈니스 로직  
- **Job Queue (Bull on Redis)**
  - Google Sheets 동기화, SNS 검증, 메일 발송 작업 스케줄링  
- **Database (PostgreSQL)**
  - 신청자·결과·로그 등 주요 데이터 저장  
- **Cache (Redis)**
  - API 호출 속도 개선, 자격 검증 임시 저장  
- **External Services**
  - Google Sheets API, SNS 크롤링, SendGrid API  
- **Infra & Monitoring**
  - Kubernetes 클러스터, Prometheus·Grafana 모니터링, ELK 로깅  

### Top-Level Component Interaction Diagram
```mermaid
graph TD
    A[사용자(UI)] --> B[Next.js Frontend]
    B --> C[Express Backend]
    C --> D[PostgreSQL]
    C --> E[Redis/Bull Queue]
    E --> F[작업 Worker]
    F --> G[Google Sheets API]
    F --> H[SNS 크롤러/API]
    F --> I[SendGrid API]
    C --> J[Prometheus/Grafana]
    C --> K[ELK Stack]
```

- 사용자(UI) → Next.js → Express API 요청  
- Express → PostgreSQL/Redis로 데이터 저장 및 캐싱  
- Express → Bull Queue에 백그라운드 작업 추가  
- Worker → Google Sheets, SNS, SendGrid 외부 API 호출  
- 시스템 메트릭 및 로그 → Prometheus/Grafana, ELK로 수집  

### Code Organization & Convention

**도메인 주도 설계(DDD) 전략**  
- Domain Separation: `auth`, `sheet`, `snsValidation`, `mail`, `dashboard` 등  
- Layer-Based Architecture:  
  ·presentation (Controller)  
  ·service (비즈니스 로직)  
  ·repository (데이터 액세스)  
  ·infrastructure (외부 API)  
- Feature-Based Modules: 각 도메인별 폴더  
- Shared Components: `utils`, `common`, `types`

**파일·폴더 구조 예시**
```
/src
├── auth
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.repository.ts
├── sheet
│   ├── sheet.controller.ts
│   ├── sheet.service.ts
│   └── sheet.repository.ts
├── snsValidation
│   ├── sns.controller.ts
│   ├── sns.service.ts
│   └── sns.provider.ts
├── mail
│   ├── mail.controller.ts
│   ├── mail.service.ts
│   └── mail.provider.ts
├── dashboard
│   ├── dashboard.controller.ts
│   └── dashboard.service.ts
├── common
│   ├── dto
│   ├── filters
│   ├── interceptors
│   └── utils.ts
├── config
│   └── index.ts
├── jobs
│   ├── sheet.job.ts
│   ├── sns.job.ts
│   └── mail.job.ts
├── prisma
│   └── schema.prisma
└── app.ts
```

### Data Flow & Communication Patterns
- **Client-Server Communication**  
  RESTful JSON API, JWT 인증 헤더 사용  
- **Database Interaction**  
  Prisma ORM, connection pool 관리  
- **External Service Integration**  
  Google Sheets API (OAuth2 토큰 재사용), SNS 크롤링(Headless Chrome/Puppeteer + axios)  
- **Background Job Processing**  
  Bull 큐를 통한 작업 스케줄링 및 재시도 정책  
- **데이터 동기화**  
  주기적 배치(트리거 방식) + 실시간 웹훅 처리

## 4. Performance & Optimization Strategy
- Redis 캐싱 활용으로 빈번 요청 데이터 응답 속도 향상  
- DB 인덱스 최적화 및 Prisma 쿼리 튜닝  
- Bull 큐 동시 처리(worker concurrency) 조정  
- HTTP Keep-Alive, Gzip 압축, CDN 활용으로 Frontend 정적 리소스 최적화  

## 5. Implementation Roadmap & Milestones

### Phase 1: Foundation (MVP 구현, 4주)
- Core Infrastructure: Docker · Kubernetes 클러스터 구성, CI/CD 파이프라인  
- Essential Features: Google Sheets 연동, 신청 데이터 수집 모듈  
- Basic Security: OAuth2 로그인, JWT 인증  
- Development Setup: 코드베이스 구조, Prisma 마이그레이션  
- Timeline: 4주

### Phase 2: Feature Enhancement (기능 확장, 4주)
- SNS 영향력 검증: 크롤링 및 API 연동 구현  
- 메일 발송 시스템: Bull 스케줄러 + SendGrid 연동  
- 대시보드 기본: 신청·선정 현황 조회 UI  
- 보안 강화: HTTPS, CSP, 입력 검증  
- Monitoring: Prometheus·Grafana·ELK 세팅  
- Timeline: 4주

### Phase 3: Scaling & Optimization (최적화·확장, 5주)
- 멀티테넌트 지원: 브랜드별 DB 스키마 분리 또는 논리 분리  
- 성능 튜닝: Auto-scaling, HPA 설정, Redis 클러스터링  
- 고급 대시보드: 필터·차트·리포트  
- 규제 준수: GDPR, 개인정보보호법 감사 로그  
- Timeline: 5주

## 6. Risk Assessment & Mitigation Strategies

### Technical Risk Analysis
- 기술 리스크: SNS API 제한 → 크롤링 병행, 요청 레이트 리밋 준수  
- 성능 리스크: 동시 처리 한계 → 큐 동시성 조정, 오토스케일링  
- 보안 리스크: 토큰 탈취 → HTTPS, JWT 만료·리프레시 정책  
- 통합 리스크: Google API 오류 → 재시도 및 백오프 로직, 로컬 동기화  

### Project Delivery Risks
- 일정 리스크: 외부 API 연동 지연 → 초기 프로토콜 스펙 확정, 대체 경로 확보  
- 자원 리스크: 전문 인력 부족 → 외부 컨설팅, 온보딩 문서화  
- 품질 리스크: 테스트 커버리지 부족 → E2E·단위 테스트 자동화  
- 배포 리스크: 롤백 계획 부재 → 카나리 배포, Helm 차트 기반 버전 관리  
- 비상 계획: 핵심 모듈 이슈 시 수동 운영 가이드 제공, 임시 백업·복구 절차 마련