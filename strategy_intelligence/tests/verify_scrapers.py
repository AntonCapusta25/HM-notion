import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scrapers.reviews import collect_layer_1
from scrapers.food_platforms import collect_layer_2
from scrapers.experiences import collect_layer_3
from scrapers.demand import collect_layer_4
from scrapers.demographics import collect_layer_5
from scrapers.social import collect_layer_6_10
from scrapers.market import collect_layer_8
from scrapers.events import collect_layer_9

def test_scraper(name, func, *args, **kwargs):
    print(f"\n🔍 Testing {name}...")
    try:
        data = func(*args, **kwargs)
        if data:
            print(f"✅ {name} succeeded!")
            # Print a small sample
            if isinstance(data, list):
                print(f"   Items found: {len(data)}")
                if len(data) > 0: print(f"   Sample: {str(data[0])[:100]}...")
            elif isinstance(data, dict):
                print(f"   Keys found: {list(data.keys())}")
        else:
            print(f"⚠️ {name} returned empty data.")
    except Exception as e:
        print(f"❌ {name} failed with error: {e}")

if __name__ == "__main__":
    location = "Amsterdam"
    
    print(f"=== 🧪 Individual Scraper Verification ({location}) ===")
    
    test_scraper("Layer 1: Reviews", collect_layer_1)
    test_scraper("Layer 2: Food Platforms", collect_layer_2, location)
    test_scraper("Layer 3: Experiences", collect_layer_3, location)
    test_scraper("Layer 4: Search Demand", collect_layer_4, location)
    test_scraper("Layer 5: Demographics", collect_layer_5, location)
    test_scraper("Layer 6, 7 & 10: Social/Community", collect_layer_6_10)
    test_scraper("Layer 8: Marketplace Pricing", collect_layer_8, location)
    test_scraper("Layer 9: Events", collect_layer_9, location)
    
    print("\n=== ✨ Verification Complete ===")
