import asyncio
import csv
import os
import re
import json
import urllib.parse
import sqlite3
from datetime import datetime
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

class CoreScraperEngine:
    """
    Upgraded Lead Generation Engine: Finds businesses on Google Maps, 
    extracts details, and deep-web scrapes websites for emails.
    """
    def __init__(self, headless=True, max_results_per_query=20, concurrency_limit=3):
        self.headless = headless
        self.max_results = max_results_per_query
        self.concurrency_limit = concurrency_limit
        self.seen_maps_urls = set()

    async def scrape(self, session_id, queries, output_csv=None):
        """Orchestrates the scraping flow with SQLite persistence."""
        print(f"--- 📍 INITIATING HIGH-FIDELITY LEAD DISCOVERY (Session: {session_id}) ---")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=self.headless, 
                args=['--disable-blink-features=AutomationControlled']
            )
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 800},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()

            for search_term in queries:
                print(f"\n🔍 Collecting leads for: {search_term}...")
                urls = await self.collect_maps_urls(page, search_term)
                
                if not urls:
                    print(f"  ⚠ No results found for '{search_term}'.")
                    continue
                
                print(f"  ⚡ Processing {len(urls)} locations concurrently...")
                semaphore = asyncio.Semaphore(self.concurrency_limit)
                tasks = []
                
                for idx, url in enumerate(urls, 1):
                    if url in self.seen_maps_urls: continue
                    self.seen_maps_urls.add(url)
                    tasks.append(
                        self.process_location(context, url, search_term, idx, len(urls), semaphore, session_id)
                    )
                    
                if tasks:
                    await asyncio.gather(*tasks)

            await browser.close()
            print(f"\n✅ LEAD DISCOVERY COMPLETE FOR SESSION: {session_id}")

    async def process_location(self, context, url, search_term, idx, total, semaphore, session_id):
        """Extracts data for a single maps URL and updates SQLite."""
        async with semaphore:
            maps_page = await context.new_page()
            data = None
            try:
                data = await self.extract_maps_data(maps_page, url)
            finally:
                await maps_page.close()
                
            if not data or not data.get('name'): return
                
            data['query'] = search_term
            data['session_id'] = session_id
            data['email'] = ''

            if data.get('website'):
                print(f"    [{idx}/{total}] Scanning: {data['website']}")
                data['email'] = await self.find_email_on_website(context, data['website'])
            
            # Save to SQLite
            self.save_to_db(data)
            print(f"    ✓ Lead Secured: {data['name']} {'(Email Found)' if data['email'] else ''}")

    def save_to_db(self, data):
        conn = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conn.cursor()
        try:
            # Check if exists in session
            cursor.execute("SELECT id FROM partnerships WHERE name = ? AND session_id = ?", (data['name'], data['session_id']))
            if cursor.fetchone(): return

            cursor.execute("""
                INSERT INTO partnerships (id, name, category, website, phone, email, session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                f"partner_{int(datetime.now().timestamp())}_{os.urandom(4).hex()}",
                data['name'],
                data['query'], # Store query as category for context
                data['website'],
                data['phone'],
                data['email'],
                data['session_id']
            ))
            
            conn.commit()
        except Exception as e:
            print(f"    ❌ DB Error: {e}")
        finally:
            conn.close()

    async def collect_maps_urls(self, page, query):
        url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            await asyncio.sleep(4) 
            
            # Dismiss cookies (Dutch & Global)
            try:
                accept = page.locator('button:has-text("Accept all"), button:has-text("Accepteer allemaal"), button:has-text("Alles accepteren")').first
                if await accept.is_visible(timeout=3000):
                    await accept.click()
                    await asyncio.sleep(2)
            except: pass

            # Scrollable div
            scrollable_selectors = ['div[role="feed"]', 'div.m67qEc']
            scrollable_div = None
            for selector in scrollable_selectors:
                el = page.locator(selector).first
                if await el.is_visible(timeout=2000):
                    scrollable_div = el
                    break
            
            if not scrollable_div: return []

            # Scroll to load
            for _ in range(3): # Limit to 3 scrolls for speed in pipeline
                await scrollable_div.evaluate('el => el.scrollTop = el.scrollHeight')
                await asyncio.sleep(2)
                    
            links = await page.locator('a[href*="/maps/place/"]').all()
            found_urls = []
            for link in links:
                href = await link.get_attribute('href')
                if href: found_urls.append(href)
            
            return list(set(found_urls))[:self.max_results]
        except Exception as e:
            return []

    async def extract_maps_data(self, page, url):
        data = {'url': url, 'name': '', 'website': '', 'phone': ''}
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(1)
            
            # Name
            name_el = page.locator('h1.DUwDvf').first
            data['name'] = await name_el.text_content() or ''
                
            # Website
            website_el = page.locator('a[data-item-id="authority"]').first
            if await website_el.count() > 0:
                data['website'] = await website_el.get_attribute('href')
                
            # Phone
            phone_el = page.locator('button[data-item-id*="phone"]').first
            if await phone_el.count() > 0:
                phone_label = await phone_el.get_attribute('aria-label')
                data['phone'] = phone_label.replace('Phone: ', '').replace('Telefoon: ', '').strip()

            return data
        except: return None

    async def find_email_on_website(self, context, url):
        email_regex = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)
        found_email = ''
        
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=10000)
            await asyncio.sleep(1)
            
            # Check mailto
            mailto = await page.locator('a[href^="mailto:"]').first.get_attribute('href') if await page.locator('a[href^="mailto:"]').count() > 0 else None
            if mailto:
                found_email = mailto.replace('mailto:', '').split('?')[0].strip()
            
            # Regex fallback
            if not found_email:
                text = await page.evaluate('document.body.innerText')
                match = re.search(email_regex, text)
                if match: found_email = match.group(0)
                        
        except: pass
        finally: await page.close()
        return found_email

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", required=True)
    parser.add_argument("--queries", required=True)
    args = parser.parse_args()
    
    try:
        queries_list = json.loads(args.queries)
        engine = CoreScraperEngine(headless=True, max_results_per_query=10)
        asyncio.run(engine.scrape(session_id=args.session_id, queries=queries_list))
    except Exception as e:
        print(f"Error parsing queries: {e}")
