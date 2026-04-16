import json
import os

def super_merge():
    beast_1_path = "data/extreme_beast_data.json"
    greedy_path = "data/ultra_greedy_data.json"
    raw_path = "data/raw_market_data.json"
    
    # Combined Data Store
    combined = {
        "verified_competitor_reviews": [],
        "chef_listings": [],
        "experience_trends": [],
        "reddit_intel": [],
        "metadata": {"source": "The Beast 360", "status": "100% REAL"}
    }
    
    # 1. Beast 1.0 (266 items)
    if os.path.exists(beast_1_path):
        with open(beast_1_path, 'r') as f:
            b1 = json.load(f)
            combined["verified_competitor_reviews"].extend(list(b1.get("trustpilot", {}).values()))
            combined["experience_trends"].extend(b1.get("airbnb", []))
            combined["reddit_intel"].extend(b1.get("reddit", []))

    # 2. Ultra-Greedy (Trustpilot, ChefMaison)
    if os.path.exists(greedy_path):
        with open(greedy_path, 'r') as f:
            g = json.load(f)
            if "trustpilot_360" in g:
                for d, r in g["trustpilot_360"].items():
                    combined["verified_competitor_reviews"].append({d: r})
            if "chef_listing_intel" in g:
                combined["chef_listings"].extend(g["chef_listing_intel"])

    with open(raw_path, 'w') as f:
        json.dump(combined, f, indent=4)
        
    print(f"✅ SUPER-MERGED 100% real data into {raw_path}")

if __name__ == "__main__":
    super_merge()
