-- AIMAX Database Schema Setup (Safe Version)
-- This SQL script creates tables only if they don't exist

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types with safe handling
DO $$ BEGIN
    CREATE TYPE "ApplicantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SNSPlatform" AS ENUM ('INSTAGRAM', 'NAVER_BLOG', 'THREADS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MailType" AS ENUM ('SELECTION_NOTIFICATION', 'REJECTION_NOTIFICATION', 'FOLLOW_UP', 'REMINDER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    UNIQUE("provider", "providerAccountId")
);

-- Add foreign key constraint only if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sessions table (for NextAuth)
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP NOT NULL
);

-- Add foreign key constraint only if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    "userId" TEXT NOT NULL
);

-- Add foreign key constraint only if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    "campaignId" TEXT NOT NULL
);

-- Add constraints only if they don't exist
DO $$ BEGIN
    ALTER TABLE "applicants" ADD CONSTRAINT "applicants_campaignId_fkey" 
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "applicants" ADD CONSTRAINT "applicants_campaignId_email_key" 
    UNIQUE("campaignId", "email");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    "applicantId" TEXT NOT NULL
);

-- Add foreign key constraint only if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "sns_profiles" ADD CONSTRAINT "sns_profiles_applicantId_fkey" 
    FOREIGN KEY ("applicantId") REFERENCES "applicants"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    "snsDataSnapshot" JSONB NOT NULL
);

-- Add constraints only if they don't exist
DO $$ BEGIN
    ALTER TABLE "selection_results" ADD CONSTRAINT "selection_results_applicantId_fkey" 
    FOREIGN KEY ("applicantId") REFERENCES "applicants"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "selection_results" ADD CONSTRAINT "selection_results_campaignId_fkey" 
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "selection_results" ADD CONSTRAINT "selection_results_applicantId_campaignId_key" 
    UNIQUE("applicantId", "campaignId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    "campaignId" TEXT NOT NULL
);

-- Add foreign key constraints only if they don't exist
DO $$ BEGIN
    ALTER TABLE "mail_histories" ADD CONSTRAINT "mail_histories_applicantId_fkey" 
    FOREIGN KEY ("applicantId") REFERENCES "applicants"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "mail_histories" ADD CONSTRAINT "mail_histories_campaignId_fkey" 
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- Create indexes only if they don't exist
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

-- Create trigger function for updating updatedAt timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers only if they don't exist
DO $$ BEGIN
    CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON "users" FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON "campaigns" FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_applicants_updated_at 
    BEFORE UPDATE ON "applicants" FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_sns_profiles_updated_at 
    BEFORE UPDATE ON "sns_profiles" FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_selection_results_updated_at 
    BEFORE UPDATE ON "selection_results" FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_mail_histories_updated_at 
    BEFORE UPDATE ON "mail_histories" FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;