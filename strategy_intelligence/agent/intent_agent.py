import json
import sys
import time
import google.generativeai as genai
from strategy_intelligence.agent.company_context import HOMEMADE_CONTEXT
from strategy_intelligence.config import GEMINI_API_KEY

AVAILABLE_CAPABILITIES = {
    "scrapers": [
        {"id": 1, "name": "Review Mining & Competitor Failures", "focus": "Pain points from Thuisbezorgd/UberEats"},
        {"id": 8, "name": "Keyword Intelligence & SEO", "focus": "Google Trends & Search Intent for Amsterdam"},
        {"id": 3, "name": "Pricing Analysis", "focus": "Competitor menu pricing comparison"},
        {"id": 2, "name": "UX Funnel Analysis", "focus": "Competitor conversion gaps"},
        {"id": 4, "name": "Social Demand Mining", "focus": "Unmet needs from Reddit/Quora"},
        {"id": 7, "name": "Holiday & Event Forecasting", "focus": "High-demand calendar events (Kings Day, etc.)"},
        {"id": 6, "name": "Market Catalog Extractor", "focus": "Full restaurant directory & menu parity"},
        {"id": 9, "name": "Google Maps Partnership Finder", "focus": "Local business collaborations (Gyms, Offices, etc.)"}
    ],
    "reports": [
        {"id": "full-report", "name": "360° Executive Strategy PDF", "focus": "Comprehensive roadmap across all data points"},
        {"id": "strategy", "name": "Tactical Recommendation Feed", "focus": "Specific team tasks for Menna/Walid"},
        {"id": "campaign", "name": "AI Marketing Copy", "focus": "Facebook/IG Ad assets based on data"}
    ]
}

INTENT_SYSTEM_PROMPT = f"""
{HOMEMADE_CONTEXT}

# YOUR ROLE:
You are the Autonomous Intelligence Orchestrator. 
Your job is to analyze a user's strategic 'Intent' and decide which of our technical capabilities should be triggered to fulfill that goal efficiently.

# AVAILABLE TOOLS:
{json.dumps(AVAILABLE_CAPABILITIES, indent=2)}

# RULES:
1. Be precise. Only trigger suites that are relevant to the requested intent.
2. If the user wants to "start" or "analyze everything", trigger a full scan (1, 8, 4, 3) followed by a 'full-report'.
3. Always respond in STRICT JSON format with two keys: 'reasoning' (string) and 'pipeline' (list of TASK OBJECTS).
4. Each TASK OBJECT must have: 'id' (int/string) and 'params' (object).
5. For Scraper 8 (Keywords) and Scraper 9 (Partnerships), suggest 5-10 targeted 'themes' or 'queries' in params based on the intent.
6. For Scraper 1 (Reviews) and 4 (Social), specify a 'focus' in params.
7. For Reports (strategy/campaign), specify 'audience' or 'tone' in params.
8. Include a 'global_context' object with 'target_location' and 'primary_market'.
9. For Scraper 9, generate specific local business categories (e.g., 'gyms in amsterdam west', 'yoga studios near jordaan') that align with the intent.
"""

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-3-flash-preview')

def analyze_intent(user_intent):
    attempts = 3
    last_error = None
    
    print(f"🧠 Orchestrator: Analyzing intent...", flush=True)
    for attempt in range(attempts):
        try:
            print(f"  Attempt {attempt + 1}/{attempts} via Gemini...", flush=True)
            # Prepend system prompt to ensure steering on older SDK versions
            prompt = f"{INTENT_SYSTEM_PROMPT}\n\nUser Intent: {user_intent}\n\nRespond only with the JSON object."
            response = model.generate_content(
                prompt
            )
            content = response.text.strip()
            
            # Robust JSON extraction
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
                
            plan = json.loads(content)
            print(f"  ✅ Intent decoded. Pipeline tasks: {len(plan.get('pipeline', []))}", flush=True)
            
            # Ensure proper structure
            plan["pipeline"] = plan.get("pipeline", [])
            plan["reasoning"] = plan.get("reasoning", "AI analyzed the intent but forgot to provide reasoning.")
            plan["global_context"] = plan.get("global_context", {"target_location": "Amsterdam"})
            
            return plan
        except Exception as e:
            last_error = e
            print(f"⚠️ Intent Analysis Attempt {attempt+1} failed: {e}", file=sys.stderr)
            if attempt < attempts - 1:
                time.sleep(2) # Backoff
                continue
            
    return {
        "reasoning": f"AI Orchestration Error: {str(last_error)}",
        "pipeline": [],
        "raw_output": str(last_error)
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        intent = sys.argv[1]
    else:
        intent = sys.stdin.read().strip()
        
    if not intent:
        print(json.dumps({"error": "No intent provided"}))
        sys.exit(1)
        
    result = analyze_intent(intent)
    print(json.dumps(result, indent=2))
