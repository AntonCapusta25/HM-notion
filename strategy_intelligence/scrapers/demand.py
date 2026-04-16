import re
from pytrends.request import TrendReq
import config as cfg
from agent.analyst import AIAnalyst

def adjust_keywords_for_topic(topic):
    """Uses AI to dynamically generate 5 highly optimized search keywords based on the topic."""
    print(f"  🧠 AI adjusting search keywords for topic: '{topic}'...")
    
    analyst = AIAnalyst(provider="gemini", mock=False)
    sys_prompt = "You are an expert SEO strategist. Respond ONLY with a comma-separated list of exactly 5 high-volume search keywords (max 3 words each) that prospective customers would type into Google to find services related to the given topic. NO OTHER TEXT."
    user_prompt = f"TOPIC: {topic}"
    
    # Bypass standard section analysis prompt structure for this micro-task
    if not analyst.mock:
        import google.generativeai as genai
        try:
            response = analyst.model.generate_content(
                f"{sys_prompt}\n\n{user_prompt}",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                )
            )
            raw_keys = response.text
            # Clean and split
            keys = [k.strip().lower() for k in raw_keys.split(",") if k.strip()]
            if len(keys) >= 1:
                print(f"  ✅ Dynamic Keywords Generated (Gemini): {keys[:5]}")
                return keys[:5]
        except Exception as e:
            print(f"  ⚠️ Keyword generation failed ({e}). Falling back to algorithmic keywords.")
    
    # Fallback to logic if mock or failed
    words = topic.split()
    base = words[0] if words else "service"
    fallback = [
        topic.lower(),
        f"best {topic.lower()}",
        f"{topic.lower()} near me",
        f"{base.lower()} cost",
        f"hire {base.lower()}"
    ][:5]
    print(f"  ✅ Algorithmic Keywords Generated: {fallback}")
    return fallback

def get_google_trends(keywords=None, timeframe='today 12-m', geo='NL'):
    """Greedy fetch for Google Trends (12 months) using dynamic keywords."""
    if not keywords:
        keywords = ["food delivery amsterdam", "dinner party ideas", "vegan amsterdam", "home cooked food", "private dining amsterdam"]
        
    try:
        pytrends = TrendReq(hl='en-US', tz=360)
        # PyTrends only accepts max 5 keywords
        safe_keywords = keywords[:5]
        pytrends.build_payload(safe_keywords, cat=0, timeframe=timeframe, geo=geo, gprop='')
        iot = pytrends.interest_over_time()
        if iot.empty: return {"status": "no_data", "keywords": safe_keywords}
        return {
            "status": "success",
            "keywords": safe_keywords,
            "data": iot.reset_index().to_dict(orient='records')
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "keywords": keywords}

def get_keyword_planner_concepts(topic, keywords):
    """
    Simulated Search Demand / Keyword Planner Metrics.
    In a real scenario, this would hit Ahrefs or Semrush API.
    We estimate volumes based on the generated keywords.
    """
    volumes = [1200, 800, 450, 300, 150]
    cpcs = [2.5, 1.8, 1.2, 0.9, 0.5]
    
    results = []
    for i, kw in enumerate(keywords):
        vol = volumes[i] if i < len(volumes) else 100
        cpc = cpcs[i] if i < len(cpcs) else 0.5
        results.append({"term": kw, "volume": vol, "cpc": cpc})
        
    return {
        "source": f"Search Demand Metrics for '{topic}'",
        "keywords": results
    }

def collect_layer_4(topic="Home Dining Amsterdam", location=cfg.DEFAULT_LOCATION):
    """Aggregates all Layer 4 — Search Demand data."""
    print("--- 📥 Collecting Layer 4: Dynamic Keyword Search Demand ---")
    
    # 1. Adjust Keywords
    dynamic_keywords = adjust_keywords_for_topic(topic)
    
    # 2. Look them up
    return {
        "trends": get_google_trends(keywords=dynamic_keywords, geo='NL'),
        "keywords": get_keyword_planner_concepts(topic, dynamic_keywords)
    }
