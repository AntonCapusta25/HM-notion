import asyncio
from scrapers.giga_beast import GigaBeast
import config as cfg

async def scrape_experiences(topic, location):
    """Scrapes local experiences from platforms like Airbnb using Playwright."""
    print(f"--- 📥 Collecting Layer 3: Experiences (REAL PLAYWRIGHT for '{topic}' in {location}) ---")
    gb = GigaBeast(headless=True)
    
    print(f"  Scraping local Airbnb Experiences for experiential trends...")
    # Airbnb experiences search query
    search_topic = topic.replace(" ", "+")
    airbnb_results = await gb.scrape(
        f"https://www.airbnb.com/s/Amsterdam/experiences?query={search_topic}",
        {'container': 'div[itemprop="itemListElement"]', 'fields': {'title': 'div[id^="title"]', 'price': 'span.a8jt5op'}},
        scroll_depth=5
    )
    
    print(f"  ✅ Extracted {len(airbnb_results)} experiential listings from Airbnb.")
    
    return [
        {"platform": "Airbnb", "results": airbnb_results},
        {"platform": "GetYourGuide", "status": "Dynamic analysis routed to AI Analyst"}
    ]

def collect_layer_3(topic="Home Dining", location=cfg.DEFAULT_LOCATION):
    """Aggregates all Layer 3 — Experiences data using Playwright."""
    return asyncio.run(scrape_experiences(topic, location))
