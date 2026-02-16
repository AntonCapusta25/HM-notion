import os
import time
import json
import logging
import yt_dlp
from datetime import datetime
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class GlobalViralityScraper:
    def __init__(self):
        self.download_path = os.path.join(os.getcwd(), "temp_downloads")
        if not os.path.exists(self.download_path):
            os.makedirs(self.download_path)

    def fetch_youtube_shorts(self, limit=5):
        """
        Fetches trending YouTube Shorts that are NOT related to cooking/food.
        Downloads the video file for AI analysis.
        """
        logger.info(f"🔍 Searching for top {limit} viral YouTube Shorts...")
        
        # Search query designed to find general viral content
        # Using #shorts tag specifically to find short form content
        query = "#shorts"
        
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': os.path.join(self.download_path, '%(id)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,  # Just get metadata first
            'search_query': query,
            'playlistend': limit * 10, # Fetch 10x to filter deeply
        }

        candidates = []

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Search for videos
                logger.info(f"🔎 Executing search: {query}")
                search_results = ydl.extract_info(f"ytsearch{limit*10}:{query}", download=False)
                
                if 'entries' in search_results:
                    logger.info(f"Found {len(search_results['entries'])} raw results")
                    for entry in search_results['entries']:
                        if len(candidates) >= limit:
                            break
                            
                        video_id = entry.get('id')
                        title = entry.get('title', '')
                        duration = entry.get('duration', 0)
                        
                        logger.info(f"Checking: {title} ({duration})s")

                        # Filter: Must be Short (< 90s)
                        if duration and duration > 90:
                            continue
                            
                        # Double check for food content in title
                        if any(keyword in title.lower() for keyword in ['cook', 'recipe', 'food', 'eat', 'chef']):
                            continue

                        # Download video AND attributes
                        logger.info(f"⬇️ Downloading: {title} ({video_id})")
                        video_data = self._download_video_and_subs(video_id)
                        
                        if video_data:
                            candidates.append({
                                'platform': 'youtube',
                                'source_id': video_id,
                                'url': f"https://www.youtube.com/shorts/{video_id}",
                                'title': title,
                                'description': entry.get('description', ''),
                                'duration': duration,
                                'views': entry.get('view_count', 0),
                                'file_path': video_data['video_path'],
                                'transcript': video_data['transcript']
                            })
                            
        except Exception as e:
            logger.error(f"❌ Error scraping YouTube Shorts: {e}")

        logger.info(f"✅ Found {len(candidates)} viral candidates ready for analysis")
        return candidates

    def _download_video_and_subs(self, video_id):
        """
        Downloads video and attempts to get transcript.
        """
        try:
            ydl_opts = {
                'format': 'best[ext=mp4]', 
                'outtmpl': os.path.join(self.download_path, '%(id)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                # Subtitle options
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en'],
                'skip_download': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
                
            # Locate Video
            video_path = None
            possible_video = os.path.join(self.download_path, f"{video_id}.mp4")
            if os.path.exists(possible_video):
                video_path = possible_video
            
            # Locate Transcript (.vtt)
            transcript = ""
            possible_vtt = os.path.join(self.download_path, f"{video_id}.en.vtt")
            if os.path.exists(possible_vtt):
                transcript = self._parse_vtt(possible_vtt)
                # cleanup vtt
                try: os.remove(possible_vtt)
                except: pass
            
            if video_path:
                return {'video_path': video_path, 'transcript': transcript}
            return None
            
        except Exception as e:
            logger.error(f"⚠️ Failed to download video {video_id}: {e}")
            return None

    def _parse_vtt(self, vtt_path):
        """Simple VTT parser to extract text"""
        try:
            text_lines = []
            with open(vtt_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # Skip metadata, timestamps, empty lines
                    if not line: continue
                    if '-->' in line: continue
                    if line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'): continue
                    if line.isdigit(): continue # sequence numbers
                    
                    # Deduplicate consecutive lines (common in VTT)
                    if text_lines and text_lines[-1] == line:
                        continue
                    text_lines.append(line)
            return " ".join(text_lines)
        except Exception as e:
            logger.error(f"Error parsing VTT: {e}")
            return ""

    def cleanup(self):
        """Removes all downloaded files from temp folder"""
        try:
            for file in os.listdir(self.download_path):
                os.remove(os.path.join(self.download_path, file))
            os.rmdir(self.download_path)
            logger.info("🧹 Cleaned up temp files")
        except Exception as e:
            logger.error(f"⚠️ Error cleaning up: {e}")

if __name__ == "__main__":
    scraper = GlobalViralityScraper()
    videos = scraper.fetch_youtube_shorts(limit=3)
    print(json.dumps(videos, indent=2, default=str))
    # scraper.cleanup() # Keep for inspection testing
