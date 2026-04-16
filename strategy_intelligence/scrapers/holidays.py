import asyncio
import httpx
import json
import sqlite3
import uuid
import os
import time
from datetime import datetime

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

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

async def analyze_holiday_async(h, session_id, focus):
    date_str = h.get('date')
    en_name = h.get('name')
    local_name = h.get('localName')
    
    print(f"  🧠 Analyzing: {local_name} ({date_str})...")
    focus_prompt = f" RESEARCH FOCUS: {focus}" if focus else ""
    prompt = f"""
    Analyze food delivery demand for {local_name} ({en_name}) in NL on {date_str}.{focus_prompt}
    Output JSON: {{
        "demand_spike_prediction": "string",
        "strategic_opportunity": "string"
    }}
    """
    res = await call_ollama_async(prompt)
    if not res: return 0
    
    try:
        data = json.loads(res.strip())
        conn = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO market_holidays 
            (id, date, local_name, english_name, demand_spike_prediction, strategic_opportunity, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), date_str, local_name, en_name,
            data.get('demand_spike_prediction', ''),
            data.get('strategic_opportunity', ''),
            session_id
        ))
        conn.commit()
        conn.close()
        return 1
    except: return 0

async def collect_layer_7_async(session_id=None, focus=None):
    print(f"--- 🚀 INITIATING PARALLEL HOLIDAY PREDICTOR (Session: {session_id}) ---")
    current_year = datetime.now().year
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"https://date.nager.at/api/v3/PublicHolidays/{current_year}/NL")
            resp.raise_for_status()
            holidays = resp.json()
    except Exception as e:
        print(f"  ❌ Failed to fetch holidays: {e}")
        return

    tasks = [analyze_holiday_async(h, session_id, focus) for h in holidays]
    results = await asyncio.gather(*tasks)
    print(f"🏆 HOLIDAY PIPELINE COMPLETE. PROFILES INJECTED: {sum(results)}")

def collect_layer_7(session_id=None, focus=None):
    asyncio.run(collect_layer_7_async(session_id, focus))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Session ID")
    parser.add_argument("--focus", type=str, help="Focus")
    args, unknown = parser.parse_known_args()
    collect_layer_7(session_id=args.session_id, focus=args.focus)
