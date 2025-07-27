# NextAuth TypeScript "Property 'id' does not exist" 오류 완벽 해결 가이드

**핵심 문제**: `session.user.id = token.sub;` 코드에서 **TypeScript가 `session.user` 객체에 `id` 속성이 없다고 판단**하여 컴파일 오류가 발생하고 있습니다. 이는 NextAuth의 기본 타입 정의에서 `session.user`가 `id` 속성을 포함하지 않기 때문입니다.

## 문제 원인 분석

NextAuth의 기본 `Session` 인터페이스에서 `user` 객체는 다음과 같이 정의되어 있습니다[1][2]:

```typescript
interface DefaultSession {
  user?: {
    name?: string | null
    email?: string | null  
    image?: string | null
  }
}
```

`id` 속성이 포함되어 있지 않아 TypeScript 컴파일러가 오류를 발생시킵니다[3][4].

## 즉시 1. Module Augmentation을 통한 타입 확장

**가장 권장되는 방법**입니다. 프로젝트 루트에 `next-auth.d.ts` 파일을 생성하세요[5][6]:

```typescript
// next-auth.d.ts (프로젝트 루트)
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's unique identifier. */
      id: string
    } & DefaultSession["user"]
  }
}
```

### 2. tsconfig.json 설정 확인

`tsconfig.json`에서 타입 정의 파일이 포함되도록 설정하세요[6][7]:

```json
{
  "compilerOptions": {
    // ... 기타 옵션들
  },
  "include": [
    "next-env.d.ts", 
    "types/**/*.ts",
    "**/*.ts", 
    "**/*.tsx",
    "next-auth.d.ts"  // 명시적으로 포함
  ]
}
```

### 3. lib/auth.ts 파일 수정

session 콜백에서 올바른 방식으로 `id`를 할당하세요[8][9]:

```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;  // ✅ 이제 타입 오류 없음
      }
      return session;
    },
  },
}

export default NextAuth(authOptions)
```

## 고급 해결책

### 완전한 타입 안전성을 위한 확장된 설정

더 포괄적인 타입 정의를 원한다면 다음과 같이 설정하세요[10]:

```typescript
// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      // 추가 속성들을 여기에 정의
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    // User 객체에 추가 속성이 필요한 경우
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    // JWT 토큰에 추가 속성이 필요한 경우
  }
}
```

### JWT 콜백과 함께 사용하는 완전한 예시

```typescript
// lib/auth.ts
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 첫 번째 로그인 시 user 정보를 token에 저장
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // token의 정보를 session에 전달
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
}
```

## 문제 해결 체크리스트

- [ ] **`next-auth.d.ts` 파일이 프로젝트 루트에 생성**되어 있는지 확인
- [ ] **tsconfig.json에서 해당 파일이 include**되어 있는지 확인  
- [ ] **타입 정의에서 `DefaultSession["user"]`와 합집합**으로 정의했는지 확인
- [ ] **개발 서버를 재시작**했는지 확인 (타입 변경 후 필수)
- [ ] **IDE에서 TypeScript 서버를 재시작**했는지 확인

## 실제 사용 예시

타입 확장 후 클라이언트에서 안전하게 사용할 수 있습니다:

```typescript
// components/UserProfile.tsx
import { useSession } from "next-auth/react"

export default function UserProfile() {
  const { data: session } = useSession()
  
  if (session?.user) {
    // ✅ TypeScript 오류 없이 id 접근 가능
    console.log("User ID:", session.user.id)
    console.log("User Name:", session.user.name)
    console.log("User Email:", session.user.email)
  }
  
  return Profile Component
}
```

## 주의사항

### 파일 위치가 중요합니다
- `next-auth.d.ts` 파일은 **프로젝트 루트**에 위치해야 합니다[11][12]
- `src/` 폴더를 사용하는 경우 `src/types/next-auth.d.ts`에 배치할 수 있습니다
- 경우에 따라 `auth.ts` 파일과 **같은 위치**에 타입 정의를 넣는 것이 더 효과적일 수 있습니다[11]

### 배포 환경에서의 고려사항
- **Vercel 배포 시에도 동일한 타입 정의가 적용**되는지 확인하세요
- ESLint 설정이 너무 엄격한 경우 타입 정의를 인식하지 못할 수 있습니다

이 해결책을 적용하면 **Vercel 배포 시 발생하는 TypeScript 오류가 완전히 해결**되고, NextAuth의 session 객체에서 안전하게 사용자 ID를 사용할 수 있습니다[3][4][1][2][6][8][9][10][7][12].

[1] https://stackoverflow.com/questions/77153555/typescript-issues-in-session-callback
[2] https://github.com/nextauthjs/next-auth/issues/7132
[3] https://github.com/nextauthjs/next-auth/issues/7966
[4] https://stackoverflow.com/questions/71665419/how-to-make-additional-user-properties-available-to-the-user-object-within-the-s
[5] https://dev.to/josemukorivo/unlock-next-level-authentication-in-nextjs-with-next-auth-and-typescript-module-augmentation-1689?comments_sort=oldest
[6] https://stackoverflow.com/questions/69602694/how-to-update-the-type-of-session-in-session-callback-in-next-auth-when-using-ty/69606162
[7] https://stackoverflow.com/questions/76321021/nextauth-shows-me-errors-when-embedding-with-typescript
[8] https://stackoverflow.com/questions/75118956/how-do-i-receive-the-user-id-from-a-session-using-next-auth
[9] https://stackoverflow.com/questions/70409219/get-user-id-from-session-in-next-auth-client/71721634
[10] https://stackoverflow.com/questions/74425533/property-role-does-not-exist-on-type-user-adapteruser-in-nextauth
[11] https://github.com/nextauthjs/next-auth/discussions/6915
[12] https://josemukorivo.com/blog/unlock-next-level-authentication-in-nextjs-with-next-auth-and-typescript-module-augmentation-1689
[13] https://stackoverflow.com/questions/77012540/session-callback-not-populating-user-id-from-jwt-token-using-nextauth-js
[14] https://github.com/nextauthjs/next-auth/issues/9253
[15] https://stackoverflow.com/questions/77012540/session-callback-not-populating-user-id-from-jwt-token-using-nextauth-js/77681105
[16] https://www.inflearn.com/community/questions/1199290/nextauth-session-type-%EC%A7%88%EB%AC%B8%EB%93%9C%EB%A6%BD%EB%8B%88%EB%8B%A4
[17] https://dev.to/shinjithdev/authentication-user-management-in-nextjs-app-router-typescript-2023-3nnp
[18] https://www.reddit.com/r/nextjs/comments/19822hx/new_in_typescript_need_help/
[19] https://stackoverflow.com/questions/77701481/nextauth-user-is-undefined-in-session-callback-with-custom-session
[20] https://stackoverflow.com/questions/78324714/how-do-i-type-the-session-and-signin-callback-in-nextauth-route-ts-file
[21] https://stackoverflow.com/questions/77767383/how-to-add-more-properties-to-session-from-nextauth
[22] https://twentytwentyone.tistory.com/814
[23] https://www.reddit.com/r/nextjs/comments/16oop7y/get_user_id_from_session_in_nextauth_client/
[24] https://github.com/nextauthjs/next-auth/discussions/8456
[25] https://velog.io/@jason_kim/next-auth-module-augmentationwith-typescript
[26] https://github.com/nextauthjs/next-auth/issues/9571
[27] https://next-auth.js.org/getting-started/typescript
[28] https://stackoverflow.com/questions/73995421/session-callback-with-no-value-in-nextauth-js
[29] https://github.com/nextauthjs/next-auth/discussions/9776
[30] https://stackoverflow.com/questions/79099777/nextauth-refuses-to-allow-me-to-add-a-property-to-my-session-object-because-of-t
[31] https://github.com/nextauthjs/next-auth/discussions/9120
[32] https://github.com/nextauthjs/next-auth/discussions/7854
[33] https://cloud.tencent.com/developer/ask/sof/106922128
[34] https://velog.io/@xorb269/next-auth-Custom-User-Type-%EB%A7%8C%EB%93%A4%EA%B8%B0