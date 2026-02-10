#!/usr/bin/env python3
"""
Simple test script to trigger the complete Trend Radar workflow via Edge Function.
This tests the end-to-end pipeline: scraping → scoring → report → email
"""

import requests
import json

# Edge Function URL
EDGE_FUNCTION_URL = "https://wqpmhnsxqcsplfdyxrih.supabase.co/functions/v1/send-trend-radar"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxcG1obnN4cWNzcGxmZHl4cmloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjEwNzMsImV4cCI6MjA3MTk5NzA3M30.sElapKxtM-j_0_waExKoAzqL6mjF-EGyNRW2oZCRmLQ"

print("🚀 Testing Complete Trend Radar Workflow")
print("=" * 50)
print()
print("📡 Triggering Edge Function...")
print(f"URL: {EDGE_FUNCTION_URL}")
print()

try:
    response = requests.post(
        EDGE_FUNCTION_URL,
        headers={
            "Authorization": f"Bearer {ANON_KEY}",
            "Content-Type": "application/json"
        },
        timeout=60
    )
    
    print(f"Status Code: {response.status_code}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        print("✅ SUCCESS!")
        print()
        print("Response:")
        print(json.dumps(data, indent=2))
        print()
        
        if data.get("success"):
            print(f"🔥 Found {data.get('trends_found', 0)} viral trends")
            print(f"📧 Email sent: {data.get('email_sent', False)}")
            print()
            print("✉️  Check bangalexf@gmail.com for the email!")
        else:
            print("⚠️  No viral trends found today")
    else:
        print("❌ FAILED")
        print()
        print("Error Response:")
        print(response.text)
        
except requests.exceptions.Timeout:
    print("⏱️  Request timed out (this can happen if scraping takes too long)")
    print("The edge function may still be running in the background.")
    
except Exception as e:
    print(f"❌ Error: {e}")

print()
print("=" * 50)
print("Test complete!")
