import asyncio
import json
import os
from playwright.async_api import async_playwright

async def scrape_trustpilot(brand_url_part):
    print(f"--- 🐲 BEAST MODE: Scraping Trustpilot for {brand_url_part} ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(f"https://www.trustpilot.com/review/www.{brand_url_part}")
            await asyncio.sleep(3)
            
            # Find any review text
            reviews = []
            elements = await page.query_selector_all('p[data-service-review-text-typography="true"]')
            for el in elements[:20]:
                txt = await el.inner_text()
                if txt:
                    reviews.append({"text": txt, "source": "Trustpilot", "brand": brand_url_part})
            
            await browser.close()
            return reviews
        except Exception as e:
            print(f"Trustpilot error for {brand_url_part}: {e}")
            await browser.close()
            return []

async def scrape_google_maps_fallback(query):
    print(f"--- 🐲 BEAST MODE: Scraping Google Maps Fallback for {query} ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(f"https://www.google.com/maps/search/{query}")
            await asyncio.sleep(5)
            
            # Scrape ALL visible text that looks like a review
            # Look for elements that contain 'star' or are within the review section
            reviews = []
            
            # Try to find 'Reviews' tab and click
            try:
                rev_tab = await page.query_selector('button[aria-label*="Reviews"]')
                if rev_tab: await rev_tab.click(); await asyncio.sleep(2)
            except: pass

            # Just grab all review-like blocks
            elements = await page.query_selector_all('.wiI7eb') # Common review text class
            for el in elements[:30]:
                txt = await el.inner_text()
                if len(txt) > 20: # Filter out short snippets
                    reviews.append({"text": txt, "source": "Google Maps (Wide Search)", "query": query})
            
            await browser.close()
            return reviews
        except Exception as e:
            print(f"Maps error for {query}: {e}")
            await browser.close()
            return []

async def main():
    results = {
        "Thuisbezorgd": [],
        "Uber Eats": [],
        "Kookxtra": []
    }
    
    # 1. Trustpilot (The best source for platform hate)
    results["Thuisbezorgd"].extend(await scrape_trustpilot("thuisbezorgd.nl"))
    results["Uber Eats"].extend(await scrape_trustpilot("ubereats.com"))
    results["Kookxtra"].extend(await scrape_trustpilot("kookxtra.com"))
    
    # 2. Google Maps (Capture local office frustrations)
    results["Thuisbezorgd"].extend(await scrape_google_maps_fallback("Thuisbezorgd Amsterdam Office"))
    results["Uber Eats"].extend(await scrape_google_maps_fallback("Uber Eats Amsterdam Office"))

    os.makedirs("data", exist_ok=True)
    with open("data/competitor_pain_points.json", "w") as f:
        json.dump(results, f, indent=4)
        
    print("✅ BEAST scraping (Loose Mode) complete. Real pain points saved to data/competitor_pain_points.json")

if __name__ == "__main__":
    asyncio.run(main())
