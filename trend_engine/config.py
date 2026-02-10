import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service role for backend writing
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Export for edge function calls
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configuration
EMAIL_FROM = "trends@homemade-meals.com"
EMAIL_TO_LIST = ["bangalexf@gmail.com"]
VIRAL_THRESHOLD_SCORE = 7.5

# Scraper Settings
TIKTOK_HASHTAGS = [
    "homecooking", "cookwithme", "mealprep", "homechef", "comfortfood", "tinykitchen"
]

SUBREDDITS = [
    "HomeCooking", "MealPrepSunday", "EatCheapAndHealthy", "Netherlands"
]
