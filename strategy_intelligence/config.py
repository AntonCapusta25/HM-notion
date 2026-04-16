import os
from dotenv import load_dotenv

# Try to load .env from the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))
load_dotenv()

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

# Scraper Settings
DEFAULT_LOCATION = "Amsterdam"
REDDIT_SUBREDDITS = ["Amsterdam", "Netherlands", "HomeCooking", "MealPrepSunday"]

# AI Settings
DEFAULT_MODEL = "gemini-3-flash-preview"

# Report Settings
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

STRATEGY_SECTIONS = [
    "Executive Summary",
    "Market Opportunity Analysis",
    "Customer Persona Profiles",
    "Competitor Landscape",
    "Pricing & Revenue Model",
    "Marketing & Growth Strategy",
    "Platform & Experience Design",
    "Website & Conversion Optimization",
    "Operational Roadmap",
    "KPIs & Success Metrics",
    "Risk Analysis & Mitigation"
]
