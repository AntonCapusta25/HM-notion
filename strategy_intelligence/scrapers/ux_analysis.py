import asyncio
import httpx
import json
import sqlite3
import uuid
import os
import time
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

TARGETS = [
    {"name": "Thuisbezorgd", "url": "https://www.thuisbezorgd.nl/en/"},
    {"name": "UberEats", "url": "https://www.ubereats.com/nl-en"},
    {"name": "Homemade Catering", "url": "https://catering.homemadechefs.com/"},
    {"name": "Homemade Meals", "url": "https://www.homemademeals.net/en/home"}
]

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

async def analyze_ux_async(name: str, text: str, latency: float, focus: str) -> dict:
    focus_prompt = f" RESEARCH FOCUS: {focus}" if focus else ""
    prompt = f"""
    You are a UX Data Analyst. Latency: {latency}ms.{focus_prompt}
    DOM Text: {text[:8000]}
    Output JSON: {{
        "friction_points": "string",
        "conversion_blockers": "string",
        "ux_score": int
    }}
    """
    res = await call_ollama_async(prompt)
    try:
        return json.loads(res.strip())
    except: return {}

async def scrape_target_ux(browser, target, session_id, focus):
    print(f"  🏁 Fetching UX: {target['name']}...")
    context = await browser.new_context()
    page = await context.new_page()
    start_t = time.time()
    
    try:
        await page.goto(target['url'], wait_until="commit", timeout=30000)
        await asyncio.sleep(1)
        
        # Brute-force cookie/overlay removal
        await page.evaluate("""() => {
            const sels = ['#onetrust-banner-sdk', '.cookie-banner', '#consent-banner', '.modal-backdrop'];
            sels.forEach(s => document.querySelector(s)?.remove());
            document.body.style.overflow = 'auto';
        }""")
        
        latency = int((time.time() - start_t) * 1000)
        text = await page.evaluate("() => document.body.innerText")
        
        ux = await analyze_ux_async(target['name'], text, latency, focus)
        if ux:
            conn = sqlite3.connect(DB_PATH, timeout=20)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO competitor_ux_analysis 
                (id, competitor, page_type, loading_time_ms, ux_weaknesses, session_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), target['name'], "Landing Page", latency,
                json.dumps([ux.get('friction_points', ''), ux.get('conversion_blockers', '')]),
                session_id
            ))
            conn.commit()
            conn.close()
            print(f"  ✅ UX for {target['name']} captured.")
            return 1
    except Exception as e:
        print(f"  ❌ Error {target['name']}: {e}")
    finally:
        await context.close()
    return 0

async def _collect_layer_2_async(session_id=None, focus=None):
    print(f"--- 🚀 INITIATING PARALLEL UX SCRAPER (Session: {session_id}) ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        tasks = [scrape_target_ux(browser, t, session_id, focus) for t in TARGETS]
        results = await asyncio.gather(*tasks)
        print(f"🏆 UX PIPELINE COMPLETE. SITES ANALYZED: {sum(results)}")

def collect_layer_2(session_id=None, focus=None):
    asyncio.run(_collect_layer_2_async(session_id=session_id, focus=focus))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Session ID")
    parser.add_argument("--focus", type=str, help="Focus")
    args, unknown = parser.parse_known_args()
    collect_layer_2(session_id=args.session_id, focus=args.focus)
