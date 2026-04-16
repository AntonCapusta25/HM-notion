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

PLATFORMS = ["Thuisbezorgd", "UberEats", "Deliveroo"]
DEFAULT_MEALS = ["Pizza", "Biryani", "Chicken Masala", "Tacos"]

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

def safe_float(val):
    try: return float(val) if val is not None else 0.0
    except: return 0.0

def safe_int(val):
    try: return int(val) if val is not None else 0
    except: return 0

async def estimate_pricing_async(platform: str, meal: str, session_id: str):
    print(f"  🧠 Estimating: {meal} on {platform}...")
    prompt = f"""
    Estimate realistic pricing for {meal} on {platform} in Amsterdam.
    Output JSON: {{
        "average_meal_price": float,
        "delivery_fee_avg": float,
        "platform_fee": float,
        "loyalty_program_active": int,
        "promotional_mechanics": "string"
    }}
    """
    res = await call_ollama_async(prompt)
    if not res: return 0
    
    try:
        data = json.loads(res.strip())
        conn = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO competitor_pricing 
            (id, competitor, average_meal_price, delivery_fee_avg, platform_fee, loyalty_program_active, promotional_mechanics, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), f"{platform} - {meal}", 
            safe_float(data.get('average_meal_price')),
            safe_float(data.get('delivery_fee_avg')),
            safe_float(data.get('platform_fee')),
            safe_int(data.get('loyalty_program_active')),
            data.get('promotional_mechanics', ''),
            session_id
        ))
        conn.commit()
        conn.close()
        return 1
    except: return 0

async def collect_layer_3_async(meals=None, session_id=None):
    if not meals: meals = DEFAULT_MEALS
    print(f"--- 🚀 INITIATING PARALLEL PRICING MATRIX (Session: {session_id}) ---")
    
    tasks = []
    for platform in PLATFORMS:
        for meal in meals:
            tasks.append(estimate_pricing_async(platform, meal, session_id))
    
    results = await asyncio.gather(*tasks)
    print(f"🏆 PRICING MATRIX COMPLETE. ESTIMATES INJECTED: {sum(results)}")

def collect_layer_3(meals=None, session_id=None):
    asyncio.run(collect_layer_3_async(meals, session_id))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("meals", nargs="?", default="", help="Meals")
    parser.add_argument("--session_id", type=str, help="Session ID")
    args, unknown = parser.parse_known_args()
    
    target_meals = [m.strip() for m in args.meals.split(",")] if args.meals.strip() else None
    collect_layer_3(target_meals, session_id=args.session_id)
