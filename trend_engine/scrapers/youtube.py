from yt_dlp import YoutubeDL
from datetime import datetime
import time

def get_youtube_shorts(query="home cooking shorts", limit=10):
    """
    Scrapes YouTube Shorts metadata using yt-dlp.
    Doesn't download video, just extracts info.
    """
    print(f"🎬 Scraper: Searching YouTube for '{query}'...")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist', # Just get metadata, don't download
        'dump_single_json': True, 
        'default_search': 'ytsearch',
    }

    posts = []

    try:
        with YoutubeDL(ydl_opts) as ydl:
            # ytsearchN:query searches for N results
            search_query = f"ytsearch{limit}:{query}"
            result = ydl.extract_info(search_query, download=False)
            
            if 'entries' in result:
                for entry in result['entries']:
                    if not entry: continue
                    
                    # Convert duration to check if it's a short (usually < 60s)
                    duration = entry.get('duration', 0)
                    is_short = duration and duration < 65 
                    
                    # Upload date
                    upload_date_str = entry.get('upload_date') # YYYYMMDD
                    if upload_date_str:
                        try:
                            upload_time = datetime.strptime(upload_date_str, "%Y%m%d")
                        except:
                            upload_time = datetime.utcnow()
                    else:
                        upload_time = datetime.utcnow()

                    hours_since = (datetime.utcnow() - upload_time).total_seconds() / 3600

                    post_data = {
                        "source": "YouTube Shorts",
                        "channel": entry.get('uploader', 'Unknown'),
                        "id": entry.get('id'),
                        "url": entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                        "title": entry.get('title'),
                        "content": entry.get('title'), # Description isn't always fully available in flat extraction
                        "likes": entry.get('like_count', 0), # Often None in flat extraction
                        "comments": entry.get('comment_count', 0),
                        "views": entry.get('view_count', 0),
                        "timestamp": upload_time,
                        "hours_since": hours_since
                    }
                    
                    posts.append(post_data)
            
            return posts

    except Exception as e:
        print(f"❌ Error scraping YouTube: {e}")
        return []
