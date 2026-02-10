from playwright.sync_api import sync_playwright
import time
from datetime import datetime

def get_instagram_posts(account=None, limit=10):
    """
    Scrapes Instagram using Playwright.
    STRATEGY: Scrape public business profiles as indicators of trends.
    """
    if not account:
        account = "buzzfeedtasty"  # Default
    
    print(f"📸 Scraper: Scraping @{account}...")
    posts = []
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 800}
            )
            page = context.new_page()
            
            try:
                url = f"https://www.instagram.com/{account}/"
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
                
                # Wait for articles (grid items)
                try:
                    page.wait_for_selector('article a', timeout=5000)
                except:
                    print(f"   ⚠️ Timeout or Login Wall for {account}")
                    browser.close()
                    return []
                    
                links = page.query_selector_all('article a')
                
                for link in links[:limit]:
                    href = link.get_attribute('href')
                    full_url = f"https://www.instagram.com{href}"
                    
                    posts.append({
                        "source": "Instagram",
                        "channel": f"@{account}", 
                        "id": href.strip('/'),
                        "url": full_url,
                        "title": f"Post from {account}",
                        "content": f"Instagram content from @{account}",
                        "likes": 0, 
                        "comments": 0,
                        "views": 0,
                        "timestamp": datetime.utcnow(),
                        "hours_since": 24 
                    })
            except Exception as e:
                 print(f"   Error scraping {account}: {e}")

            browser.close()
            return posts

    except Exception as e:
        print(f"❌ Error scraping Instagram: {e}")
        return []
