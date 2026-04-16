import asyncio
import os
import sys
import sqlite3

# Configuration
SESSION_ID = "autonomous_test_v3" # Using the data from this session
INTENT = "High-volume acquisition of new Amsterdam customers for Homemade gourmet meal delivery"

async def run_stage(name, cmd):
    print(f"--- 🚀 Starting Stage: {name} ---")
    process = await asyncio.create_subprocess_shell(
        f"PYTHONPATH=. {cmd}",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        cwd=os.getcwd()
    )
    stdout, stderr = await process.communicate()
    print(f"--- ✅ Stage Complete: {name} (Exit: {process.returncode}) ---")
    if stderr and process.returncode != 0:
        print(f"  ⚠️ Stderr: {stderr.decode('utf-8', errors='ignore')[:500]}")
    return process.returncode

async def main():
    print(f"--- 🌟 INITIATING SMART AMSTERDAM EXPANSION: {SESSION_ID} 🌟 ---")
    
    # 1. STRATEGIC ANCHOR (MISSION BRIEFING)
    # We re-run this to set the new acquisition-focused brief
    await run_stage("Strategic Anchor", f"python3 strategy_intelligence/agent/strategic_anchor.py {SESSION_ID}")
    
    # 2. STRATEGY GENERATION
    # Focusing on growth strategies
    themes = "Amsterdam, Growth, Acquisition, Local Partnerships"
    await run_stage("Strategy/Insights", f"python3 strategy_intelligence/agent/strategy_generator.py --session_id {SESSION_ID} --themes '{themes}'")
    
    # 3. CAMPAIGN GENERATION
    # Quality over Quantity mandate
    audience = "New Amsterdam Residents & Busy Professionals"
    focus = "High-Volume Acquisition"
    await run_stage("Campaigns/Assets", f"python3 strategy_intelligence/agent/campaign_generator.py --session_id {SESSION_ID} --audience '{audience}' --focus '{focus}' --themes '{themes}'")
    
    # 4. EXECUTIVE REPORTING
    await run_stage("Reporting/PDF", f"python3 strategy_intelligence/agent/report_generator.py --session_id {SESSION_ID} --intent '{INTENT}'")
    
    print(f"\n🏆 SMART EXPANSION SUITE COMPLETE: {SESSION_ID}")

if __name__ == "__main__":
    asyncio.run(main())
