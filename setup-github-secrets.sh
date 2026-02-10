#!/bin/bash

# GitHub Secrets Setup Script
# This script helps you set up GitHub Actions secrets for the Trend Radar automation

echo "🔐 Setting up GitHub Secrets for Trend Radar Automation"
echo "========================================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it with: brew install gh"
    echo "Then run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Read secrets from .env file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
fi

echo "📖 Reading secrets from .env file..."
source .env

# Set GitHub secrets
echo ""
echo "🔧 Setting GitHub Actions secrets..."
echo ""

gh secret set SUPABASE_URL -b"$SUPABASE_URL"
echo "✅ Set SUPABASE_URL"

gh secret set SUPABASE_SERVICE_ROLE_KEY -b"$SUPABASE_SERVICE_ROLE_KEY"
echo "✅ Set SUPABASE_SERVICE_ROLE_KEY"

gh secret set GEMINI_API_KEY -b"$GEMINI_API_KEY"
echo "✅ Set GEMINI_API_KEY"

gh secret set SENDGRID_API_KEY -b"$SENDGRID_API_KEY"
echo "✅ Set SENDGRID_API_KEY"

echo ""
echo "========================================================"
echo "✅ All GitHub secrets configured!"
echo ""
echo "Next steps:"
echo "1. Test daily workflow: gh workflow run daily-trend-radar.yml"
echo "2. Test weekly recap: gh workflow run weekly-recap.yml"
echo "3. Check workflow status: gh run list"
echo ""
echo "Automation schedule:"
echo "- Daily: 9:30 AM CET (8:30 UTC)"
echo "- Weekly: Sunday 11:00 AM CET (10:00 UTC)"
echo "========================================================"
