# Trend Radar - Railway Deployment Guide

## Quick Setup

### 1. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### 2. Deploy from GitHub
1. Click "New Project" → "Deploy from GitHub repo"
2. Select `AntonCapusta25/HM-notion`
3. Railway will auto-detect Python

### 3. Set Environment Variables
In Railway dashboard, add these variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
SENDGRID_API_KEY=your_sendgrid_key
```

### 4. Configure GitHub Secrets
In your GitHub repo settings → Secrets and variables → Actions, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `SENDGRID_API_KEY`

### 5. Run Database Migration
In Supabase SQL Editor, run:
```sql
-- Copy contents from supabase/migrations/20260210_trend_radar_tables.sql
```

## Automation Schedule

- **Daily Trend Radar**: 9:30 AM CET (8:30 UTC) via GitHub Actions
- **Weekly Recap**: Sundays at 11:00 AM CET (10:00 UTC) via GitHub Actions

## Manual Triggers

### Test Daily Workflow
```bash
gh workflow run daily-trend-radar.yml
```

### Test Weekly Recap
```bash
gh workflow run weekly-recap.yml
```

## Monitoring

- Check GitHub Actions tab for workflow runs
- Railway dashboard shows deployment logs
- Emails sent to: bangalexf@gmail.com

## Notes

- GitHub Actions runs the workflow (not Railway)
- Railway is optional for hosting a web interface later
- All data saved to Supabase automatically
- Events are deduplicated by name + date
