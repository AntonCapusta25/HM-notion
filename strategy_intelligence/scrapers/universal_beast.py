import asyncio
import json
import os
import random
from playwright.async_api import async_playwright

class PlaywrightBeast:
    def __init__(self, headless=True):
        self.headless = headless
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        ]

    async def get_page(self, browser):
        context = await browser.new_context(user_agent=random.choice(self.user_agents), viewport={'width': 1920, 'height': 1080})
        return await context.new_page()

    async def scrape_site(self, url, selectors, scroll_times=5):
        print(f"--- 🐲 BEAST SCRAPING: {url} ---")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            page = await self.get_page(browser)
            try:
                await page.goto(url, timeout=60000)
                await asyncio.sleep(5)
                
                # Handle common popups
                for btn_text in ["Accept all", "I agree", "Allow all", "Akkoord", "Toestaan"]:
                    try:
                        await page.click(f'button:has-text("{btn_text}")', timeout=2000)
                    except: pass

                data = []
                for _ in range(scroll_times):
                    await page.mouse.wheel(0, 5000)
                    await asyncio.sleep(2)
                    
                    elements = await page.query_selector_all(selectors['container'])
                    for el in elements:
                        try:
                            item = {}
                            for key, selector in selectors['fields'].items():
                                field_el = await el.query_selector(selector)
                                item[key] = await field_el.inner_text() if field_el else None
                            if item not in data:
                                data.append(item)
                        except: continue
                
                await browser.close()
                await asyncio.sleep(random.uniform(5, 10)) # Rate limiting
                return data
            except Exception as e:
                print(f"Error scraping {url}: {e}")
                await browser.close()
                return []

async def main():
    beast = PlaywrightBeast(headless=True)
    
    # 1. Target: ChefMaison (Amsterdam) - Real Local Heroes
    chefmaison_results = await beast.scrape_site(
        "https://www.chefmaison.com/en/find-a-chef/amsterdam",
        {
            'container': '.chef-card', # Mock selector, will check real UI
            'fields': {
                'name': 'h3',
                'description': '.description',
                'price': '.price',
                'rating': '.rating-value'
            }
        }
    )

    # 2. Target: Trustpilot (Expanded Ratings)
    trustpilot_queries = ["thuisbezorgd.nl", "ubereats.com", "kookxtra.com"]
    trustpilot_data = {}
    for brand in trustpilot_queries:
        trustpilot_data[brand] = await beast.scrape_site(
            f"https://www.trustpilot.com/review/www.{brand}",
            {
                'container': 'article[class*="reviewCard"]',
                'fields': {
                    'text': 'p[data-service-review-text-typography="true"]',
                    'rating': 'div[class*="starRating"] img', # Rating is often in alt text
                    'date': 'time'
                }
            },
            scroll_times=10 # Extreme scraping
        )

    # 3. Target: Airbnb Experiences (Amsterdam Food)
    airbnb_results = await beast.scrape_site(
        "https://www.airbnb.com/s/Amsterdam--Netherlands/experiences?category_tag=Tag:667", # Food Category
        {
            'container': 'div[data-testid="card-container"]',
            'fields': {
                'title': 'div[data-testid="listing-card-title"]',
                'price': 'span[class*="price-line"]',
                'rating': 'span[aria-label*="rating"]'
            }
        }
    )

    # 4. Target: Tripadvisor (Amsterdam Food & Drink)
    tripadvisor_results = await beast.scrape_site(
        "https://www.tripadvisor.com/Attractions-g188590-Activities-c36-t132-Amsterdam_North_Holland_Province.html",
        {
            'container': 'div[data-automation="cardWrapper"]',
            'fields': {
                'title': 'div[data-automation="title"]',
                'rating': 'svg[aria-label*="bubbles"]',
                'reviews_count': 'span[aria-label*="reviews"]'
            }
        }
    )

    # 5. Target: TheFork (Amsterdam Restaurants)
    thefork_results = await beast.scrape_site(
        "https://www.thefork.com/restaurants/amsterdam-c31379",
        {
            'container': 'li[data-testid="restaurant-card"]',
            'fields': {
                'name': 'h3',
                'rating': 'span[data-testid="restaurant-card-rating"]',
                'cuisine': 'span[data-testid="restaurant-card-cuisine"]'
            }
        }
    )

    # 6. Target: Reddit (AmsterdamFood) - Real conversations
    reddit_results = await beast.scrape_site(
        "https://www.reddit.com/r/AmsterdamFood/new/",
        {
            'container': 'shreddit-post',
            'fields': {
                'title': 'a[slot="title"]',
                'content': 'div[slot="text-body"]',
                'upvotes': 'span[id*="vote-total"]'
            }
        },
        scroll_times=15 # Deep conversation dive
    )

    all_data = {
        "chefmaison": chefmaison_results,
        "trustpilot": trustpilot_data,
        "airbnb": airbnb_results,
        "tripadvisor": tripadvisor_results,
        "thefork": thefork_results,
        "reddit": reddit_results,
        "metadata": {
            "source": "Universal Playwright Beast - Extreme 360 Mode",
            "timestamp": "2026-03-23",
            "total_items": (
                len(chefmaison_results) + 
                len(airbnb_results) + 
                len(tripadvisor_results) + 
                len(thefork_results) + 
                len(reddit_results) + 
                sum(len(v) for v in trustpilot_data.values())
            )
        }
    }

    os.makedirs("data", exist_ok=True)
    with open("data/extreme_beast_data.json", "w") as f:
        json.dump(all_data, f, indent=4)
    print("✅ EXTREME BEAST data collection complete.")

if __name__ == "__main__":
    asyncio.run(main())
