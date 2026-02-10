import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import time
from ..config import SUBREDDITS

def get_reddit_posts(limit=25):
    """
    Scrapes hot posts from configured cooking subreddits using public RSS/Atom feeds.
    This bypasses most JSON API blocks.
    """
    all_posts = []
    
    # Simple browser UA
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    # API namespace for parsing
    ns = {'atom': 'http://www.w3.org/2005/Atom'}

    for sub_name in SUBREDDITS:
        try:
            print(f"Fetching r/{sub_name} RSS feed...")
            # Use 'hot' sorting for viral trends
            url = f"https://www.reddit.com/r/{sub_name}/hot.rss?limit={limit}"
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"Failed to fetch r/{sub_name}: Status {response.status_code}")
                continue
            
            # Parse XML
            try:
                root = ET.fromstring(response.content)
                
                # Iterate entries with index
                for i, entry in enumerate(root.findall('atom:entry', ns)):
                    title = entry.find('atom:title', ns).text
                    link = entry.find('atom:link', ns).attrib['href']
                    updated_str = entry.find('atom:updated', ns).text
                    content_html = entry.find('atom:content', ns).text or ""
                    
                    # Parse timestamp (ISO 8601)
                    # e.g. 2023-10-27T10:00:00+00:00
                    # Simplified parsing
                    try:
                        # Remove timezone for simple calc
                        dt_str = updated_str.split('+')[0]
                        updated_time = datetime.fromisoformat(dt_str)
                        hours_since = (datetime.utcnow() - updated_time).total_seconds() / 3600
                    except:
                        hours_since = 24 # Fallback
                        updated_time = datetime.utcnow()

                    # Extract rough metrics from content HTML if possible, 
                    # but usually RSS doesn't have live scores.
                    # We will assume a baseline 'viral' check isn't fully possible 
                    # with just RSS for scores, but we get the content.
                    # Text content is inside HTML
                    
                    post_data = {
                        "source": "Reddit (RSS)",
                        "channel": f"r/{sub_name}",
                        "id": link.split('/')[-3] if len(link.split('/')) > 3 else "unknown",
                        "url": link,
                        "title": title,
                        "content": title + "\n" + content_html[:500], # Trucate HTML for analysis padding
                        "likes": 0, # RSS doesn't provide live karma
                        "comments": 0,
                        "views": 0,
                        "rank": i + 1, # Track position in Hot feed
                        "timestamp": updated_time,
                        "hours_since": hours_since
                    }
                    all_posts.append(post_data)
                    
            except ET.ParseError as e:
                print(f"XML Parse Error for r/{sub_name}: {e}")

            time.sleep(1)
            
        except Exception as e:
            print(f"Error scraping r/{sub_name}: {e}")

    return all_posts
