import asyncio
import json
import os
import random
from playwright.async_api import async_playwright

class MultiRatingBeast:
    def __init__(self, headless=True):
        self.headless = headless
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        ]

    async def scrape_ratings(self, domain, stars=[1, 2, 3, 4, 5]):
        print(f"--- 🚀 MULTI-RATING BEAST: {domain} (Stars: {stars}) ---")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(user_agent=random.choice(self.user_agents))
            page = await context.new_page()
            
            all_reviews = []
            for star in stars:
                url = f"https://www.trustpilot.com/review/{domain}?stars={star}"
                print(f"  Targeting {star}-star reviews: {url}")
                try:
                    await page.goto(url, timeout=60000)
                    await asyncio.sleep(3)
                    
                    # Scroll a bit
                    for _ in range(5):
                        await page.mouse.wheel(0, 2000)
                        await asyncio.sleep(1)
                    
                    elements = await page.query_selector_all('div[data-service-review-card-paper="true"]')
                    for el in elements:
                        try:
                            text_el = await el.query_selector('p[data-interaction-wrapper="true"]')
                            text = await text_el.inner_text() if text_el else None
                            if text:
                                all_reviews.append({"rating": star, "text": text})
                        except: continue
                except Exception as e:
                    print(f"    Error on {star} stars: {e}")
            
            await browser.close()
            return all_reviews

async def main():
    mrb = MultiRatingBeast(headless=True)
    domains = ["thuisbezorgd.nl", "ubereats.com", "kookextra.nl"]
    
    results = {}
    for domain in domains:
        results[domain] = await mrb.scrape_ratings(domain)
    
    os.makedirs("data", exist_ok=True)
    with open("data/multi_rating_beast.json", "w") as f:
        json.dump(results, f, indent=4)
    print("✅ MULTI-RATING BEAST complete. 360 Competitive Review Map created.")

if __name__ == "__main__":
    asyncio.run(main())
