import requests
from bs4 import BeautifulSoup
from datetime import datetime

def get_cultural_trends():
    """
    Scrapes trending topics from multiple sources:
    - Reddit r/all for viral memes and trends
    - Google Trends (via RSS)
    - Twitter/X trending topics (if accessible)
    """
    trends = {
        "viral_memes": [],
        "trending_topics": [],
        "sports_events": [],
        "entertainment": []
    }
    
    print("🌍 Scraper: Fetching cultural trends...")
    
    # 1. Reddit r/all for viral content
    try:
        print("   Checking Reddit r/all...")
        response = requests.get(
            "https://www.reddit.com/r/all.json",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if response.status_code == 200:
            data = response.json()
            posts = data.get('data', {}).get('children', [])[:10]
            
            for post in posts:
                post_data = post.get('data', {})
                trends["viral_memes"].append({
                    "title": post_data.get('title', ''),
                    "subreddit": post_data.get('subreddit', ''),
                    "upvotes": post_data.get('ups', 0),
                    "url": f"https://reddit.com{post_data.get('permalink', '')}",
                    "type": "reddit_viral"
                })
    except Exception as e:
        print(f"   ⚠️ Error fetching Reddit trends: {e}")
    
    # 2. Google Trends via RSS (trending searches)
    try:
        print("   Checking Google Trends...")
        response = requests.get(
            "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'xml')
            items = soup.find_all('item')[:10]
            
            for item in items:
                title = item.find('title')
                traffic = item.find('ht:approx_traffic')
                
                trends["trending_topics"].append({
                    "title": title.text if title else "Unknown",
                    "traffic": traffic.text if traffic else "Unknown",
                    "type": "google_trend"
                })
    except Exception as e:
        print(f"   ⚠️ Error fetching Google Trends: {e}")
    
    # 3. Reddit r/sports for sports events
    try:
        print("   Checking sports events...")
        response = requests.get(
            "https://www.reddit.com/r/sports.json",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if response.status_code == 200:
            data = response.json()
            posts = data.get('data', {}).get('children', [])[:5]
            
            for post in posts:
                post_data = post.get('data', {})
                trends["sports_events"].append({
                    "title": post_data.get('title', ''),
                    "upvotes": post_data.get('ups', 0),
                    "type": "sports"
                })
    except Exception as e:
        print(f"   ⚠️ Error fetching sports: {e}")
    
    # 4. Reddit r/movies and r/entertainment
    try:
        print("   Checking entertainment trends...")
        response = requests.get(
            "https://www.reddit.com/r/movies.json",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if response.status_code == 200:
            data = response.json()
            posts = data.get('data', {}).get('children', [])[:5]
            
            for post in posts:
                post_data = post.get('data', {})
                trends["entertainment"].append({
                    "title": post_data.get('title', ''),
                    "upvotes": post_data.get('ups', 0),
                    "type": "entertainment"
                })
    except Exception as e:
        print(f"   ⚠️ Error fetching entertainment: {e}")
    
    total = (len(trends["viral_memes"]) + len(trends["trending_topics"]) + 
             len(trends["sports_events"]) + len(trends["entertainment"]))
    print(f"   ✅ Found {total} cultural trends")
    
    return trends
