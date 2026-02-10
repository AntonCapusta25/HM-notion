import requests
import json
from datetime import datetime
import time

def get_tiktok_posts(hashtag="homecooking", limit=10):
    """
    Scrapes TikTok using simple HTTP requests.
    Uses TikTok's web API endpoint with proper headers.
    """
    print(f"🎵 Scraper: Fetching TikTok #{hashtag} via HTTP...")
    
    posts = []
    
    try:
        # TikTok's web API endpoint for hashtag challenges
        # This endpoint is used by their web client
        url = f"https://www.tiktok.com/api/challenge/item_list/"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': f'https://www.tiktok.com/tag/{hashtag}',
            'Origin': 'https://www.tiktok.com',
        }
        
        params = {
            'challengeName': hashtag,
            'count': limit,
            'cursor': 0,
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check if we got valid data
                if 'itemList' in data:
                    for item in data['itemList'][:limit]:
                        try:
                            stats = item.get('stats', {})
                            author = item.get('author', {})
                            video_id = item.get('id', 'unknown')
                            
                            # Get creation time
                            create_time = item.get('createTime', 0)
                            if create_time:
                                created_dt = datetime.fromtimestamp(int(create_time))
                                hours_since = (datetime.utcnow() - created_dt).total_seconds() / 3600
                            else:
                                created_dt = datetime.utcnow()
                                hours_since = 24
                            
                            post_data = {
                                "source": "TikTok",
                                "channel": f"@{author.get('uniqueId', 'unknown')}",
                                "id": video_id,
                                "url": f"https://www.tiktok.com/@{author.get('uniqueId', 'unknown')}/video/{video_id}",
                                "title": item.get('desc', 'TikTok Video')[:100],
                                "content": item.get('desc', ''),
                                "likes": stats.get('diggCount', 0),
                                "comments": stats.get('commentCount', 0),
                                "views": stats.get('playCount', 0),
                                "timestamp": created_dt,
                                "hours_since": hours_since
                            }
                            
                            posts.append(post_data)
                            
                        except Exception as e:
                            print(f"   Error parsing item: {e}")
                            continue
                    
                    if posts:
                        print(f"✅ Successfully fetched {len(posts)} real TikTok posts!")
                        return posts
                    
            except json.JSONDecodeError:
                print("⚠️ Failed to parse TikTok response as JSON")
        else:
            print(f"⚠️ TikTok API returned status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error with HTTP request: {e}")
    
    # FALLBACK: Mock data
    print("⚠️ TikTok scraping failed. Returning MOCK trending data for demonstration.")
    return [
        {
            "source": "TikTok",
            "channel": "@gordonramsayofficial",
            "id": "mock_id_1",
            "url": "https://www.tiktok.com/@gordonramsayofficial/video/729384728",
            "title": "Wellington Valid",
            "content": "Gordon Ramsay makes a classic Beef Wellington for home chefs.",
            "likes": 1200000,
            "comments": 4500,
            "views": 5000000,
            "timestamp": datetime.utcnow(),
            "hours_since": 12
        },
        {
            "source": "TikTok",
            "channel": "@cookingwithshereen",
            "id": "mock_id_2",
            "url": "https://www.tiktok.com/@cookingwithshereen/video/982734982",
            "title": "Chefie Tips: Onion Cutting",
            "content": "How to cut onions without crying - easy hack.",
            "likes": 850000,
            "comments": 2300,
            "views": 2100000,
            "timestamp": datetime.utcnow(),
            "hours_since": 5
        }
    ]
