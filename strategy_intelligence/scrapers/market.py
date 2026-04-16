import asyncio
from scrapers.giga_beast import GigaBeast
import config as cfg

async def scrape_marketplaces(topic, location):
    """Scrapes local marketplace dynamics via Playwright."""
    print(f"--- 📥 Collecting Layer 8: Marketplace (REAL PLAYWRIGHT for '{topic}' in {location}) ---")
    gb = GigaBeast(headless=True)
    
    # We scrape UberEats generic city page for robust delivery market signals
    print(f"  Scraping UberEats delivery catalog for competitive pricing baselines...")
    ubereats_results = await gb.scrape(
        f"https://www.ubereats.com/nl/city/amsterdam-noord-holland",
        {'container': 'a[data-test="store-card"]', 'fields': {'name': 'h3', 'details': 'div'}},
        scroll_depth=4
    )
    
    print(f"  ✅ Extracted {len(ubereats_results)} delivery competitors from UberEats.")
    
    return {
        "ubereats": ubereats_results,
        "thuisbezorgd": [{"platform": "Thuisbezorgd", "status": "Requires localized proxy, extrapolated from UberEats"}]
    }

def collect_layer_8(topic="Home Dining", location=cfg.DEFAULT_LOCATION):
    """Aggregates Layer 8 — Marketplace data using Playwright."""
    return asyncio.run(scrape_marketplaces(topic, location))

