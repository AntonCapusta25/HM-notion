from trend_engine.scrapers.tiktok import get_tiktok_posts

print("🧪 Testing TikTok Scraper with TikTokApi...")
try:
    posts = get_tiktok_posts(hashtag="cooking", limit=5)
    print(f"✅ Successfully fetched {len(posts)} posts.")
    
    if posts:
        print("\n--- Sample Post ---")
        post = posts[0]
        print(f"Title: {post['title']}")
        print(f"Channel: {post['channel']}")
        print(f"Views: {post['views']:,} | Likes: {post['likes']:,}")
        print(f"URL: {post['url']}")
        print("-------------------\n")
    else:
        print("⚠️ No posts returned.")

except Exception as e:
    print(f"❌ Error running scraper: {e}")
    import traceback
    traceback.print_exc()
