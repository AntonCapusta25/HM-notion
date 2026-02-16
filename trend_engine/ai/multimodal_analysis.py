import os
import time
import json
import logging
from google import genai
from google.genai import types
from ..config import GEMINI_API_KEY

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MultimodalAnalyzer:
    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set")
            
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        
        # Use Gemini 2.5 Flash as requested (High performance, low latency)
        self.model = "gemini-2.5-flash" 

    def analyze_video(self, video_path, transcript=None):
        """
        Uploads video to Gemini and performs deep multimodal analysis.
        Args:
            video_path: Path to .mp4 file
            transcript: Optional text transcript extracted from source
        Returns a structured dictionary with hooks, audio, pacing, etc.
        """
        if not os.path.exists(video_path):
            logger.error(f"❌ Video file not found: {video_path}")
            return None

        try:
            # 1. Upload File
            logger.info(f"📤 Uploading video to Gemini: {os.path.basename(video_path)}...")
            
            # Using standard upload, handling potential SDK variations or network hiccups
            try:
                # Truncate filename if too long or has weird chars for API
                display_name = os.path.basename(video_path)[:50] 
                file_upload = self.client.files.upload(path=video_path, config=types.UploadFileConfig(display_name=display_name))
            except TypeError:
                 # Fallback for older/different SDK signatures if 'config' or 'path' fails
                 file_upload = self.client.files.upload(file=video_path)

            # 2. Wait for processing
            logger.info(f"⏳ Waiting for video processing ({file_upload.name})...")
            while file_upload.state.name == "PROCESSING":
                time.sleep(2)
                file_upload = self.client.files.get(name=file_upload.name)
                
            if file_upload.state.name == "FAILED":
                logger.error(f"❌ Video processing failed: {file_upload.error.message}")
                return None
                
            logger.info("✅ Video processed. Starting analysis...")

            # 3. Generate Content
            transcript_context = f"\n**TRANSCRIPT**:\n{transcript}\n" if transcript else ""
            
            # Part 1: Dynamic Context (f-string)
            intro_prompt = f"""
            You are a master Viral Content Researcher. Analyze this video in extreme detail to reverse-engineer its virality.
            {transcript_context}
            Focus on these 5 pillars:
            1. **THE HOOK (0-3s)**: Frame-by-frame analysis. What happens visually? What is the first audio cue? Why does it stop the scroll?
            2. **AUDIO ENGINEERING**: Identify the audio strategy. Is it a trending sound? Voiceover (ASMR, energetic, authoritative)? Music tempo?
            3. **VISUAL PACING**: Count the cuts in the first 5 seconds. Describe the editing style (fast, slow, jagged, smooth).
            4. **NARRATIVE STRUCTURE**: What is the payoff? Is there a loop?
            5. **REPLICA POTENTIAL**: How can others replicate this? (1-10 score)
            """

            # Part 2: Static Structure (Raw String to avoid f-string brace conflicts)
            structure_prompt = """
            Output PURE JSON with this structure:
            {
                "hook": {
                    "rating": 1-10,
                    "description": "...",
                    "technique": "..."
                },
                "audio": {
                    "type": "Voiceover/Music/Raw",
                    "mood": "...",
                    "transcript_summary": "..."
                },
                "pacing": {
                    "style": "...",
                    "cuts_per_minute": 0
                },
                "visuals": {
                    "aesthetic": "...",
                    "text_overlay_usage": "..."
                },
                "virality_factors": ["factor1", "factor2"],
                "replica_potential": 1-10,
                "why_it_worked": "..."
            }
            """
            
            final_prompt = intro_prompt + structure_prompt
            
            # Simple content list support in new SDK
            response = self.client.models.generate_content(
                model=self.model,
                contents=[file_upload, final_prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                ),
            )
            
            # 4. Cleanup (optional, but good practice to delete from Gemini storage if needed, 
            # though SDK might not expose delete easily or it auto-expires. 
            # We'll assume auto-expiry for now or implement delete if critical)
            
            # Parse response
            try:
                analysis_json = json.loads(response.text)
                return analysis_json
            except json.JSONDecodeError:
                logger.error("❌ Failed to parse JSON response")
                return None

        except Exception as e:
            logger.error(f"❌ Error during multimodal analysis: {e}")
            # Fallback to 1.5 Pro if 2.0 fails (e.g. not available in region/key)
            if self.model == "gemini-2.0-flash-exp":
                logger.info("⚠️ Retrying with gemini-1.5-pro...")
                self.model = "gemini-1.5-pro"
                return self.analyze_video(video_path)
            return None

if __name__ == "__main__":
    # Test stub
    pass
