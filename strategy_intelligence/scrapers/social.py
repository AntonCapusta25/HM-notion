import httpx
import asyncio
import json
import sqlite3
import uuid
import os
import time
from datetime import datetime
from bs4 import BeautifulSoup

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

TARGET_SUBREDDITS = ["Amsterdam", "Netherlands", "expats", "ExpatAmsterdam"]
SEARCH_TERMS = ["food delivery", "home cooked", "meal delivery", "lack of healthy", "private chef", "dinner party"]

async def call_ollama_async(prompt: str) -> str:
    """Non-blocking async call to local Llama 3."""
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            resp = await client.post(OLLAMA_URL, json={
                "model": MODEL_NAME, "prompt": prompt, "stream": False, "format": "json"
            })
            resp.raise_for_status()
            return resp.json().get("response", "")
        except Exception as e:
            print(f"    ⚠️ Ollama Error: {e}")
            return ""

async def scrape_reddit_term(sub, term, session_id, focus):
    print(f"  🔍 r/{sub} -> '{term}'...")
    url = f"https://old.reddit.com/r/{sub}/search?q={term}&restrict_sr=on&sort=relevance&t=all"
    headers = {"User-Agent": f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) {uuid.uuid4()}"}
    
    try:
        async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            # Extract search result titles and snippet snippets
            items = soup.select('.search-result-link')
            if not items:
                # Fallback to general text if no specific search results
                text = soup.get_text(separator=' ', strip=True)[:3000]
            else:
                text = " ".join([i.get_text(strip=True) for i in items[:15]]) # Top 15 results

            if len(text) < 500:
                return 0
            
            focus_prompt = f" RESEARCH FOCUS: {focus}" if focus else ""
            prompt = f"""
            Identify UNMET NEEDS from these Reddit discussions in r/{sub} about '{term}'.{focus_prompt}
            Text: {text}
            Output JSON: {{"unmet_needs": [{{"unmet_need": "str", "need_category": "str", "customer_segment": "str", "validation_score": int, "homemade_solution": "str", "post_text": "str", "competitive_gap": int}}]}}
            """
            
            res = await call_ollama_async(prompt)
            if not res: return 0
            
            try:
                data = json.loads(res.strip())
                injected = 0
                conn = sqlite3.connect(DB_PATH, timeout=20)
                cursor = conn.cursor()
                for n in data.get("unmet_needs", []):
                    cursor.execute('''
                        INSERT INTO unmet_customer_needs 
                        (id, source, post_url, post_text, unmet_need, need_category, customer_segment, validation_score, homemade_solution, competitive_gap, session_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        str(uuid.uuid4()), "Reddit", f"r/{sub}", n.get('post_text', ''),
                        n.get('unmet_need'), n.get('need_category'), n.get('customer_segment'),
                        n.get('validation_score', 0), n.get('homemade_solution'), n.get('competitive_gap', 0),
                        session_id
                    ))
                    injected += 1
                conn.commit()
                conn.close()
                return injected
            except: return 0
    except Exception as e:
        print(f"  ❌ Error r/{sub} '{term}': {e}")
        return 0

async def collect_layer_4_async(session_id=None, focus=None):
    print(f"--- 🚀 INITIATING PARALLEL SOCIAL MINER (Session: {session_id}) ---")
    tasks = []
    for sub in TARGET_SUBREDDITS:
        for term in SEARCH_TERMS:
            tasks.append(scrape_reddit_term(sub, term, session_id, focus))
    
    results = await asyncio.gather(*tasks)
    print(f"\n🏆 SOCIAL MINER COMPLETE. TOTAL UNMET NEEDS CAPTURED: {sum(results)}")

def collect_layer_4(session_id=None, focus=None):
    asyncio.run(collect_layer_4_async(session_id, focus))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Session ID")
    parser.add_argument("--focus", type=str, help="Focus")
    parser.add_argument("--audience", type=str, help="Audience")
    args, unknown = parser.parse_known_args()
    collect_layer_4(session_id=args.session_id, focus=args.focus)
