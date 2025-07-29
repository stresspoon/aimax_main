# Supabase PostgreSQL Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Set project name: `aimax-frontend`
5. Database password: Generate a strong password and save it
6. Region: Select Asia Pacific (Seoul) - `ap-northeast-2`
7. Pricing Plan: Select "Free" for development

## 2. Get Database Connection Details

After project creation:

1. Go to Settings → Database
2. Copy the connection string in this format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?schema=public
   ```
3. Replace `[YOUR-PASSWORD]` with your actual database password
4. Replace `[YOUR-PROJECT-REF]` with your actual project reference ID

## 3. Update Environment Variables

In `/frontend/.env` file, update the following:

```env
# Update this with your actual Supabase connection string
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?schema=public"

# Optional: Add Supabase API keys for direct client access
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Add your Google OAuth credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Generate a NextAuth secret
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
```

## 4. Run Database Migration

After updating the environment variables:

```bash
# Push the schema to Supabase PostgreSQL
npx prisma db push

# Optional: Generate and run a migration
npx prisma migrate dev --name init

# Verify the database connection
npx prisma studio
```

## 5. Test Database Connection

```bash
# Test if the database connection works
npm run build
npm run dev
```

## 6. Database Schema Overview

The schema includes these main tables:

- **users**: User authentication (Google OAuth)
- **accounts**: OAuth account details
- **sessions**: User sessions
- **campaigns**: Multi-tenant campaign/brand management
- **applicants**: Campaign applicants with SNS profiles
- **sns_profiles**: SNS platform data (Instagram, Naver Blog, Threads)
- **selection_results**: Selection decisions and criteria
- **mail_histories**: Email sending logs
- **sync_logs**: Google Sheets sync logs

## 7. Migration from Memory Storage

The `DatabaseService` class replaces `MemoryStorage` and provides:

- Persistent data storage in PostgreSQL
- Multi-tenant support with campaigns
- Relational data integrity
- Better performance for large datasets
- Automatic data validation through Prisma

## 8. Next Steps

After database setup:

1. Update API routes to use `DatabaseService` instead of `MemoryStorage`
2. Add campaign management UI
3. Test the complete flow from Google Sheets sync to selection processing
4. Deploy to production with environment variables set

## 9. Troubleshooting

**Connection Issues:**
- Verify DATABASE_URL is correct
- Check Supabase project is active
- Ensure IP whitelisting if needed (usually not required for Supabase)

**Migration Issues:**
- Run `npx prisma db push --force-reset` to reset and recreate schema
- Check for syntax errors in schema.prisma

**Permission Issues:**
- Verify the Supabase password is correct
- Check if the project is in the right organization