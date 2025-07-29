-- AIMAX Database Schema Setup
-- This SQL script creates all the necessary tables for the AIMAX application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE "ApplicantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "SNSPlatform" AS ENUM ('INSTAGRAM', 'NAVER_BLOG', 'THREADS');
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "MailType" AS ENUM ('SELECTION_NOTIFICATION', 'REJECTION_NOTIFICATION', 'FOLLOW_UP', 'REMINDER');
CREATE TYPE "MailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SCHEDULED');

-- Users table (for NextAuth)
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Accounts table (for NextAuth OAuth)
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    UNIQUE("provider", "providerAccountId")
);

-- Sessions table (for NextAuth)
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sheetId" TEXT,
    "sheetName" TEXT,
    "sheetUrl" TEXT,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "userId" TEXT NOT NULL,
    CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Applicants table
CREATE TABLE IF NOT EXISTS "applicants" (
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
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "applicants_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE,
    UNIQUE("campaignId", "email")
);

-- SNS Profiles table
CREATE TABLE IF NOT EXISTS "sns_profiles" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "platform" "SNSPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "handle" TEXT,
    "followers" INTEGER,
    "visitors" INTEGER,
    "isValid" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "applicantId" TEXT NOT NULL,
    CONSTRAINT "sns_profiles_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants"("id") ON DELETE CASCADE
);

-- Selection Results table
CREATE TABLE IF NOT EXISTS "selection_results" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "isSelected" BOOLEAN NOT NULL,
    "selectionReason" TEXT NOT NULL,
    "selectionDate" TIMESTAMP DEFAULT NOW(),
    "qualifyingPlatforms" JSONB NOT NULL,
    "processingStatus" "ProcessingStatus" DEFAULT 'COMPLETED',
    "sheetUpdated" BOOLEAN DEFAULT FALSE,
    "sheetUpdateDate" TIMESTAMP,
    "emailSent" BOOLEAN DEFAULT FALSE,
    "emailSentDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "applicantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "meetsCriteria" JSONB NOT NULL,
    "snsDataSnapshot" JSONB NOT NULL,
    CONSTRAINT "selection_results_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants"("id") ON DELETE CASCADE,
    CONSTRAINT "selection_results_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE,
    UNIQUE("applicantId", "campaignId")
);

-- Mail Histories table
CREATE TABLE IF NOT EXISTS "mail_histories" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "mailType" "MailType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MailStatus" DEFAULT 'PENDING',
    "sentAt" TIMESTAMP,
    "failReason" TEXT,
    "scheduledAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "applicantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "mail_histories_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants"("id") ON DELETE CASCADE,
    CONSTRAINT "mail_histories_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE
);

-- Sync Logs table
CREATE TABLE IF NOT EXISTS "sync_logs" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "success" BOOLEAN NOT NULL,
    "newApplicants" INTEGER DEFAULT 0,
    "updatedApplicants" INTEGER DEFAULT 0,
    "errors" JSONB NOT NULL,
    "lastSyncTime" TIMESTAMP DEFAULT NOW(),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "campaigns_userId_idx" ON "campaigns"("userId");
CREATE INDEX IF NOT EXISTS "applicants_campaignId_idx" ON "applicants"("campaignId");
CREATE INDEX IF NOT EXISTS "applicants_email_idx" ON "applicants"("email");
CREATE INDEX IF NOT EXISTS "sns_profiles_applicantId_idx" ON "sns_profiles"("applicantId");
CREATE INDEX IF NOT EXISTS "selection_results_applicantId_idx" ON "selection_results"("applicantId");
CREATE INDEX IF NOT EXISTS "selection_results_campaignId_idx" ON "selection_results"("campaignId");
CREATE INDEX IF NOT EXISTS "mail_histories_applicantId_idx" ON "mail_histories"("applicantId");
CREATE INDEX IF NOT EXISTS "sync_logs_createdAt_idx" ON "sync_logs"("createdAt");

-- Create trigger to update updatedAt timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that have updatedAt column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON "campaigns" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON "applicants" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sns_profiles_updated_at BEFORE UPDATE ON "sns_profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_selection_results_updated_at BEFORE UPDATE ON "selection_results" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mail_histories_updated_at BEFORE UPDATE ON "mail_histories" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();