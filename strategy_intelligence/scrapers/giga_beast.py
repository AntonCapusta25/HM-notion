import asyncio
import json
import os
import random
from playwright.async_api import async_playwright

class GigaBeast:
    def __init__(self, headless=True):
        self.headless = headless
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
        ]

    async def scrape(self, url, selectors, scroll_depth=50):
        print(f"--- 🚀 GIGA-BEAST: Scraping {url} (Depth: {scroll_depth}) ---")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(user_agent=random.choice(self.user_agents))
            page = await context.new_page()
            try:
                await page.goto(url, timeout=90000)
                await asyncio.sleep(5)
                
                # Dismiss modals
                for text in ["Accept", "Agree", "Akkoord", "Dismiss"]:
                    try: await page.click(f'button:has-text("{text}")', timeout=2000)
                    except: pass

                data = []
                for i in range(scroll_depth):
                    await page.mouse.wheel(0, 5000)
                    if i % 10 == 0: print(f"  Scrolled {i}/{scroll_depth}...")
                    await asyncio.sleep(1)
                    
                    elements = await page.query_selector_all(selectors['container'])
                    for el in elements:
                        try:
                            item = {}
                            for k, v in selectors['fields'].items():
                                sub = await el.query_selector(v)
                                item[k] = await sub.inner_text() if sub else None
                            if item not in data: data.append(item)
                        except: continue
                
                await browser.close()
                return data
            except Exception as e:
                print(f"Error: {e}")
                await browser.close()
                return []

async def main():
    gb = GigaBeast(headless=True)
    all_extreme_data = {}
    
    # 1. Keywords (Expanded)
    keywords = ["home chef amsterdam", "private dining amsterdam", "vegan catering amsterdam", "halal chef at home", "luxury dinner party amsterdam"]
    
    # 2. LinkedIn (Vibe check for corporate/luxury demand)
    # Note: LinkedIn is tricky, we'll try a public search
    all_extreme_data["linkedin_signals"] = await gb.scrape(
        "https://www.google.com/search?q=site:linkedin.com+amsterdam+private+chef+hiring",
        {'container': 'div.g', 'fields': {'title': 'h3', 'snippet': 'div.VwiC3b'}},
        scroll_depth=20
    )

    # 3. Reddit (Deep Dive)
    reddit_subs = ["AmsterdamFood", "amsterdam", "Netherlands", "Expats"]
    all_extreme_data["reddit"] = []
    for sub in reddit_subs:
        all_extreme_data["reddit"].extend(await gb.scrape(
            f"https://www.reddit.com/r/{sub}/search/?q=private%20chef%20home%20cooking",
            {'container': 'shreddit-post', 'fields': {'title': 'a[slot="title"]', 'body': 'div[slot="text-body"]'}},
            scroll_depth=30
        ))

    # 4. TheFork (Massive Restaurant Pull)
    all_extreme_data["thefork"] = await gb.scrape(
        "https://www.thefork.com/restaurants/amsterdam-c31379",
        {'container': 'li[data-testid="restaurant-card"]', 'fields': {'name': 'h3', 'rating': 'span[data-testid="restaurant-card-rating"]'}},
        scroll_depth=100 # GIGA DEPTH
    )

    os.makedirs("data", exist_ok=True)
    with open("data/giga_beast_data.json", "w") as f:
        json.dump(all_extreme_data, f, indent=4)
    print(f"✅ GIGA-BEAST complete. Thousands of shards collected.")

if __name__ == "__main__":
    asyncio.run(main())
