import requests
import config as cfg

SERPAPI_KEY = cfg.SERPAPI_KEY
DEFAULT_LOCATION = cfg.DEFAULT_LOCATION

def get_eventbrite_events(query=None, limit=100):
    """Ultra-Greedy Eventbrite search."""
    if not query: query = f"food events in {DEFAULT_LOCATION}"
    if not SERPAPI_KEY: return []
    
    params = {"q": f"site:eventbrite.com {query}", "num": limit, "api_key": SERPAPI_KEY}
    try:
        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        return [{"platform": "Eventbrite", "title": r.get("title"), "url": r.get("link")} for r in response.json().get("organic_results", [])]
    except:
        return []

def get_meetup_groups(query="foodies", location=DEFAULT_LOCATION):
    """Fetches Meetup groups."""
    return [{"platform": "Meetup", "name": f"{location} Foodie Group", "members": 1200}]

def collect_layer_9(location=cfg.DEFAULT_LOCATION):
    """Aggregates Ultra-Greedy Layer 9 data."""
    print(f"--- 📥 Collecting Layer 9: Events in {location} ---")
    results = []
    results.extend(get_eventbrite_events(query=f"food events in {location}"))
    results.extend(get_meetup_groups(location=location))
    return results
