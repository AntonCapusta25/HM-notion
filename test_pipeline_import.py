import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from trend_engine.jobs.daily_pipeline import run_pipeline
from trend_engine.config import VIRAL_THRESHOLD_SCORE

# Mock or limit the run
print("🚀 Starting TEST Trend Radar Pipeline...")

try:
    # Run the real pipeline
    # Note: This will actually scrape and use OpenAI/Gemini credits.
    # We should trust the previous DB check and maybe just import to verify syntax
    # For now, let's just run it but maybe interrupt or we can rely on manual testing later.
    # Actually, let's just verify imports and basic setup.
    import trend_engine.main
    print("✅ Successfully imported trend_engine.main")
except Exception as e:
    print(f"❌ Failed to import/run: {e}")
