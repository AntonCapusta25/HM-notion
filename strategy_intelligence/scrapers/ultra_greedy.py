import asyncio
import json
import os
import random
import re
from playwright.async_api import async_playwright

class UltraGreedyBeast:
    def __init__(self, headless=True):
        self.headless = headless
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
        ]

    async def scrape_raw(self, url, keyword_match=None, scroll_depth=50):
        print(f"--- 🚀 ULTRA-GREEDY: {url} ---")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(user_agent=random.choice(self.user_agents))
            page = await context.new_page()
            try:
                await page.goto(url, timeout=90000)
                await asyncio.sleep(5)
                
                # Dismiss modals
                for text in ["Accept", "Agree", "Akkoord", "OK"]:
                    try: await page.click(f'button:has-text("{text}")', timeout=2000)
                    except: pass

                output_text = []
                for i in range(scroll_depth):
                    await page.mouse.wheel(0, 5000)
                    await asyncio.sleep(1)
                    # Extract ALL paragraph and div text as a fallback
                    content = await page.content()
                    # Basic heuristic: look for paragraphs or list items
                    p_tags = await page.query_selector_all('p, li, h3, h4')
                    for p in p_tags:
                        text = await p.inner_text()
                        if text and len(text) > 20:
                            if keyword_match and keyword_match.lower() in text.lower():
                                if text not in output_text: output_text.append(text)
                            elif not keyword_match:
                                if text not in output_text: output_text.append(text)
                    if i % 20 == 0: print(f"  Captured {len(output_text)} snippets...")
                
                await browser.close()
                return output_text
            except Exception as e:
                print(f"Error: {e}")
                await browser.close()
                return []

async def main():
    ugb = UltraGreedyBeast(headless=True)
    all_data = {}
    
    # 1. Trustpilot (Competitors 360)
    all_data["trustpilot_360"] = {}
    for domain in ["thuisbezorgd.nl", "ubereats.com"]:
        all_data["trustpilot_360"][domain] = await ugb.scrape_raw(f"https://www.trustpilot.com/review/{domain}", scroll_depth=30)

    # 2. Reddit (Community Deep Dive)
    all_data["reddit_intel"] = await ugb.scrape_raw("https://www.reddit.com/r/AmsterdamFood/new/", scroll_depth=50)

    # 3. Chef Platforms
    all_data["chef_listing_intel"] = await ugb.scrape_raw("https://www.chefmaison.com/en/find-a-chef", scroll_depth=20)

    os.makedirs("data", exist_ok=True)
    with open("data/ultra_greedy_data.json", "w") as f:
        json.dump(all_data, f, indent=4)
    print(f"✅ ULTRA-GREEDY complete. Total shards: {sum(len(v) if isinstance(v, list) else 0 for v in all_data.values())}")

if __name__ == "__main__":
    asyncio.run(main())
