import json
import os

def omni_merge():
    beast_1_path = "data/extreme_beast_data.json"
    omni_path = "data/omni_beast_data.json"
    raw_path = "data/raw_market_data.json"
    
    combined = {
        "verified_competitor_reviews": [],
        "experience_trends": [],
        "reddit_intel": [],
        "raw_text_shards": [],
        "metadata": {"intelligence_mode": "OMNI_BEAST_360", "source": "100% REAL WEB DATA"}
    }
    
    # 1. Beast 1.0
    if os.path.exists(beast_1_path):
        with open(beast_1_path, 'r') as f:
            b1 = json.load(f)
            # Flatten trustpilot and filter nulls
            for domain, reviews in b1.get("trustpilot", {}).items():
                valid_reviews = [r for r in reviews if r.get("text")]
                if valid_reviews:
                    combined["verified_competitor_reviews"].append({
                        "source": f"Trustpilot: {domain}", 
                        "count": len(valid_reviews),
                        "reviews": valid_reviews
                    })
            
            # Airbnb Experiences
            airbnb = [a.get("title") for a in b1.get("airbnb", []) if a.get("title")]
            if airbnb:
                combined["experience_trends"] = airbnb
            
            # Reddit (if any)
            reddit = [r for r in b1.get("reddit", []) if isinstance(r, dict) and r.get("title")]
            if reddit:
                combined["reddit_intel"] = reddit
            
            # ChefMaison
            chefs = b1.get("chefmaison", [])
            if chefs:
                combined["verified_chef_listings"] = chefs

    # 2. Omni Beast Shards
    if os.path.exists(omni_path):
        with open(omni_path, 'r') as f:
            omni = json.load(f)
            for key, val in omni.items():
                # Filter for non-empty shards
                clean_shards = [s for s in val if isinstance(s, str) and len(s) > 20]
                if clean_shards:
                    combined["raw_text_shards"].append({"layer": key, "shards": clean_shards})

    # 3. Ultra Greedy (The Real Beast)
    ultra_path = "data/ultra_greedy_data.json"
    if os.path.exists(ultra_path):
        with open(ultra_path, 'r') as f:
            ultra = json.load(f)
            combined["trustpilot_360"] = ultra.get("trustpilot_360", {})
            combined["chef_listing_intel"] = ultra.get("chef_listing_intel", [])

    # 4. Competitor Pain Points
    pain_path = "data/competitor_pain_points.json"
    if os.path.exists(pain_path):
        with open(pain_path, 'r') as f:
            pain = json.load(f)
            combined["market_pain_points"] = pain

    with open(raw_path, 'w') as f:
        json.dump(combined, f, indent=4)
        
    print(f"✅ OMNI-MERGE complete. Results: { {k: len(v) if isinstance(v, (list, dict)) else 0 for k, v in combined.items()} }")

if __name__ == "__main__":
    omni_merge()
