import os
import time
import json
import sqlite3
import requests
import uuid
import httpx
import asyncio
import random
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

TARGETS = [
    {"name": "Thuisbezorgd", "url": "https://www.trustpilot.com/review/thuisbezorgd.nl"},
    {"name": "Uber Eats", "url": "https://www.trustpilot.com/review/ubereats.com"},
    {"name": "Deliveroo", "url": "https://www.trustpilot.com/review/deliveroo.nl"}
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

async def scrape_target(browser, target, session_id, focus):
    print(f"  🚀 Starting Parallel Scrape: {target['name']}...")
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 1000}
    )
    page = await context.new_page()
    injected = 0
    
    try:
        for page_num in range(1, 6):
            url = f"{target['url']}?page={page_num}" if page_num > 1 else target['url']
            print(f"    📄 {target['name']} -> P{page_num}...")
            
            # Use 'commit' for speed, then handle overlays
            await page.goto(url, wait_until="commit", timeout=30000)
            await asyncio.sleep(1) # Short wait for initial render

            # Aggressive DOM Clear for Cookie Banners/Overlays
            await page.evaluate("""() => {
                const selectors = [
                    '#onetrust-banner-sdk', '.onetrust-pc-dark-filter', 
                    '[id^="sp_message_container"]', '.cookie-banner', 
                    '#consent-banner', '.modal-backdrop'
                ];
                selectors.forEach(s => {
                    const el = document.querySelector(s);
                    if (el) el.remove();
                });
                document.body.style.overflow = 'auto'; // Re-enable scrolling if locked
            }""")
            
            # Fast specific click if visible
            try:
                btn = await page.query_selector("button:has-text('Accept'), #onetrust-accept-btn-handler")
                if btn: await btn.click(timeout=500)
            except: pass

            # Extract directly from DOM after a very short wait
            await asyncio.sleep(1)
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            review_cards = soup.select('section.styles_reviewCardInner__E_27_')
            
            if review_cards:
                text = " ".join([r.get_text(strip=True) for r in review_cards])
            else:
                text = soup.get_text(separator=' ', strip=True)[:10000]

            if ("blocked" in text.lower() or "security check" in text.lower()) and len(text) < 1500:
                print(f"    ❌ {target['name']} BLOCKED at P{page_num}")
                break

            focus_prompt = f" RESEARCH FOCUS: {focus}" if focus else ""
            prompt = f"""
            Identify top 5 PAIN POINTS for {target['name']} (Page {page_num}).{focus_prompt}
            Text: {text[:8000]}
            Output exact JSON: {{"pain_points": [{{"pain_point_category": "str", "specific_issue": "str", "opportunity_score": int, "review_text": "str", "is_systemic_issue": int}}]}}
            """
            
            res = await call_ollama_async(prompt)
            if not res: continue
            
            try:
                data = json.loads(res.strip())
                conn = sqlite3.connect(DB_PATH, timeout=20)
                cursor = conn.cursor()
                for p in data.get("pain_points", []):
                    cursor.execute('''
                        INSERT INTO competitor_pain_points 
                        (id, competitor, review_source, pain_point_category, specific_issue, opportunity_score, review_text, is_systemic_issue, session_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        str(uuid.uuid4()), target['name'], "Trustpilot",
                        p.get('pain_point_category'), p.get('specific_issue'), p.get('opportunity_score', 0),
                        p.get('review_text', ''), p.get('is_systemic_issue', 0), session_id
                    ))
                    injected += 1
                conn.commit()
                conn.close()
            except: pass
            
        print(f"  ✅ {target['name']}: {injected} insights.")
    except Exception as e:
        print(f"  ❌ ERROR {target['name']}: {e}")
    finally:
        await context.close()
    return injected

async def collect_layer_1_async(session_id=None, focus=None):
    print(f"--- 🚀 INITIATING HIGH-SPEED MULTI-TARGET SCRAPE (Session: {session_id}) ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        tasks = [scrape_target(browser, t, session_id, focus) for t in TARGETS]
        results = await asyncio.gather(*tasks)
        print(f"\n🏆 PIPELINE COMPLETE. TOTAL INSIGHTS CAPTURED: {sum(results)}")
        await browser.close()

def collect_layer_1(session_id=None, focus=None):
    asyncio.run(collect_layer_1_async(session_id, focus))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Session ID")
    parser.add_argument("--focus", type=str, help="Focus Area")
    args, unknown = parser.parse_known_args()
    collect_layer_1(session_id=args.session_id, focus=args.focus)
