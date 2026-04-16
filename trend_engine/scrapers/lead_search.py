import asyncio
import csv
import os
import re
import urllib.parse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

class CoreScraperEngine:
    """
    A generic scraper engine to find businesses on Google Maps and extract 
    their contact details, including website scraping for email addresses.
    """
    def __init__(self, headless=True, max_results_per_query=50, concurrency_limit=5):
        self.headless = headless
        self.max_results = max_results_per_query
        self.concurrency_limit = concurrency_limit
        self.seen_maps_urls = set()

    async def scrape(self, queries, locations=None, output_csv="results.csv"):
        """Main entry point for scraping."""
        
        # Build search combinations
        search_combinations = []
        if locations and len(locations) > 0:
            for city in locations:
                for q in queries:
                    search_combinations.append(f"{q} {city}")
        else:
            search_combinations = queries

        # Initialize CSV
        file_exists = os.path.exists(output_csv)
        with open(output_csv, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['Query', 'Name', 'Email', 'Website', 'Phone', 'Google Maps URL'])

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=self.headless, 
                args=['--disable-blink-features=AutomationControlled']
            )
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()

            for search_term in search_combinations:
                print(f"\n[{search_term}] Collecting URLs from Google Maps...")
                urls = await self.collect_maps_urls(page, search_term)
                
                if not urls:
                    print(f"  ⚠ No URLs found for '{search_term}'.")
                    continue
                
                print(f"[{search_term}] Extracting data from {len(urls)} locations concurrently...")
                
                semaphore = asyncio.Semaphore(self.concurrency_limit)
                tasks = []
                
                for idx, url in enumerate(urls, 1):
                    if url in self.seen_maps_urls:
                        continue
                        
                    self.seen_maps_urls.add(url)
                    tasks.append(
                        self.process_location(context, url, search_term, idx, len(urls), semaphore, output_csv)
                    )
                    
                if tasks:
                    await asyncio.gather(*tasks)

            await browser.close()
            print(f"\n✅ Scraping finished. Results saved to {output_csv}")

    async def process_location(self, context, url, search_term, idx, total, semaphore, csv_file):
        """Extracts data for a single maps URL and updates the CSV."""
        async with semaphore:
            maps_page = await context.new_page()
            data = None
            try:
                data = await self.extract_maps_data(maps_page, url)
            finally:
                await maps_page.close()
                
            if not data or not data.get('name'):
                return
                
            data['query'] = search_term

            if data.get('website'):
                print(f"  [{idx}/{total}] Scanning website for email: {data['website']}")
                data['email'] = await self.find_email_on_website(context, data['website'])
            else:
                data['email'] = ''

            # Save incrementally
            with open(csv_file, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    data.get('query', ''),
                    data.get('name', ''),
                    data.get('email', ''),
                    data.get('website', ''),
                    data.get('phone', ''),
                    data.get('url', '')
                ])
                
            print(f"  ✓ Saved '{data.get('name')}' to CSV")

    async def collect_maps_urls(self, page, query):
        """Scrolls Google Maps search results to yield specific place URLs."""
        url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            await asyncio.sleep(4) 
            
            # Dismiss cookies
            try:
                accept = page.locator('button:has-text("Accept all"), button:has-text("Accepteer allemaal"), button:has-text("Alle accepteren")').first
                if await accept.is_visible(timeout=3000):
                    await accept.click()
                    await asyncio.sleep(2)
            except:
                pass

            # Scrollable div selectors
            scrollable_selectors = ['div[role="feed"]', 'div.m67qEc', 'div.m67qEc.view-scroll-container']
            scrollable_div = None
            for selector in scrollable_selectors:
                el = page.locator(selector).first
                if await el.is_visible(timeout=2000):
                    scrollable_div = el
                    break
            
            if not scrollable_div:
                links = await page.locator('a[href*="/maps/place/"]').all()
                if links:
                    return list(set([await link.get_attribute('href') for link in links]))
                return []

            previous_count = 0
            no_change = 0
            
            # Scroll to load more
            for _ in range(15):
                await scrollable_div.evaluate('el => el.scrollTop = el.scrollHeight')
                await asyncio.sleep(2.5)
                links = await page.locator('a[href*="/maps/place/"]').all()
                count = len(links)
                
                if count > previous_count:
                    no_change = 0
                else:
                    no_change += 1
                previous_count = count
                
                if count >= self.max_results or no_change >= 3:
                    break
                    
            links = await page.locator('a[href*="/maps/place/"]').all()
            found_urls = []
            for link in links:
                href = await link.get_attribute('href')
                if href and '/maps/place/' in href:
                    found_urls.append(href)
            
            return list(set(found_urls))
        except Exception as e:
            print(f"Error collecting maps URLs: {e}")
            return []

    async def extract_maps_data(self, page, url):
        """Extracts Name, Website, and Phone directly from Google Maps."""
        data = {'url': url, 'name': '', 'website': '', 'phone': ''}
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(1)
            
            # Name
            try:
                name_el = page.locator('h1.DUwDvf').first
                if await name_el.count() == 0:
                    name_el = page.locator('h1').first
                name_text = await name_el.text_content()
                data['name'] = name_text.strip() if name_text else ''
            except: pass
                
            # Website
            try:
                website_el = page.locator('a[data-item-id="authority"]').first
                if await website_el.count() > 0:
                    data['website'] = await website_el.get_attribute('href')
            except: pass
                
            # Phone
            try:
                phone_el = page.locator('button[data-item-id*="phone"]').first
                if await phone_el.count() > 0:
                    phone_label = await phone_el.get_attribute('aria-label')
                    if phone_label:
                        data['phone'] = phone_label.replace('Phone: ', '').replace('Telefoon: ', '').strip()
            except: pass

            return data
        except Exception as e:
            return None

    async def find_email_on_website(self, context, url):
        """Visits a website, its contact pages, and extracts emails using regex."""
        email_regex = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        ignore_emails = ['sentry@', 'example@', 'no-reply@', 'noreply@', 'test@']
        
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)
        found_email = ''
        
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=15000)
            await asyncio.sleep(2)
            
            # 1. Check mailto protocol links
            mailto_links = await page.locator('a[href^="mailto:"]').all()
            for link in mailto_links:
                href = await link.get_attribute('href')
                if href:
                    email = href.replace('mailto:', '').split('?')[0].strip()
                    if email and not any(ign in email for ign in ignore_emails):
                        found_email = email
                        break
            
            # 2. Check inner body HTML regex
            if not found_email:
                text = await page.evaluate('document.body.innerText')
                matches = set(re.findall(email_regex, text))
                for match in matches:
                    if not any(ign in match for ign in ignore_emails) and not match.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg')):
                        found_email = match
                        break
                        
            # 3. Check Dedicated Contact Pages
            if not found_email:
                contact_links = await page.locator('a:has-text("Contact"), a:has-text("contact"), a[href*="contact"]').all()
                if contact_links:
                    contact_url = await contact_links[0].get_attribute('href')
                    if contact_url:
                        contact_full = urllib.parse.urljoin(url, contact_url)
                        try:
                            await page.goto(contact_full, wait_until='domcontentloaded', timeout=10000)
                            await asyncio.sleep(1)
                            
                            # Same check on contact page
                            mailto_links_c = await page.locator('a[href^="mailto:"]').all()
                            for link in mailto_links_c:
                                href = await link.get_attribute('href')
                                if href:
                                    email = href.replace('mailto:', '').split('?')[0].strip()
                                    if email and not any(ign in email for ign in ignore_emails):
                                        return email

                            text_c = await page.evaluate('document.body.innerText')
                            matches_c = set(re.findall(email_regex, text_c))
                            for match in matches_c:
                                if not any(ign in match for ign in ignore_emails) and not match.endswith(('.png', '.jpg', '.jpeg')):
                                    return match
                        except: pass
                        
        except Exception:
            pass
        finally:
            await page.close()
            
        return found_email

# --- FRONTEND/CLI EXPOSURE ---
if __name__ == "__main__":
    import argparse
    import ast
    
    parser = argparse.ArgumentParser(description="Core Engine for Google Maps & Email Scraper")
    parser.add_argument("--queries", required=True, help="List of search queries as a string of list e.g. \"['marketing agency', 'software company']\"")
    parser.add_argument("--locations", required=False, default="[]", help="List of locations as a string of list e.g. \"['Amsterdam', 'Rotterdam']\". If empty, searches without city filter.")
    parser.add_argument("--output", required=False, default="results.csv", help="Output CSV filename")
    parser.add_argument("--limit", required=False, type=int, default=50, help="Max results per search query")
    parser.add_argument("--visible", action="store_true", help="Run with visible browser window (turn OFF headless mode)")
    
    args = parser.parse_args()
    
    try:
        queries_list = ast.literal_eval(args.queries)
        locations_list = ast.literal_eval(args.locations)
        
        # When --visible is provided, headless becomes False
        is_headless = not args.visible
        
        engine = CoreScraperEngine(
            headless=is_headless,
            max_results_per_query=args.limit,
            concurrency_limit=5
        )
        
        asyncio.run(engine.scrape(queries=queries_list, locations=locations_list, output_csv=args.output))
        
    except Exception as e:
        print(f"Failed to parse input arguments. Ensure format is exactly like \"['Item 1', 'Item 2']\". Error: {e}")
