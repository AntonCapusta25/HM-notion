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
SEMAPHORE = asyncio.Semaphore(2) # Limit local Ollama concurrency

CREATIVE_DIRECTOR_PROMPT = """
Act as HOMEMADE’s creative director, brand strategist, campaign writer, and prompt architect. 
Keep all outputs unmistakably HOMEMADE: local, human, craveable, stylish, candid, slightly cheeky, premium-but-real, and Dutch-realistic when relevant. 
Protect consistency across concepts, campaigns, copy, and image prompts. 
Favor direct-flash imagery, high contrast, sharp shadows, real people with character, strong food presence, compact Dutch home settings, and signature HOMEMADE orange. 
Avoid anything corporate, glossy, generic, sterile, luxury-fashion, or stock-photo.

Home chefs must feel proud, talented, real, entrepreneurial, and respected. Customers should often feel cool, current, intentional, and city-based. People should feel natural and mid-action, not stiff. Diversity must feel effortless and respectful.

Tone should be smart, warm, sharp, concise, and slightly cheeky. 
Avoid generic food-platform language.

Core themes include craveability, pickup as ritual, chef-customer connection, bikes and movement, side hustle, cultural pride, word-of-mouth quality, and local Dutch city food identity. 
Frame pickup as personal, intentional, local, human, active, and worth showing up for.

Match the user’s preferred prompt style closely. Default to a richly art-directed, highly specific JSON format.
For image prompts, always use clean repeatable JSON inside an image_data wrapper.

IMAGE_DATA SCHEMA:
{
  "image_data": {
    "concept_title": "string",
    "campaign_role": "string",
    "image_type": "string",
    "scene_description": "string",
    "brand_world": "string",
    "atmosphere": "string",
    "person_or_subjects": "string",
    "food_and_environment": "string",
    "graphics": "string",
    "campaign_text": "string",
    "final_visible_design_direction": "string",
    "style": "string",
    "marketing_metadata": "string"
  }
}

Recoleta should remain the default named font reference. Signature HOMEMADE orange should remain a recurring anchor.
"""

async def call_ollama_async(client, prompt: str, schema_description: str, retries: int = 3) -> dict:
    full_prompt = f"{CREATIVE_DIRECTOR_PROMPT}\n\nTASK:\n{prompt}\n\nSTRICT JSON OUTPUT ACCORDING TO THIS SCHEMA:\n{schema_description}"
    for attempt in range(retries):
        async with SEMAPHORE:
            try:
                response = await client.post(OLLAMA_URL, json={
                    "model": MODEL_NAME, "prompt": full_prompt, "stream": False, "format": "json"
                }, timeout=300)
                response.raise_for_status()
                res = json.loads(response.json().get("response", "").strip())
                if res: return res
            except Exception as e:
                if attempt == retries - 1: print(f"  ❌ Ollama Error after {retries} attempts: {e}")
                await asyncio.sleep(1) # Backoff
    return {}

async def process_strategy_async(client, strat, context, session_id):
    print(f"  🎨 Generating Assets for: {strat['title']}...")
    context_str = f"\nAUDIENCE: {context.get('audience')}\nFOCUS: {context.get('focus')}\nTHEMES: {context.get('themes')}"
    
    schema_image = '''{
      "image_data": {
        "concept_title": "string", "campaign_role": "Primary Asset", "image_type": "Lifestyle/Action",
        "scene_description": "detailed Dutch setting", "brand_world": "HOMEMADE Local",
        "atmosphere": "Direct-flash, candid", "person_or_subjects": "Real character",
        "food_and_environment": "Craveable dish", "graphics": "None or minimal",
        "campaign_text": "Short strong copy", "final_visible_design_direction": "High contrast",
        "style": "Streetwear food editorial", "marketing_metadata": "Engagement-focused"
      }
    }'''

    # Define tasks
    email_task = call_ollama_async(client, f"""
        WRITE A HIGH-CONVERSION MARKETING EMAIL (QUALITY MANDATE).
        STRATEGY: {strat['title']}
        CONTEXT: {context_str}
        TONE: Concise, slightly cheeky, premium-but-real.
        FOCUS: Address a specific performance friction (recovery, prep-fatigue, or macro-anxiety).
        RULE: Quality over quantity. Make it punchy.
    """, '{"subject": "string", "body_markdown": "string"}')
    
    insta_task = call_ollama_async(client, f"""
        CREATE AN ART-DIRECTED VISUAL CONCEPT (PROMPT ARCHITECT).
        STRATEGY: {strat['title']}
        CONTEXT: {context_str}
        FOCUS: Candid, direct-flash, Dutch-realistic. Avoid stock photos. 
        TASK: Design a scene that captures the "Unfair Advantage" of Homemade in Amsterdam West.
        RULE: Quality over quantity. High-fidelity creative direction.
    """, schema_image)
    
    tiktok_task = call_ollama_async(client, f"""
        WRITE A HIGH-RETENTION REEL/TIKTOK SCRIPT.
        STRATEGY: {strat['title']}
        CONTEXT: {context_str}
        STYLE: Candid, behind-the-scenes, high-contrast.
        FOCUS: The human exchange (chef-to-athlete).
        RULE: Quality over quantity. Professional pacing.
    """, '{"script_markdown": "string"}')
    
    # Execute
    results = await asyncio.gather(email_task, insta_task, tiktok_task)
    email, insta, tiktok = results
    
    # Final consistency check
    if not email: email = {"subject": f"Homemade: {strat['title']}", "body_markdown": strat['description']}
    if not insta: insta = {"image_data": {"concept_title": strat['title'], "scene_description": strat['title']}}
    if not tiktok: tiktok = {"script_markdown": f"Check out this update for {strat['title']}!"}

    try:
        conn = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conn.cursor()
        
        # Extract image prompts safely
        img_prompts = insta.get('image_data', {}) if isinstance(insta.get('image_data'), dict) else {"scene_description": str(insta.get('image_data', ""))}
        
        cursor.execute('''
            INSERT INTO marketing_campaigns 
            (id, insight_id, campaign_name, target_audience, platform, ad_copy, visual_concept, 
             status, session_id, email_subject, email_body, reel_script, instagram_post, tiktok_script, image_prompts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), strat['id'], strat['title'], context.get('audience', 'Target'), "Omnichannel",
            email.get('subject', strat['title']), json.dumps(img_prompts, indent=2),
            'high_fidelity_prompt_ready', session_id,
            email.get('subject'), email.get('body_markdown'),
            tiktok.get('script_markdown'),
            json.dumps(insta), json.dumps(tiktok), json.dumps(img_prompts)
        ))
        cursor.execute("UPDATE intelligence_insights SET status = 'campaign_generated' WHERE id = ?", (strat['id'],))
        conn.commit()
        conn.close()
        return 1
    except Exception as e:
        print(f"  ❌ DB Error for {strat['title']}: {e}")
        return 0

async def run_generator_async(session_id=None, context=None):
    print(f"--- 🚀 INITIATING PARALLEL CAMPAIGN ENGINE (Session: {session_id}) ---")
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    where = "WHERE status = 'new'"
    if session_id: where += f" AND session_id = '{session_id}'"
    new_strategies = [dict(r) for r in cursor.execute(f"SELECT id, title, description FROM intelligence_insights {where}").fetchall()]
    conn.close()

    if not new_strategies:
        print("✅ No strategies to action.")
        return

    async with httpx.AsyncClient(timeout=300.0) as client:
        tasks = [process_strategy_async(client, s, context, session_id) for s in new_strategies]
        results = await asyncio.gather(*tasks)
        print(f"🏆 CAMPAIGN GENERATION COMPLETE. CAMPAIGNS CREATED: {sum(results)}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Session ID")
    parser.add_argument("--audience", type=str, help="Audience")
    parser.add_argument("--focus", type=str, help="Focus")
    parser.add_argument("--themes", type=str, help="Themes")
    args, unknown = parser.parse_known_args()
    
    ctx = {"audience": args.audience, "focus": args.focus, "themes": args.themes}
    asyncio.run(run_generator_async(session_id=args.session_id, context=ctx))
