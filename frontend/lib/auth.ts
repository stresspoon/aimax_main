import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';

/**
 * Google OAuth access token 갱신
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = 'https://oauth2.googleapis.com/token';
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
      method: 'POST',
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // 새 refresh token이 없으면 기존 것 사용
    };
  } catch (error) {
    console.error('Access token 갱신 실패:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      // Google access_token을 session에 포함
      if (token.accessToken) {
        (session as { accessToken?: string }).accessToken = token.accessToken as string;
      }
      // 토큰 만료 정보 추가
      if (token.accessTokenExpires) {
        (session as { accessTokenExpires?: number }).accessTokenExpires = token.accessTokenExpires as number;
      }
      if (token.error) {
        (session as { error?: string }).error = token.error as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // 초기 로그인 시
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          user,
        };
      }

      // 토큰이 아직 유효한 경우
      if (Date.now() < (token.accessTokenExpires as number || 0)) {
        return token;
      }

      // 토큰이 만료된 경우 갱신
      return await refreshAccessToken(token);
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};