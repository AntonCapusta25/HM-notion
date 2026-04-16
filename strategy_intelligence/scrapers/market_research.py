import json
import sqlite3
import uuid
import os
import time
import requests
from datetime import datetime
from bs4 import BeautifulSoup

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

URL_LIST = [
    "https://www.statista.com/topics/10674/online-food-delivery-in-the-netherlands/#topicOverview"
]

def call_ollama(prompt: str) -> str:
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(OLLAMA_URL, json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }, timeout=300)
            response.raise_for_status()
            return response.json().get("response", "")
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"  ⏳ Local Ollama connection failed. Retrying in 5s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(5)
            else:
                pass
    return ""

def scrape_macro_research():
    print("--- 📥 Initializing Macro Market Research Miner ---")
    
    conn = sqlite3.connect(DB_PATH, timeout=20)
    cursor = conn.cursor()
    
    for url in URL_LIST:
        print(f"  🔍 Extracting text from: {url}")
        try:
            resp = requests.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            }, timeout=30)
            soup = BeautifulSoup(resp.text, 'html.parser')
            page_text = soup.get_text(separator=' ', strip=True)[:10000]
            
            print(f"  🧠 Sending {len(page_text)} bytes to Llama 3 for Macro Synthesis...")
            
            prompt = f"""
            You are a Macro Market Researcher.
            Read the following raw scraped text from a major data aggregator (e.g. Statista):
            {page_text}
            
            Extract exactly 3 to 5 critical macro-market bullet points regarding the Food Delivery industry.
            Specifically look for competitive market shares, dominant apps (like Thuisbezorgd vs UberEats), user demographics, and financial sizing.
            
            You MUST output valid JSON exactly matching this schema:
            {{
              "macro_insights": [
                {{
                  "data_point": "string (e.g. Thuisbezorgd is the most downloaded app)",
                  "data_category": "demographics|competition|market_size",
                  "source": "Statista"
                }}
              ]
            }}
            """
            
            result = call_ollama(prompt).strip()
            data = json.loads(result)
            insights = data.get("macro_insights", [])
            
            for insight in insights:
                cursor.execute('''
                    INSERT INTO macro_market_research 
                    (id, data_point, data_category, source, scraped_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()),
                    insight.get("data_point"),
                    insight.get("data_category"),
                    insight.get("source", url),
                    datetime.now().isoformat()
                ))
            
            print(f"  ✅ Ingested {len(insights)} macro research points from URL.")
            
        except Exception as e:
            print(f"  ❌ Failed to process URL {url}: {e}")
            
    conn.commit()
    conn.close()
    print("✅ Macro Market Mining Complete.")

def collect_layer_5():
    scrape_macro_research()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Research Session ID")
    args, unknown = parser.parse_known_args()
    collect_layer_5()
