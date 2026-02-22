import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Missing credentials")
    exit(1)

print(f"Testing connection to {url}...")

try:
    supabase = create_client(url, key)
    # Try to select from a table that should exist, or just check auth
    # trend_engine/db.py mentions 'content_ideas' and 'viral_trends'
    
    # We'll try to list tables or select from content_ideas (might be empty)
    response = supabase.table("content_ideas").select("count", count="exact").execute()
    print(f"✅ Connection successful! found {response.count} content ideas.")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
