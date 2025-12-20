# SendGrid Email Integration - Deployment Guide

## Prerequisites

1. **SendGrid Account**: Sign up at [sendgrid.com](https://sendgrid.com)
2. **Supabase Project**: Your existing Supabase project
3. **Supabase CLI**: Install with `npm install -g supabase`

## Step 1: Configure SendGrid

### 1.1 Create SendGrid API Key

1. Log in to SendGrid dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it "HM-Notion CRM"
5. Select **Full Access** permissions
6. Copy the API key (you'll only see it once!)

### 1.2 Verify Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your details and verify your email address
4. Use this verified email as your "from" address

## Step 2: Configure Environment Variables

### 2.1 Update Local .env File

Edit `/Users/alexandrfilippov/HM-notion/.env`:

```bash
# Existing Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Add these for Edge Functions
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Your Company Name
```

### 2.2 Set Supabase Secrets

Deploy secrets to Supabase for the Edge Function:

```bash
cd /Users/alexandrfilippov/HM-notion

# Set SendGrid secrets
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key_here
supabase secrets set SENDGRID_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set SENDGRID_FROM_NAME="Your Company Name"

# Set Supabase secrets (if not already set)
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Deploy Edge Function

### 3.1 Link to Supabase Project

```bash
cd /Users/alexandrfilippov/HM-notion
supabase link --project-ref your-project-ref
```

### 3.2 Deploy the Function

```bash
supabase functions deploy send-email
```

### 3.3 Verify Deployment

```bash
supabase functions list
```

You should see `send-email` in the list.

## Step 4: Update Database Schema (Optional)

If you want to add SendGrid fields to the database:

```sql
-- Add SendGrid configuration columns to outreach_settings table
ALTER TABLE public.outreach_settings 
ADD COLUMN IF NOT EXISTS email_provider VARCHAR DEFAULT 'sendgrid',
ADD COLUMN IF NOT EXISTS sendgrid_api_key VARCHAR,
ADD COLUMN IF NOT EXISTS sendgrid_from_email VARCHAR,
ADD COLUMN IF NOT EXISTS sendgrid_from_name VARCHAR;

-- Add comment
COMMENT ON COLUMN public.outreach_settings.email_provider IS 'Email provider: sendgrid or apps_script';
```

Run this in your Supabase SQL Editor.

## Step 5: Configure in Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Settings**:
   - Go to your Outreach workspace
   - Click on **Settings** tab
   - Go to **Email Setup**

3. **Configure SendGrid**:
   - Select **SendGrid (Recommended)** from the Email Provider dropdown
   - Enter your SendGrid API Key
   - Enter your verified From Email
   - Enter your From Name
   - Click **Test SendGrid Connection**

4. **Save Settings**:
   - Click **Save Settings** button

## Step 6: Test Email Sending

### 6.1 Test Single Email

1. In Settings → Email Setup
2. Click **Test SendGrid Connection**
3. Check your inbox for the test email

### 6.2 Test Campaign

1. Create a small test campaign with 2-3 leads
2. Launch the campaign
3. Verify emails are sent and received

## Troubleshooting

### Edge Function Not Working

**Check logs**:
```bash
supabase functions logs send-email
```

**Common issues**:
- API key not set correctly
- From email not verified in SendGrid
- Service role key missing

### Emails Not Sending

1. **Check SendGrid Dashboard**:
   - Go to Activity Feed
   - Look for recent sends

2. **Check Email Status**:
   - Look in `outreach_emails` table
   - Check `status` and `error_message` columns

3. **Verify API Key**:
   - Make sure it has Full Access permissions
   - Try regenerating the key

### Rate Limiting

SendGrid free tier limits:
- 100 emails/day

Adjust in Settings → Automation:
- Set Daily Email Limit to 100 or less

## Monitoring

### Check Email Statistics

```sql
-- Email sending statistics
SELECT 
  status,
  COUNT(*) as count
FROM outreach_emails
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Check Campaign Performance

```sql
-- Campaign performance
SELECT 
  c.name,
  COUNT(e.id) as total_emails,
  COUNT(CASE WHEN e.status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN e.opened_at IS NOT NULL THEN 1 END) as opened,
  COUNT(CASE WHEN e.clicked_at IS NOT NULL THEN 1 END) as clicked
FROM outreach_campaigns c
LEFT JOIN outreach_emails e ON e.campaign_id = c.id
GROUP BY c.id, c.name;
```

## Production Checklist

- [ ] SendGrid API key created with Full Access
- [ ] Sender email verified in SendGrid
- [ ] Environment variables set in `.env`
- [ ] Supabase secrets configured
- [ ] Edge Function deployed successfully
- [ ] Database schema updated (optional)
- [ ] Test email sent successfully
- [ ] Test campaign completed successfully
- [ ] Daily email limits configured appropriately
- [ ] Monitoring queries saved

## Support

For issues:
1. Check Supabase Edge Function logs
2. Check SendGrid Activity Feed
3. Review `outreach_emails` table for error messages
4. Verify all environment variables are set correctly

## Next Steps

1. **Upgrade SendGrid Plan** (if needed):
   - Free: 100 emails/day
   - Essentials: $19.95/month for 50,000 emails

2. **Set up Email Templates** in SendGrid (optional)

3. **Configure Webhooks** for advanced tracking (optional)

4. **Monitor deliverability** and adjust settings as needed
