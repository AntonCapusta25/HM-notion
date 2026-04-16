import asyncio
from scrapers.giga_beast import GigaBeast
import config as cfg

async def scrape_thefork(topic):
    """Massive Restaurant Pull from TheFork using Playwright."""
    print(f"--- 📥 Collecting Layer 2: Food Platforms (REAL PLAYWRIGHT for '{topic}') ---")
    gb = GigaBeast(headless=True)
    
    print("  Scraping TheFork Amsterdam directory...")
    # TheFork is heavily dynamic, GigaBeast logic fits perfectly
    results = await gb.scrape(
        "https://www.thefork.com/restaurants/amsterdam-c31379",
        {'container': 'li[data-testid="restaurant-card"]', 'fields': {'name': 'h3', 'rating': 'span[data-testid="restaurant-card-rating"]'}},
        scroll_depth=10  
    )
    
    print(f"  ✅ Extracted {len(results)} restaurant profiles from TheFork.")
    return {
        "thefork": results,
        "opentable": [], # Fallback handled by AI Analyst
        "zomato": []     
    }

def collect_layer_2(topic="Home Dining Amsterdam", location=cfg.DEFAULT_LOCATION):
    """Aggregates all Layer 2 — Food Platforms using real Playwright logic."""
    return asyncio.run(scrape_thefork(topic))
