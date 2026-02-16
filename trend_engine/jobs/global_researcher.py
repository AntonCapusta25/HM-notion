import os
import sys
import time
import logging

# Add current directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trend_engine.scrapers.global_virality import GlobalViralityScraper
from trend_engine.ai.multimodal_analysis import MultimodalAnalyzer
from trend_engine.db import db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_global_researcher():
    """
    Main pipeline for Global Virality Researcher.
    1. Scrape top viral candidates (YouTube Shorts)
    2. Analyze VALID candidates using Multimodal AI (Gemini 2.0)
    3. Save deep insights to DB
    4. Cleanup
    """
    logger.info("🚀 Starting Global Virality Researcher Pipeline...")
    
    # Initialize tools
    scraper = GlobalViralityScraper()
    try:
        analyzer = MultimodalAnalyzer()
    except Exception as e:
        logger.error(f"❌ Failed to initialize Analyzer (Check API Key): {e}")
        return

    # 1. Fetch Candidates (Download Video Files)
    # We fetch more than we need because some might be duplicates or fail analysis
    candidates = scraper.fetch_youtube_shorts(limit=5)
    
    if not candidates:
        logger.warning("⚠️ No candidates found. Pinteresting...")
        return

    logger.info(f"📊 Analyzing {len(candidates)} viral candidates...")

    processed_count = 0
    
    # 2. Analyze & Save
    for video in candidates:
        video_path = video.get('file_path')
        transcript = video.get('transcript', '')
        
        if not video_path or not os.path.exists(video_path):
            logger.warning(f"⚠️ Video file missing for {video.get('title')}, skipping.")
            continue
            
        try:
            logger.info(f"🧠 Analyzing: {video.get('title')}...")
            
            # Deep Multimodal Analysis (with Transcript optimization)
            analysis_result = analyzer.analyze_video(video_path, transcript=transcript)
            
            if analysis_result:
                # Save to Database
                save_result = db.save_global_trend(video, analysis_result)
                
                if save_result and save_result != "duplicate":
                    processed_count += 1
            else:
                logger.warning(f"⚠️ Analysis failed or empty for {video.get('title')}")
                
        except Exception as e:
            logger.error(f"❌ Error processing {video.get('title')}: {e}")
        finally:
            # 3. Cleanup Individual File (Save space immediately)
            try:
                if os.path.exists(video_path):
                    os.remove(video_path)
            except Exception as e:
                logger.error(f"⚠️ Failed to delete temp file {video_path}: {e}")

    # Final Cleanup of temp dir
    scraper.cleanup()
    
    logger.info("="*60)
    logger.info(f"✅ Global Researcher Complete. Added {processed_count} new viral insights.")
    logger.info("="*60)

if __name__ == "__main__":
    run_global_researcher()
