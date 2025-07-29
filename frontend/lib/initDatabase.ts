/**
 * 데이터베이스 초기화 스크립트
 * 애플리케이션 시작 시 필요한 테이블들을 자동으로 생성합니다.
 */

import { prisma } from './database';

export async function initializeDatabase() {
  try {
    console.log('데이터베이스 초기화 시작...');
    
    // SQL 명령어들을 하나씩 실행
    const sqlCommands = [
      // Enable UUID extension
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      
      // Create enum types
      `DO $$ BEGIN
        CREATE TYPE "ApplicantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      `DO $$ BEGIN
        CREATE TYPE "SNSPlatform" AS ENUM ('INSTAGRAM', 'NAVER_BLOG', 'THREADS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      `DO $$ BEGIN
        CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      // Create tables
      `CREATE TABLE IF NOT EXISTS "campaigns" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "sheetId" TEXT,
        "sheetName" TEXT,
        "sheetUrl" TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "userId" TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS "applicants" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "applicationDate" TIMESTAMP DEFAULT NOW(),
        "status" "ApplicantStatus" DEFAULT 'PENDING',
        "notes" TEXT,
        "sheetRowIndex" INTEGER NOT NULL,
        "lastUpdated" TIMESTAMP DEFAULT NOW(),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "campaignId" TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS "sync_logs" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "success" BOOLEAN NOT NULL,
        "newApplicants" INTEGER DEFAULT 0,
        "updatedApplicants" INTEGER DEFAULT 0,
        "errors" JSONB NOT NULL,
        "lastSyncTime" TIMESTAMP DEFAULT NOW(),
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS "applicants_campaignId_idx" ON "applicants"("campaignId")`,
      `CREATE INDEX IF NOT EXISTS "applicants_email_idx" ON "applicants"("email")`
    ];

    // 각 SQL 명령어를 순차적으로 실행
    for (const sql of sqlCommands) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log('✅ SQL 명령어 실행 완료');
      } catch (error) {
        console.log('⚠️ SQL 명령어 실행 중 오류 (계속 진행):', error);
      }
    }

    console.log('✅ 데이터베이스 테이블 생성 완료');
    return { success: true, message: '데이터베이스 초기화 완료' };
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 개발 환경에서만 자동 실행
if (process.env.NODE_ENV === 'development') {
  initializeDatabase().then(result => {
    if (result.success) {
      console.log('데이터베이스 초기화 성공');
    } else {
      console.error('데이터베이스 초기화 실패:', result.error);
    }
  });
}