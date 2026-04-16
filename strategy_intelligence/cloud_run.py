import argparse
import sys
import os
import json
import uuid
import subprocess
from supabase import create_client, Client

def main():
    parser = argparse.ArgumentParser(description="Strategy Intelligence Cloud Wrapper")
    parser.add_argument("--topic", type=str, required=True, help="Research topic")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.")
        sys.exit(1)

    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Generate an ID for the report
    report_id = str(uuid.uuid4())
    print(f"✅ Created research report record: {report_id} for topic: {args.topic}")

    # Create dummy initial record (it will be updated at the end)
    # The React client can optionally create this record and pass the ID, 
    # but here we'll just create it and the client fetches the latest.
    try:
        supabase.table("research_reports").insert({
            "id": report_id,
            "topic": args.topic,
            "status": "processing"
        }).execute()
    except Exception as e:
        print(f"⚠️ Error creating initial record: {e}")
        # Proceed anyway, we can insert later

    print(f"🚀 Running strategy_intelligence/run.py for {args.topic}...")
    
    # We must run it from the strategy_intelligence directory
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        subprocess.run(
            ["python", "run.py", "--topic", args.topic, "--ai", "openai"],
            cwd=workspace_dir,
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"❌ Python script failed: {e}")
        supabase.table("research_reports").upsert({
            "id": report_id,
            "topic": args.topic,
            "status": "failed"
        }).execute()
        sys.exit(1)

    # 1. Read strategy_draft.json
    strategy_path = os.path.join(workspace_dir, "output", "strategy_draft.json")
    strategy_data = {}
    if os.path.exists(strategy_path):
        with open(strategy_path, "r") as f:
            strategy_data = json.load(f)
            
    # 2. Upload PDF
    pdf_filename = f"{args.topic.replace(' ', '_')}_Strategy.pdf"
    pdf_path = os.path.join(workspace_dir, "output", pdf_filename)
    pdf_url = None
    
    if os.path.exists(pdf_path):
        with open(pdf_path, 'rb') as f:
            # We add a timestamp to avoid caching/collision issues
            remote_path = f"{report_id}/{pdf_filename}"
            supabase.storage.from_("research_reports").upload(
                file=f,
                path=remote_path,
                file_options={"content-type": "application/pdf"}
            )
            # Construct public URL
            pdf_url = f"{supabase_url}/storage/v1/object/public/research_reports/{remote_path}"
            print(f"✅ Uploaded PDF to {pdf_url}")

    # 3. Update Record
    try:
        supabase.table("research_reports").upsert({
            "id": report_id,
            "topic": args.topic,
            "status": "completed",
            "strategy_data": strategy_data,
            "pdf_url": pdf_url
        }).execute()
        print("✅ Successfully updated Supabase record with strategy_data and pdf_url")
    except Exception as e:
        print(f"❌ Error updating final record: {e}")
