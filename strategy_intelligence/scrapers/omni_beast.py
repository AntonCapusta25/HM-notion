import asyncio
import json
import os
import random
from playwright.async_api import async_playwright

class OmniBeast:
    def __init__(self, headless=True):
        self.headless = headless

    async def scrape_all_text(self, url, depth=30):
        print(f"--- 🚀 OMNI-BEAST: {url} ---")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            page = await context.new_page()
            try:
                await page.goto(url, timeout=90000)
                await asyncio.sleep(5)
                
                all_shards = []
                for _ in range(depth):
                    await page.mouse.wheel(0, 3000)
                    await asyncio.sleep(1)
                    # Extract ALL text from likely review/listing containers
                    shards = await page.evaluate("""() => {
                        const tags = ['p', 'span', 'li', 'h3'];
                        return tags.flatMap(tag => Array.from(document.querySelectorAll(tag)).map(el => el.innerText))
                            .filter(t => t.length > 50);
                    }""")
                    for t in shards:
                        if t not in all_shards: all_shards.append(t)
                
                await browser.close()
                return all_shards
            except Exception as e:
                print(f"Error: {e}")
                await browser.close()
                return []

async def main():
    ob = OmniBeast(headless=True)
    all_data = {}
    
    # 1. Trustpilot - All Ratings
    all_data["trustpilot_omni"] = {}
    for domain in ["thuisbezorgd.nl", "ubereats.com"]:
        all_data["trustpilot_omni"][domain] = await ob.scrape_all_text(f"https://www.trustpilot.com/review/{domain}", depth=20)

    # 2. Reddit - Community
    all_data["reddit_omni"] = await ob.scrape_all_text("https://www.reddit.com/r/AmsterdamFood/new/", depth=30)
    
    # 3. Chef Maison - Listings
    all_data["chefmaison_omni"] = await ob.scrape_all_text("https://www.chefmaison.com/en/find-a-chef", depth=20)

    os.makedirs("data", exist_ok=True)
    with open("data/omni_beast_data.json", "w") as f:
        json.dump(all_data, f, indent=4)
    
    print(f"✅ OMNI-BEAST complete. Total unique shards: {sum(len(v) if isinstance(v, list) else 0 for k, v in all_data.items() if isinstance(v, dict) or isinstance(v, list))}")

if __name__ == "__main__":
    asyncio.run(main())
