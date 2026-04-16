import asyncio
import httpx
import json
import sqlite3
import os
import sys

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

class StrategicAnchorAgent:
    def __init__(self, session_id):
        self.session_id = session_id

    async def get_session_data(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. Fetch Top Partnerships
        partners = [dict(r) for r in cursor.execute(
            "SELECT name, category FROM partnerships WHERE session_id = ? LIMIT 15", (self.session_id,)
        ).fetchall()]
        
        # 2. Fetch Top Keywords
        keywords = [dict(r) for r in cursor.execute(
            "SELECT keyword, search_volume_estimate FROM market_keywords WHERE session_id = ? ORDER BY CAST(search_volume_estimate AS INT) DESC LIMIT 20", (self.session_id,)
        ).fetchall()]
        
        # 3. Fetch Top Pain Points
        pains = [dict(r) for r in cursor.execute(
            "SELECT specific_issue, review_text FROM competitor_pain_points WHERE session_id = ? LIMIT 15", (self.session_id,)
        ).fetchall()]
        
        conn.close()
        return partners, keywords, pains

    async def synthesize_anchor(self):
        partners, keywords, pains = await self.get_session_data()
        
        print(f"--- ⚓ SYNTHESIZING STRATEGIC ANCHOR for {self.session_id} ---")
        
        prompt = f"""
        ACT AS THE CHIEF STRATEGY OFFICER & GROWTH HACKER (Think Peter Thiel meets David Ogilvy).
        You are looking at a messy set of market data for a new business niche.
        Your job is to synthesize this into a "UNIFIED MISSION BRIEF" (250 words max).
        
        DATA:
        - TOP PARTNERS: {json.dumps(partners)}
        - TOP KEYWORDS: {json.dumps(keywords)}
        - COMPETITOR PAIN POINTS: {json.dumps(pains)}
        
        STRICT RULES:
        1. CONTRARIAN INSIGHT: Don't just list facts. Identify a non-obvious truth about this market that incumbents are missing.
        2. PSYCHOLOGICAL GAP: What is the emotional or psychological trigger that competitors (like UberEats/Thuisbezorgd) are failing to pull?
        3. DATA LINKAGE: Explicitly name at least 3 partners and the top 3 high-volume search terms.
        4. FIRST PRINCIPLES: Assume the current delivery model is broken. Why is the HOMEMADE model (no fleet, home chefs) the logical winner here?
        5. GEOGRAPHIC FOCUS: Lock onto AMSTERDAM WEST.
        6. RETURN ONLY THE TEXT BRIEF. NO CONVERSATION.
        """
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(OLLAMA_URL, json={
                "model": MODEL_NAME, "prompt": prompt, "stream": False
            })
            brief = resp.json().get("response", "").strip()
            
            # Save to DB
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO session_context 
                (session_id, mission_brief, top_partners, top_keywords, top_pain_points)
                VALUES (?, ?, ?, ?, ?)
            """, (
                self.session_id, brief, json.dumps(partners), 
                json.dumps(keywords), json.dumps(pains)
            ))
            conn.commit()
            conn.close()
            
            print(f"  ✅ Strategic Anchor Set.")
            return brief

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 strategic_anchor.py <session_id>")
        sys.exit(1)
        
    sid = sys.argv[1]
    asyncio.run(StrategicAnchorAgent(sid).synthesize_anchor())
