# Quick Setup Guide

## ✅ Database Setup (DONE)
You've already run the Supabase migration. Tables are ready!

## 🔐 GitHub Secrets Setup (2 minutes)

### Option 1: Web Interface (Easiest)
1. Go to: https://github.com/AntonCapusta25/HM-notion/settings/secrets/actions
2. Click "New repository secret" for each:

**Secret 1: SUPABASE_URL**
```
Value: (copy from your .env file)
```

**Secret 2: SUPABASE_SERVICE_ROLE_KEY**
```
Value: (copy from your .env file)
```

**Secret 3: GEMINI_API_KEY**
```
Value: (copy from your .env file)
```

**Secret 4: SENDGRID_API_KEY**
```
Value: (copy from your .env file)
```

### Option 2: GitHub CLI (If installed)
```bash
# Install GitHub CLI first
brew install gh
gh auth login

# Then run the setup script
./setup-github-secrets.sh
```

## 🚀 Push to GitHub

```bash
git add .
git commit -m "Add Trend Radar automation with GitHub Actions"
git push origin main
```

## ✅ Test the Workflows

### Test Daily Workflow (Manual Trigger)
1. Go to: https://github.com/AntonCapusta25/HM-notion/actions
2. Click "Daily Trend Radar"
3. Click "Run workflow" → "Run workflow"
4. Check your email in ~5 minutes

### Test Weekly Recap (Manual Trigger)
1. Go to: https://github.com/AntonCapusta25/HM-notion/actions
2. Click "Weekly Recap"
3. Click "Run workflow" → "Run workflow"
4. Check your email in ~2 minutes

## 📅 Automatic Schedule

Once secrets are set and code is pushed:
- **Daily**: 9:30 AM CET every day
- **Weekly**: 11:00 AM CET every Sunday

## 🎉 That's It!

You're done! The workflow will run automatically every day at 9:30 AM CET.
