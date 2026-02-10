from trend_engine.scrapers.reddit import get_reddit_posts
from trend_engine.scrapers.youtube import get_youtube_shorts
from trend_engine.scrapers.tiktok import get_tiktok_posts
from trend_engine.scrapers.instagram import get_instagram_posts

def test_scraper(name, func, **kwargs):
    print(f"\n--- Testing {name} Scraper ---")
    try:
        posts = func(**kwargs)
        print(f"✅ {name}: Fetched {len(posts)} posts.")
        if posts:
            print(f"Sample: {posts[0]['title']} ({posts[0]['url']})")
        else:
            print(f"⚠️ {name}: No posts returned.")
    except Exception as e:
        print(f"❌ {name} Error: {e}")

if __name__ == "__main__":
    # Reddit (proven to work)
    test_scraper("Reddit", get_reddit_posts, limit=3)
    
    # YouTube (yt-dlp)
    test_scraper("YouTube", get_youtube_shorts, query="chef reactions shorts", limit=3)
    
    # TikTok (Playwright)
    test_scraper("TikTok", get_tiktok_posts, hashtag="cooking", limit=3) 
    
    # Instagram (Playwright)
    test_scraper("Instagram", get_instagram_posts, hashtag="chef", limit=3)
    
    print("\n✅ Test Run Complete.")
