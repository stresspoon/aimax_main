이제 충분한 정보를 수집했으므로, 이 오류의 원인과 해결 방법을 한국어로 상세히 설명하겠습니다.

# Prisma P2003 Foreign Key Constraint 오류 해결 가이드

## 🚨 오류 분석

현재 발생한 오류는 **P2003 Foreign key constraint violated on the constraint: `applicants_campaignId_fkey`** 입니다. 이는 **applicants 테이블에 데이터를 생성할 때, 참조하려는 campaignId가 campaigns 테이블에 존재하지 않아서 발생하는 외래키 제약 조건 위반 오류**입니다[1][2].

## 🔍 문제 원인

### 1. **Campaign 데이터 부재**
가장 가능성이 높은 원인은 **applicants를 생성하려고 하는 campaignId에 해당하는 campaign이 campaigns 테이블에 존재하지 않는 것**입니다[3][4]. 

### 2. **동기화 순서 문제**
Google Sheets에서 데이터를 동기화할 때, campaign 생성보다 applicant 생성이 먼저 실행되어 참조 무결성이 깨진 경우입니다.

### 3. **데이터 타입 불일치**
Prisma가 엄격한 데이터 타입 검사를 수행하기 때문에, campaignId의 데이터 타입이 일치하지 않을 경우에도 이 오류가 발생할 수 있습니다[1].

## 🛠️ 해결 방법

### **방법 1: Campaign 존재 여부 확인 및 생성**

먼저 campaign이 존재하는지 확인하고, 없다면 생성하는 로직을 추가합니다:

```javascript
// upsertApplicant 함수 내에서
async upsertApplicant(applicantData) {
  try {
    // 1. Campaign 존재 여부 확인
    let campaign = await prisma.campaign.findUnique({
      where: { id: applicantData.campaignId }
    });

    // 2. Campaign이 없으면 생성
    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          id: applicantData.campaignId,
          name: `Campaign ${applicantData.campaignId}`, // 기본값
          userId: applicantData.userId, // 현재 사용자 ID
          // 기타 필수 필드들
        }
      });
    }

    // 3. Applicant 생성/업데이트
    const applicant = await prisma.applicant.upsert({
      where: { 
        // unique 필드 조합 사용
        email: applicantData.email 
      },
      update: applicantData,
      create: applicantData
    });

    return applicant;
  } catch (error) {
    console.error('신청자 저장/업데이트 오류:', error);
    throw error;
  }
}
```

### **방법 2: Transaction 사용으로 원자성 보장**

데이터 생성 순서를 보장하기 위해 Prisma Transaction을 사용합니다:

```javascript
async syncApplicants(sheetsData) {
  return await prisma.$transaction(async (tx) => {
    for (const rowData of sheetsData) {
      // 1. Campaign 먼저 upsert
      await tx.campaign.upsert({
        where: { id: rowData.campaignId },
        update: {},
        create: {
          id: rowData.campaignId,
          name: rowData.campaignName || `Campaign ${rowData.campaignId}`,
          userId: rowData.userId,
          // 기타 필수 필드
        }
      });

      // 2. Applicant upsert
      await tx.applicant.upsert({
        where: { email: rowData.email },
        update: rowData,
        create: rowData
      });
    }
  });
}
```

### **방법 3: Cascading Reference 사용**

Prisma 스키마에서 referential action을 설정하여 자동으로 관련 데이터를 관리합니다[2]:

```prisma
model Applicant {
  id         String    @id @default(cuid())
  email      String    @unique
  campaignId String
  
  // onUpdate, onDelete 액션 추가
  campaign   Campaign  @relation(fields: [campaignId], references: [id], onUpdate: Cascade, onDelete: Cascade)
  
  @@map("applicants")
}
```

### **방법 4: 데이터 검증 및 오류 처리 강화**

upsert 실행 전에 데이터 유효성을 검사합니다:

```javascript
async validateAndUpsertApplicant(applicantData) {
  // 1. 필수 데이터 검증
  if (!applicantData.campaignId) {
    throw new Error('Campaign ID가 필요합니다');
  }

  // 2. Campaign 존재 확인
  const campaignExists = await prisma.campaign.findUnique({
    where: { id: applicantData.campaignId },
    select: { id: true } // 성능을 위해 필요한 필드만 조회
  });

  if (!campaignExists) {
    console.warn(`Campaign ${applicantData.campaignId} 존재하지 않음. 생성 중...`);
    
    // 기본 Campaign 생성
    await prisma.campaign.create({
      data: {
        id: applicantData.campaignId,
        name: `Auto-created Campaign ${applicantData.campaignId}`,
        userId: applicantData.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  // 3. Applicant upsert 실행
  return await prisma.applicant.upsert({
    where: { email: applicantData.email },
    update: applicantData,
    create: applicantData
  });
}
```

## 🔧 추가 디버깅 방법

### **1. 데이터베이스 상태 확인**
```sql
-- Supabase SQL Editor에서 실행
SELECT COUNT(*) as campaign_count FROM campaigns;
SELECT id, name FROM campaigns LIMIT 10;
```

### **2. 로깅 강화**
```javascript
console.log('Creating applicant with campaignId:', applicantData.campaignId);
console.log('Available campaigns:', await prisma.campaign.findMany({ select: { id: true } }));
```

### **3. 환경별 처리**
```javascript
// 개발 환경에서는 자동으로 Campaign 생성
if (process.env.NODE_ENV === 'development') {
  // 자동 생성 로직
} else {
  // 운영 환경에서는 에러 발생
  throw new Error(`Campaign ${campaignId} not found`);
}
```

## 💡 예방 전략

1. **데이터 무결성 검증**: API 호출 전에 필수 참조 데이터가 존재하는지 확인
2. **순차적 데이터 생성**: 부모 테이블(Campaign) → 자식 테이블(Applicant) 순서로 데이터 생성
3. **트랜잭션 활용**: 여러 테이블 간 데이터 일관성이 중요한 경우 트랜잭션 사용[4]
4. **스키마 설계 재검토**: 외래키 제약 조건과 cascading 규칙을 명확히 정의

이러한 방법들을 통해 P2003 외래키 제약 조건 위반 오류를 해결하고, 향후 유사한 문제를 예방할 수 있습니다. 가장 중요한 것은 **데이터 생성 순서를 보장하고, 참조 무결성을 유지하는 것**입니다.

[1] https://www.answeroverflow.com/m/1379518297694933012
[2] https://dev.to/codarbind/foreign-key-constraint-failed-on-the-field-prisma--2bl3
[3] https://stackoverflow.com/questions/77942137/why-am-i-getting-a-p2003-foreign-key-constraint-prisma-error
[4] https://stackoverflow.com/questions/67992416/how-can-i-use-createmany-with-foreign-keys-in-prisma
[5] https://stackoverflow.com/questions/77159985/foreign-key-violation-in-prisma-migration-with-postgresql
[6] https://stackoverflow.com/questions/73976222/why-am-i-getting-an-error-trying-to-create-related-records-usingprisma
[7] https://stackoverflow.com/questions/75922940/foreign-key-constraint-on-prisma-model-creation
[8] https://github.com/prisma/prisma/issues/16029
[9] https://community.redwoodjs.com/t/prisma-client-breaks-when-i-add-a-field-to-a-model/2926
[10] https://github.com/prisma/prisma/discussions/12263
[11] https://www.prisma.io/docs/orm/reference/error-reference
[12] https://community.auth0.com/t/prisma-client-as-an-action-dependency-error/97297
[13] https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/relation-mode
[14] https://www.youtube.com/watch?v=NjD6ynUHwIQ
[15] https://stackoverflow.com/questions/76250065/request-error-prismaclientvalidationerror-on-nextjs-13
[16] https://velog.io/@yhko1992/delete%ED%95%A0%EB%95%8C-foreign-key-%EC%97%90%EB%9F%AC
[17] https://www.reddit.com/r/node/comments/19dupks/prisma_foreign_key_constraint_error_after_merging/
[18] https://cloud.tencent.com/developer/ask/sof/107856197
[19] https://wanago.io/2023/06/05/api-nestjs-prisma-postgresql-constraints/
[20] https://stackoverflow.com/questions/72461782/foreign-key-constraint-failed-on-index-field-prisma-delete
[21] https://github.com/prisma/prisma/discussions/22519
[22] https://stackoverflow.com/questions/69886884/unique-constraint-failed-on-the-constraint-user-account-userid-key-in-prisma
[23] https://www.youtube.com/watch?v=quGwl9voB4M
[24] https://stackoverflow.com/questions/71926451/problem-with-prisma-upsert-unkown-argument
[25] https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints
[26] https://cloud.tencent.com/developer/ask/sof/106888772/answer/117066881
[27] https://velog.io/@ckstn0777/Prisma-Schema-%EC%9E%91%EC%84%B1%ED%95%98%EA%B8%B0-feat.-PlantScale
[28] https://stackoverflow.com/questions/74354661/how-to-make-a-foreign-key-within-a-model
[29] https://github.com/prisma/prisma/issues/22778
[30] https://github.com/prisma/prisma/discussions/14874
[31] https://programmer-hoo.tistory.com/99
[32] https://stackoverflow.com/questions/77855868/problem-with-the-next-auth-google-provider-using-prisma-and-mongodb
[33] https://velog.io/@pengoose_dev/Prisma-upsert-%EA%B3%BC%EC%A0%95%EC%97%90%EC%84%9C%EC%9D%98-%EA%B0%84%EB%8B%A8%ED%95%9C-%ED%8A%B8%EB%9F%AC%EB%B8%94%EC%8A%88%ED%8C%85
[34] https://lightrun.com/answers/prisma-prisma-cant-create-a-record-with-only-the-foreign-key-to-another-table
[35] https://github.com/prisma/prisma/issues/4134
[36] https://www.reddit.com/r/node/comments/19dupks/prisma_foreign_key_constraint_error_after_merging/?tl=ko
[37] https://stackoverflow.com/questions/74296827/prisma-insert-foreign-key-referencing-non-existing-record