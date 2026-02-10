import schedule
import time
from trend_engine.config import VIRAL_THRESHOLD_SCORE
from trend_engine.scrapers.reddit import get_reddit_posts
from trend_engine.scrapers.youtube import get_youtube_shorts
from trend_engine.scrapers.instagram import get_instagram_posts
from trend_engine.scrapers.tiktok import get_tiktok_posts
from trend_engine.scrapers.cultural_trends import get_cultural_trends
from trend_engine.processors.viral_score import calculate_viral_score
from trend_engine.ai.analyze_virality import analyze_trends_for_content_ideas
from trend_engine.reports.build_report import build_html_report
from trend_engine.email.send_sendgrid import send_email_report

# Make database optional
try:
    from trend_engine.db import db
except Exception as e:
    print(f"⚠️  Database unavailable: {e}")
    db = None

# 15 unique queries for each platform
YOUTUBE_QUERIES = [
    "home cooking shorts", "easy recipes", "meal prep ideas", "quick dinner recipes",
    "cooking hacks", "budget meals", "healthy recipes", "comfort food",
    "one pot meals", "cooking tips", "food trends 2026", "viral recipes",
    "cooking asmr", "recipe shorts", "cooking tutorial"
]

TIKTOK_HASHTAGS = [
    "homecooking", "cookwithme", "easyrecipes", "mealprep",
    "cookinghacks", "budgetmeals", "healthyrecipes", "comfortfood",
    "quickrecipes", "foodtok", "recipetok", "cookingtrends",
    "viralrecipes", "cookingtips", "foodhacks"
]

INSTAGRAM_ACCOUNTS = [
    "buzzfeedtasty", "food52", "bonappetitmag", "foodnetwork",
    "thekitchn", "seriouseats", "delish", "tastemade",
    "epicurious", "cookinglight", "eatingwell", "foodandwine",
    "simplyrecipes", "minimalistbaker", "halfbakedharvest"
]

def run_pipeline():
    print("🚀 Starting COMPLETE Trend Radar Pipeline...")
    print("=" * 60)
    
    all_posts = []
    
    # PRIORITY 1: YouTube (15 queries)
    print("\n📺 Scraping YouTube (15 queries)...")
    youtube_total = 0
    for i, query in enumerate(YOUTUBE_QUERIES, 1):
        print(f"   [{i}/15] Query: '{query}'...")
        posts = get_youtube_shorts(query=query, limit=10)
        all_posts.extend(posts)
        youtube_total += len(posts)
    print(f"   ✅ {youtube_total} posts from YouTube")
    
    # PRIORITY 2: TikTok (15 hashtags)
    print("\n🎵 Scraping TikTok (15 hashtags)...")
    tiktok_total = 0
    for i, hashtag in enumerate(TIKTOK_HASHTAGS, 1):
        print(f"   [{i}/15] Hashtag: #{hashtag}...")
        posts = get_tiktok_posts(hashtag=hashtag, limit=10)
        all_posts.extend(posts)
        tiktok_total += len(posts)
    print(f"   ✅ {tiktok_total} posts from TikTok")
    
    # PRIORITY 3: Instagram (15 accounts)
    print("\n📸 Scraping Instagram (15 accounts)...")
    instagram_total = 0
    for i, account in enumerate(INSTAGRAM_ACCOUNTS, 1):
        print(f"   [{i}/15] Account: @{account}...")
        posts = get_instagram_posts(account=account, limit=10)
        all_posts.extend(posts)
        instagram_total += len(posts)
    print(f"   ✅ {instagram_total} posts from Instagram")
    
    # LOWER PRIORITY: Reddit (keep minimal)
    print("\n📡 Scraping Reddit (minimal)...")
    reddit_posts = get_reddit_posts(limit=10)
    all_posts.extend(reddit_posts)
    print(f"   ✅ {len(reddit_posts)} posts from Reddit")
    
    print(f"\n📊 Total posts collected: {len(all_posts)}")
    print(f"   YouTube: {youtube_total} | TikTok: {tiktok_total} | Instagram: {instagram_total} | Reddit: {len(reddit_posts)}")
    print("=" * 60)

    # 2. Score & Filter
    print("\n🔥 Scoring posts for virality...")
    viral_candidates = []
    for post in all_posts:
        score = calculate_viral_score(post)
        post["viral_score"] = score
        
        if score >= VIRAL_THRESHOLD_SCORE:
            viral_candidates.append(post)
    
    # Sort by viral score
    viral_candidates.sort(key=lambda x: x.get('viral_score', 0), reverse=True)
    
    print(f"   🎯 Found {len(viral_candidates)} viral candidates (Score >= {VIRAL_THRESHOLD_SCORE})")
    print("=" * 60)

    # Scrape Cultural Trends (Holidays, Festivals, Sports Events)
    print("\n🌍 Scraping Cultural Trends...")
    cultural_trends = get_cultural_trends()
    
    # Flatten all events into a single list for AI analysis
    all_events = []
    all_events.extend(cultural_trends.get('holidays', []))
    all_events.extend(cultural_trends.get('festivals', []))
    all_events.extend(cultural_trends.get('sports_events', []))
    
    print(f"   ✅ Found {len(all_events)} upcoming events")
    print(f"      Holidays: {len(cultural_trends.get('holidays', []))}")
    print(f"      Festivals: {len(cultural_trends.get('festivals', []))}")
    print(f"      Sports: {len(cultural_trends.get('sports_events', []))}")
    print("=" * 60)
    
    # 3. AI Analysis - Analyze ALL viral candidates + cultural trends
    content_ideas_data = {}
    if viral_candidates:
        print(f"\n🤖 Analyzing ALL {len(viral_candidates)} viral posts + {len(all_events)} cultural events...")
        content_ideas_data = analyze_trends_for_content_ideas(viral_candidates, all_events)
        
        b2c_count = len(content_ideas_data.get('b2c_content_ideas', []))
        b2b_count = len(content_ideas_data.get('b2b_content_ideas', []))
        print(f"   ✅ Generated {b2c_count} B2C ideas + {b2b_count} B2B ideas")
        print("=" * 60)
        
        # Save content ideas to database
        if db and db.client:
            print("\n💾 Saving content ideas to database...")
            saved_count = 0
            
            for idea in content_ideas_data.get('b2c_content_ideas', []):
                if db.save_content_idea(idea, 'B2C'):
                    saved_count += 1
            
            for idea in content_ideas_data.get('b2b_content_ideas', []):
                if db.save_content_idea(idea, 'B2B'):
                    saved_count += 1
            
            print(f"   ✅ Saved {saved_count} content ideas to database")
            
            # Save cultural highlights as events
            cultural_highlights = content_ideas_data.get('cultural_highlights', [])
            if cultural_highlights:
                print("\n💾 Saving cultural events to database...")
                events_saved = 0
                for highlight in cultural_highlights:
                    event_data = {
                        "event_name": highlight.get('trend', ''),
                        "event_type": "cultural_trend",
                        "event_date": None,
                        "opportunity": highlight.get('opportunity', ''),
                        "urgency": highlight.get('urgency', ''),
                        "source": "ai_analysis"
                    }
                    if db.save_event(event_data):
                        events_saved += 1
                
                # Also save the actual calendar events (holidays, festivals, sports)
                for event in all_events:
                    event_data = {
                        "event_name": event.get('name', ''),
                        "event_type": event.get('type', 'event'),
                        "event_date": event.get('date'),
                        "opportunity": event.get('opportunity', ''),
                        "urgency": event.get('urgency', ''),
                        "source": "calendar"
                    }
                    if db.save_event(event_data):
                        events_saved += 1
                print(f"   ✅ Saved/updated {events_saved} events to database")
            
            print("=" * 60)
            
    # 4. Generate & Send Report
    if content_ideas_data and (content_ideas_data.get('b2c_content_ideas') or content_ideas_data.get('b2b_content_ideas')):
        print("\n📝 Generating Content Ideas Report...")
        html_report = build_html_report(content_ideas_data)
        print("   ✅ Report generated")
        
        print("\n📧 Sending Email via Edge Function...")
        send_email_report(html_report)
        print("   ✅ Email sent to bangalexf@gmail.com")
    else:
        print("\n⚠️  No content ideas generated. Skipping report.")
    
    print("\n" + "=" * 60)
    print("✅ Pipeline Complete!")
    print("=" * 60)

if __name__ == "__main__":
    # If run directly, execute immediately
    run_pipeline()
