import sys
import os
import argparse

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trend_engine.jobs.daily_pipeline import run_pipeline

def main():
    parser = argparse.ArgumentParser(description="Trend Radar Engine")
    parser.add_argument("--run", action="store_true", help="Run the pipeline immediately")
    args = parser.parse_args()

    if args.run:
        print("🚀 Starting Trend Radar Pipeline...")
        run_pipeline()
    else:
        print("Use --run to execute the pipeline")

if __name__ == "__main__":
    main()
