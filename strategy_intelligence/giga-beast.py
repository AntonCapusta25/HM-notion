import asyncio
import json
from playwright.async_api import async_playwright
import random
import os

async def giga_scrape():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        all_data = {
            "trustpilot": {},
            "chefmaison": [],
            "mijnchef": [],
            "reddit": []
        }

        # 1. Trustpilot Aggressive (Expanded Targets)
        targets = [
            "https://www.trustpilot.com/review/thuisbezorgd.nl",
            "https://www.trustpilot.com/review/ubereats.com",
            "https://www.trustpilot.com/review/hellofresh.nl",
            "https://www.trustpilot.com/review/picnic.nl",
            "https://www.trustpilot.com/review/takeachef.com",
            "https://www.trustpilot.com/review/chefmaison.com",
            "https://www.trustpilot.com/review/getir.com",
            "https://www.trustpilot.com/review/zapp.com"
        ]
        
        for url in targets:
            domain = url.split("/")[-1]
            print(f"Scraping {domain}...")
            try:
                # Use a fresh context/page if needed, but here we just wait
                response = await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                if not response:
                    print(f"Empty response for {domain}")
                    continue
                
                await page.wait_for_timeout(2000) # Give it a second to settle
                
                reviews = []
                for i in range(50): # Deep scroll
                    await page.mouse.wheel(0, 4000)
                    await asyncio.sleep(0.5)
                    if i % 10 == 0:
                        print(f"  ... scrolled {i} times")
                
                items = await page.query_selector_all('article')
                for item in items:
                    try:
                        text_el = await item.query_selector('p[data-review-content-typography]')
                        text = await text_el.inner_text() if text_el else None
                        
                        date_el = await item.query_selector('time')
                        date = await date_el.get_attribute('datetime') if date_el else None
                        
                        rating_el = await item.query_selector('div[data-star-rating]')
                        rating = await rating_el.get_attribute('data-star-rating') if rating_el else None
                        
                        if text:
                            reviews.append({"text": text, "date": date, "rating": rating})
                    except Exception:
                        continue
                
                all_data["trustpilot"][domain] = reviews
                print(f"✅ Captured {len(reviews)} reviews for {domain}")
            except Exception as e:
                print(f"❌ Failed {domain}: {e}")
                continue

        # 2. ChefMaison (Deep)
        print("Scraping ChefMaison...")
        try:
            await page.goto("https://www.chefmaison.com/en/find-a-chef/amsterdam", timeout=60000)
            await page.wait_for_timeout(3000)
            for _ in range(100):
                await page.mouse.wheel(0, 2000)
                await asyncio.sleep(0.2)
            
            chefs = await page.query_selector_all('h3')
            for chef in chefs:
                name = await chef.inner_text()
                if name: all_data["chefmaison"].append(name)
            print(f"Captured {len(all_data['chefmaison'])} chefs from ChefMaison")
        except Exception as e:
            print(f"Failed ChefMaison: {e}")

        # 3. Reddit Intel (Aggressive Search)
        print("Scraping Reddit...")
        try:
            await page.goto("https://www.reddit.com/r/AmsterdamFood/search/?q=private%20chef%20review&restrict_sr=1", timeout=60000)
            await page.wait_for_timeout(5000)
            for _ in range(50):
                await page.mouse.wheel(0, 2000)
                await asyncio.sleep(0.2)
            posts = await page.query_selector_all('a[data-click-id="body"]')
            for post in posts:
                title = await post.inner_text()
                link = await post.get_attribute('href')
                all_data["reddit"].append({"title": title, "link": f"https://reddit.com{link}"})
            print(f"Captured {len(all_data['reddit'])} Reddit threads")
        except Exception as e:
            print(f"Failed Reddit: {e}")

        with open("data/extreme_beast_data.json", "w") as f:
            json.dump(all_data, f, indent=4)

        await browser.close()

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    asyncio.run(giga_scrape())
