import asyncio
import httpx
import json
import sqlite3
import uuid
import os
import re
from datetime import datetime
from strategy_intelligence.report.html_builder import HTMLBuilder
from strategy_intelligence.report.pdf_generator import PDFGenerator
from strategy_intelligence.agent.company_context import HOMEMADE_CONTEXT

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

class StrategyReportGenerator:
    def __init__(self, intent="High-end Home Dining", session_id=None):
        self.intent = intent
        self.session_id = session_id
        self.report_date = datetime.now().strftime("%Y%m%d")
        self.html_builder = HTMLBuilder()
        self.professional_title = intent # Default
        self.output_filename = f"Homemade_Executive_Strategy_{self.report_date}_autonomo.pdf"
        self.anchor_brief = ""

    def _clean_text(self, text: str) -> str:
        """Strips accidental JSON structures from LLM responses."""
        if not text: return ""
        text = re.sub(r'```[a-z]*\n?', '', text)
        text = text.replace('```', '')
        return text.strip()

    async def _ask_ollama_async(self, client, prompt: str) -> str:
        intent_context = f"\n\nPRIORITY STRATEGIC GOAL: {self.intent}" if self.intent else ""
        anchor_ctx = f"\n\nSTRATEGIC ANCHOR (MISSION BRIEF):\n{self.anchor_brief}" if self.anchor_brief else ""
        
        full_prompt = f"SYSTEM IDENTITY:\n{HOMEMADE_CONTEXT}{intent_context}{anchor_ctx}\n\nSTRICT RULE: Return ONLY the text/content. NO JSON BRACES, NO KEYS, NO INTRO/OUTRO.\n\nTASK:\n{prompt}"
        try:
            resp = await client.post(OLLAMA_URL, json={
                "model": MODEL_NAME, "prompt": full_prompt, "stream": False
            }, timeout=300.0)
            resp.raise_for_status()
            raw = resp.json().get("response", "Section capture failed.")
            return self._clean_text(raw)
        except: return "AI Synthesis Error."

    async def frame_title_professionally(self):
        """Uses AI to turn a raw intent into a professional board-level title."""
        print(f"--- 🎭 Framing Title Professionally ---")
        prompt = f"Turn this business intent into a professional, board-level executive report title: '{self.intent}'. Return ONLY the title string."
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(OLLAMA_URL, json={
                    "model": "llama3.1",
                    "prompt": prompt,
                    "stream": False
                })
                self.professional_title = response.json().get('response', self.intent).strip().replace('"', '')
                print(f"  ✅ Professional Title: {self.professional_title}")
        except: pass

    async def get_db_data(self):
        """Fetches all relevant data for the report."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        row = cursor.execute("SELECT mission_brief FROM session_context WHERE session_id = ?", (self.session_id,)).fetchone()
        if row: self.anchor_brief = row['mission_brief']
        
        # Extended Partnerships: Name, Category, Website, Phone, EMAIL
        cursor.execute("SELECT name, category, website, phone, email FROM partnerships WHERE session_id = ? LIMIT 50", (self.session_id,))
        partnerships = [dict(row) for row in cursor.fetchall()]
        
        # Extended Campaigns: All channel fields
        cursor.execute("""
            SELECT campaign_name AS title, platform, ad_copy AS content, visual_concept AS social_concept,
                   email_subject, email_body, reel_script, instagram_post
            FROM marketing_campaigns 
            WHERE session_id = ?
        """, (self.session_id,))
        campaigns = [dict(row) for row in cursor.fetchall()]
        
        # Fetch Holidays
        cursor.execute("SELECT local_name, date, demand_spike_prediction FROM market_holidays WHERE session_id = ?", (self.session_id,))
        holidays = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return partnerships, campaigns, holidays

    async def generate_full_report_async(self):
        partnerships, campaigns, holidays = await self.get_db_data()
        await self.frame_title_professionally()
        
        holiday_context = f"\n\nKNOWN LOCAL HOLIDAYS:\n{json.dumps(holidays)}" if holidays else ""
        
        print(f"--- 📑 Generating Executive Report sections for session: {self.session_id} ---")
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            prompts = [
                f"ACT AS CEO. MISSION: {self.intent}. Write Executive Vision (300 words).",
                f"ACT AS GROWTH HACKER. TASK: Competitor Failures & Market Vacuum analysis.",
                f"ACT AS PRODUCT DIRECTOR. TASK: High-Performance User Journey (Macro-Locking, Gym-Syncing).",
                f"ACT AS CFO. TASK: Explain the 14% commission advantage and Pricing Warfare strategy.",
                f"ACT AS CULTURAL ANALYST. TASK: Amsterdam Market White-Space (Loneliness, expat friction).",
                f"ACT AS SEASONAL STRATEGIST. {holiday_context} TASK: Create a 'Peak Demand Calendar'. MUST explicitly mention Koningsdag (King's Day) and other major NL dates.",
                f"ACT AS COO. TASK: 90-Day Tactical Execution Plan (Month 1, 2, 3) for {self.intent}. Format as markdown table.",
                f"ACT AS PARTNERSHIP LEAD. TASK: Summarize the strategic value of the {len(partnerships)} businesses identified for distribution (gyms, studios, etc.). Give a few phrases about the outreach strategy."
            ]
            
            section_names = [
                "1. Executive Vision", "2. Competitor Vulnerabilities", "3. UX Strategy",
                "4. Economic Warfare", "5. Amsterdam Market White-Space", "6. Holiday Demand Matrix",
                "7. Tactical Roadmap", "Strategic Partnerships & Distribution"
            ]
            
            # Additional sections
            prompts += [
                "ACT AS GROWTH LEAD. TASK: 5 aggressive acquisition tactics for the partnerships identified.",
                "ACT AS SEO ARCHITECT. TASK: Keyword cluster strategy for high-volume acquisition."
            ]
            section_names += ["8. Growth Hacking Gold", "9. SEO & Keyword Strategy"]

            tasks = [self._ask_ollama_async(client, p) for p in prompts]
            results = await asyncio.gather(*tasks)
            
            sections = {name: results[i] for i, name in enumerate(section_names)}

            # Final Export
            print("  🎨 Rendering Premium PDF...")
            report_dir = os.path.join(os.path.dirname(__file__), "../exports")
            os.makedirs(report_dir, exist_ok=True)
            
            # Use sections dict as expected by HTMLBuilder (title -> and in some cases content)
            # Actually HTMLBuilder loop through 'sections' list of dicts with 'title' and 'content'
            sections_list = [{"title": k, "content": v} for k, v in sections.items()]
            
            # Pass extra data to builder
            html_content = self.html_builder.render_report(
                sections_list, 
                topic=self.professional_title, 
                campaigns=campaigns,
                partnerships=partnerships # Add partners explicitly
            )
            
            pdf_path = os.path.join(report_dir, self.output_filename)
            await PDFGenerator().html_to_pdf(html_content, pdf_path)
            return pdf_path

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--intent", type=str)
    parser.add_argument("--session_id", type=str)
    args, unknown = parser.parse_known_args()
    gen = StrategyReportGenerator(intent=args.intent, session_id=args.session_id)
    path = asyncio.run(gen.generate_full_report_async())
    print(f"✅ Full Strategic Report Generated at: {path}")
