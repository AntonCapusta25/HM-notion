import asyncio
from playwright.async_api import async_playwright
import os

async def debug_search(query):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        
        print(f"🔍 Searching for: {query}")
        search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
        await page.goto(search_url)
        await asyncio.sleep(5) # Wait for load/cookies
        
        # Take screenshot of the result list
        screenshot_path = os.path.join(os.getcwd(), "strategy_intelligence/data/debug_maps_result.png")
        await page.screenshot(path=screenshot_path)
        print(f"📸 Screenshot saved to: {screenshot_path}")
        
        # Check for results
        results = await page.get_by_role("link", name=re.compile(r".*", re.IGNORECASE)).all() if False else [] # placeholder
        print(f"🔢 Found roughly {len(await page.locator('div[role=\"feed\"] > div').all())} items in feed.")
        
        await browser.close()

if __name__ == "__main__":
    import sys
    q = sys.argv[1] if len(sys.argv) > 1 else "CrossFit Amsterdam West"
    asyncio.run(debug_search(q))
