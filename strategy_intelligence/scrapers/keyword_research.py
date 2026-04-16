import asyncio
import httpx
import json
import sqlite3
import uuid
import os
from datetime import datetime

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")
SUGGEST_URL = "http://suggestqueries.google.com/complete/search?client=chrome&q="

class KeywordIntelligenceScanner:
    async def call_ollama_async(self, client, prompt: str, schema: str = "") -> dict:
        payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}
        if schema: payload["format"] = "json"
        try:
            resp = await client.post(OLLAMA_URL, json=payload, timeout=300.0)
            resp.raise_for_status()
            text = resp.json().get("response", "").strip()
            return json.loads(text) if schema else text
        except: return {}

    async def fetch_suggestions(self, client, query: str) -> list:
        try:
            resp = await client.get(f"{SUGGEST_URL}{query}", timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            # Google Suggester returns: [query, [suggestions], [metadata], ...]
            if isinstance(data, list) and len(data) > 1:
                suggestions = data[1]
                if isinstance(suggestions, list):
                    return [str(s) for s in suggestions]
            return []
        except: return []

    async def recursive_discovery(self, client, seed: str, depth: int = 1) -> set:
        print(f"  🔍 API Discovery: {seed} (Depth: {depth})...")
        discovered = set()
        suggestions = await self.fetch_suggestions(client, seed)
        for s in suggestions: discovered.add(str(s))
        
        if depth > 0 and suggestions:
            # Expand top 5 suggestions
            top_5 = suggestions[:5]
            tasks = [self.fetch_suggestions(client, str(s)) for s in top_5]
            results = await asyncio.gather(*tasks)
            for res in results:
                if isinstance(res, list):
                    for item in res: discovered.add(str(item))
        return discovered

    async def run_suite_async(self, themes, session_id=None):
        print(f"--- 🚀 INITIATING HIGH-VOLUME KEYWORD API MINER (Session: {session_id}) ---")
        all_discovered = set()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            discovery_tasks = [self.recursive_discovery(client, theme, depth=1) for theme in themes]
            results = await asyncio.gather(*discovery_tasks)
            for res in results:
                if isinstance(res, set):
                    all_discovered.update(res)
        
        # Select best 500 for AI filtering
        final_list = list(all_discovered)
        subset_for_ai = final_list[:500] if len(final_list) > 500 else final_list
        
        print(f"📦 Total Discovered: {len(final_list)} keywords. Selecting Top 25 via AI...")
        
        if not final_list:
            print("✅ No keywords discovered.")
            return

        async with httpx.AsyncClient(timeout=300.0) as client:
            selection_prompt = f"""
            Select the Top 25 most strategic keywords for "Homemade" (premium home-chef delivery in Amsterdam).
            Focus on commercial intent and local relevance.
            
            DISCOVERED KEYWORDS:
            {", ".join(subset_for_ai)}
            
            Output valid JSON:
            {{"top_keywords": [{{
                "keyword": "string", "intent": "commercial|informational", 
                "competition": "high|medium|low", "est_volume": integer
            }}]}}
            """
            selection = await self.call_ollama_async(client, selection_prompt, schema="json")
            
            if not selection or not isinstance(selection, dict):
                print("❌ AI Selection failed. Saving raw top 25.")
                top_k = [{"keyword": k, "intent": "unknown", "competition": "medium", "est_volume": 100} for k in final_list[:25]]
            else:
                top_k = selection.get("top_keywords", [])

            conn = sqlite3.connect(DB_PATH, timeout=20)
            cursor = conn.cursor()
            for kw in top_k:
                if not isinstance(kw, dict): continue
                cursor.execute("""
                    INSERT OR REPLACE INTO market_keywords 
                    (id, keyword, search_volume_estimate, competition_index, intent_category, source, session_id, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()), kw.get('keyword'), kw.get('est_volume', 100), 
                    kw.get('competition', 'medium'), kw.get('intent', 'commercial'),
                    "Google/API-Selected", session_id, datetime.now().isoformat()
                ))
            conn.commit()
            conn.close()
            print(f"🏆 API KEYWORD MINER COMPLETE. SAVED TOP {len(top_k)} ASSETS.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str)
    parser.add_argument("--themes", type=str)
    args, unknown = parser.parse_known_args()
    
    seeds = [t.strip() for t in args.themes.split(",")] if args.themes else ["healthy meal delivery amsterdam", "private chef amsterdam", "home cooked food delivery"]
    asyncio.run(KeywordIntelligenceScanner().run_suite_async(seeds, session_id=args.session_id))
