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

async def call_ollama_async(client, prompt: str, schema_description: str = "") -> str:
    """Non-blocking async call to local Llama 3."""
    fmt = "json" if schema_description else "text"
    payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}
    if schema_description: payload["format"] = "json"
    
    try:
        resp = await client.post(OLLAMA_URL, json=payload, timeout=300.0)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as e:
        print(f"    ⚠️ AI Task Error: {e}")
        return ""

async def synthesize_strategies_async(session_id=None, focus=None, audience=None, themes=None):
    print(f"--- 🚀 INITIATING PARALLEL STRATEGY ENGINE (Session: {session_id}) ---")
    
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    where = f"WHERE session_id = '{session_id}'" if session_id else ""
    
    # Fetch data
    pain_points = [dict(r) for r in cursor.execute(f"SELECT * FROM competitor_pain_points {where} LIMIT 30").fetchall()]
    unmet_needs = [dict(r) for r in cursor.execute(f"SELECT * FROM unmet_customer_needs {where} LIMIT 30").fetchall()]
    macro_data = [dict(r) for r in cursor.execute(f"SELECT * FROM macro_market_research {where} LIMIT 20").fetchall()]
    conn.close()

    if not pain_points and not unmet_needs:
        print("❌ Insufficient data for strategy synthesis.")
        return

    async with httpx.AsyncClient(timeout=300.0) as client:
        # Phase 1: Parallel Summarization
        print("  🧠 Summarizing data categories in parallel...")
        tasks = [
            call_ollama_async(client, f"Summarize top competitor failures: {json.dumps(pain_points)}"),
            call_ollama_async(client, f"Summarize top unmet customer needs: {json.dumps(unmet_needs)}"),
            call_ollama_async(client, f"Synthesize macro market trends: {json.dumps(macro_data)}")
        ]
        summaries = await asyncio.gather(*tasks)
        
        # Phase 2: Final Strategic Synthesis
        print("  🎯 Generating unified strategies...")
        theme_ctx = f" THEMES: {themes}" if themes else ""
        final_prompt = f"""
        PAIN SUMMARY: {summaries[0]}
        NEEDS SUMMARY: {summaries[1]}
        MACRO SUMMARY: {summaries[2]}
        FOCUS: {focus} | AUDIENCE: {audience}{theme_ctx}
        
        Generate exactly 4 HIGH-IMPACT strategies for "Homemade".
        Output JSON: {{"strategies": [{{
            "insight_type": "opportunity|pain_point_trend|feature_gap",
            "title": "string", "description": "string", "priority": "critical|high",
            "recommended_action": "string", "estimated_impact": "high"
        }}]}}
        """
        res = await call_ollama_async(client, final_prompt, schema_description="strategies")
        if not res: return

        # Save to DB
        try:
            data = json.loads(res)
            conn = sqlite3.connect(DB_PATH, timeout=20)
            cursor = conn.cursor()
            for s in data.get("strategies", []):
                cursor.execute('''
                    INSERT INTO intelligence_insights 
                    (id, insight_type, title, description, priority, confidence_score, recommended_action, estimated_impact, implementation_effort, status, session_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()), s.get('insight_type'), s.get('title'), s.get('description'),
                    s.get('priority', 'high'), 0.9, s.get('recommended_action'),
                    s.get('estimated_impact', 'high'), 'medium', 'new', session_id
                ))
            conn.commit()
            conn.close()
            print(f"🏆 STRATEGY SYNTHESIS COMPLETE. STRATEGIES GENERATED: {len(data.get('strategies', []))}")
        except: print("  ❌ Failed to parse strategy JSON.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Session ID")
    parser.add_argument("--focus", type=str, help="Focus")
    parser.add_argument("--audience", type=str, help="Audience")
    parser.add_argument("--themes", type=str, help="Themes")
    args, unknown = parser.parse_known_args()
    asyncio.run(synthesize_strategies_async(args.session_id, args.focus, args.audience, args.themes))
