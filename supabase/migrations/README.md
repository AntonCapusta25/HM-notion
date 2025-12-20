# Database Migration Guide - Collab Outreach Tables

## Overview
This migration creates separate tables for the internal team (collab) outreach system to manage chef leads and campaigns.

## Tables Created

1. **collab_segments** - Grouping for chef leads
2. **collab_leads** - Chef contact database
3. **collab_campaigns** - Email campaigns to chefs
4. **collab_emails** - Email tracking for campaigns
5. **collab_activities** - Activity log for interactions

## Running the Migration

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `20250120_create_collab_outreach_tables.sql`
4. Click "Run"

### Option 2: Supabase CLI
```bash
cd /Users/alexandrfilippov/HM-notion
supabase db push
```

## Verification

After running the migration, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'collab_%';
```

Should return:
- collab_activities
- collab_campaigns
- collab_emails
- collab_leads
- collab_segments

## Rollback (if needed)

```sql
DROP TABLE IF EXISTS public.collab_activities CASCADE;
DROP TABLE IF EXISTS public.collab_emails CASCADE;
DROP TABLE IF EXISTS public.collab_campaigns CASCADE;
DROP TABLE IF EXISTS public.collab_leads CASCADE;
DROP TABLE IF EXISTS public.collab_segments CASCADE;

ALTER TABLE public.outreach_settings DROP COLUMN IF EXISTS outreach_type;
```

## Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access data in their workspace
- Existing client outreach tables are unchanged
- The `outreach_settings` table now has an `outreach_type` column to distinguish between collab and client settings
