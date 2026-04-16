import asyncio
import os
import sys
import json
import subprocess

# Configuration
SESSION_ID = "autonomous_test_v3"
INTENT = "High-protein gourmet meal delivery for elite athletes and fitness enthusiasts in Amsterdam West"

async def run_stage(name, cmd):
    print(f"--- 🚀 Starting Stage: {name} ---")
    log_dir = os.path.join(os.path.dirname(__file__), "data/logs", SESSION_ID)
    os.makedirs(log_dir, exist_ok=True)
    
    process = await asyncio.create_subprocess_shell(
        f"PYTHONPATH=. {cmd}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=os.getcwd()
    )
    stdout, stderr = await process.communicate()
    
    # Log to files
    safe_name = name.lower().replace("/", "_").replace("\\", "_")
    with open(os.path.join(log_dir, f"{safe_name}.log"), "w") as f:
        f.write(f"COMMAND: {cmd}\n")
        f.write(f"STDOUT:\n{stdout.decode('utf-8', errors='ignore')}\n")
        f.write(f"STDERR:\n{stderr.decode('utf-8', errors='ignore')}\n")

    print(f"--- ✅ Stage Complete: {name} (Exit: {process.returncode}) ---")
    if stderr:
        err_text = stderr.decode('utf-8', errors='ignore')
        if "error" in err_text.lower() or "exception" in err_text.lower():
            print(f"  ⚠️ Stderr Error: {err_text[:500]}")
    return process.returncode

async def main():
    print(f"--- 🌟 INITIATING AUTONOMOUS INTELLIGENCE FACTORY: {SESSION_ID} 🌟 ---")
    
    # 0. INTENT ANALYSIS
    print(f"--- 🧠 Analyzing Intent: {INTENT} ---")
    intent_proc = await asyncio.create_subprocess_shell(
        f"PYTHONPATH=. python3 strategy_intelligence/agent/intent_agent.py '{INTENT}'",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=os.getcwd()
    )
    stdout, stderr = await intent_proc.communicate()
    stdout_text = stdout.decode('utf-8', errors='ignore')

    try:
        # Robust JSON extraction
        import re
        json_match = re.search(r'\{.*\}', stdout_text, re.DOTALL)
        if not json_match:
            print(f"  ❌ No JSON found in intent agent output. Stderr: {stderr.decode()}")
            return
            
        plan = json.loads(json_match.group(0))
        print(f"  ✅ Strategic Plan Decoded.")
    except Exception as e:
        print(f"  ❌ Failed to decode intent plan: {e}")
        print(f"  DEBUG STDOUT: {stdout_text[:500]}")
        return

    # Extract dynamic params from plan
    themes = ""
    focus = "General"
    audience = "General"
    
    for task in plan.get("pipeline", []):
        params = task.get("params", {})
        if task["id"] == 8: themes = params.get("themes") or params.get("queries") or ""
        if task["id"] in [1, 4]: focus = params.get("focus", focus)
        if task["id"] == "campaign": audience = params.get("audience", audience)
    
    if isinstance(themes, list): themes = ", ".join(themes)

    # PHASE 1: DYNAMIC DATA EXTRACTION
    phase1_tasks = []
    for task in plan.get("pipeline", []):
        tid = task["id"]
        p = task.get("params", {})
        if tid == 1: phase1_tasks.append(run_stage("Reviews", f"python3 strategy_intelligence/scrapers/reviews.py --session_id {SESSION_ID}"))
        if tid == 8: 
            t = p.get('themes') or p.get('queries') or ''
            if isinstance(t, list): t = ", ".join(t)
            phase1_tasks.append(run_stage("Keywords", f"python3 strategy_intelligence/scrapers/keyword_research.py --session_id {SESSION_ID} --themes '{t}'"))
        if tid == 4: phase1_tasks.append(run_stage("Social", f"python3 strategy_intelligence/scrapers/social.py --session_id {SESSION_ID}"))
        if tid == 3: phase1_tasks.append(run_stage("Pricing", f"python3 strategy_intelligence/scrapers/pricing_analysis.py --session_id {SESSION_ID} --focus '{p.get('focus', 'Pricing')}'"))
        if tid == 9: 
            q = p.get("queries") or p.get("themes") or []
            print(f"    -- Partnerships Queries: {len(q)} identified")
            q_json = json.dumps(q) # Pass as JSON string
            phase1_tasks.append(run_stage("Partnerships", f"python3 strategy_intelligence/scrapers/google_maps.py --session_id {SESSION_ID} --queries '{q_json}'"))
        if tid == 7: phase1_tasks.append(run_stage("Seasonal", f"python3 strategy_intelligence/scrapers/holidays.py --session_id {SESSION_ID}"))

    if phase1_tasks:
        print("\n--- 🔎 EXECUTING PARALLEL RESEARCH SUITE ---")
        await asyncio.gather(*phase1_tasks)
    
    # PHASE 2: AGENTIC SYNTHESIS
    print("\n--- 🧠 MOVING TO AGENTIC SYNTHESIS PHASE ---")
    await run_stage("Strategy/Insights", f"python3 strategy_intelligence/agent/strategy_generator.py --session_id {SESSION_ID} --themes '{themes}'")
    await run_stage("Campaigns/Assets", f"python3 strategy_intelligence/agent/campaign_generator.py --session_id {SESSION_ID} --audience '{audience}' --focus '{focus}' --themes '{themes}'")
    
    # PHASE 3: EXECUTIVE REPORTING
    print("\n--- 📄 GENERATING FINAL AUTONOMOUS REPORT ---")
    await run_stage("Reporting/PDF", f"python3 strategy_intelligence/agent/report_generator.py --session_id {SESSION_ID} --intent '{INTENT}'")
    
    print(f"\n🏆 AUTONOMOUS PIPELINE COMPLETE: {SESSION_ID}")

if __name__ == "__main__":
    asyncio.run(main())
