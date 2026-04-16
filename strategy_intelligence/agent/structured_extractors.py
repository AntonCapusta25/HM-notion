import json
import uuid
import time
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"

def call_ollama(prompt: str) -> str:
    """Wrapper to call local Ollama model securely with JSON extraction."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(OLLAMA_URL, json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }, timeout=120)
            response.raise_for_status()
            return response.json().get("response", "")
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"  ⏳ Local Ollama connection failed. Retrying in 5s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(5)
            else:
                raise e
    return ""

def extract_pain_points(competitor: str, review_text: str, rating: str):
    """
    Sends a raw review to Gemini and forces it to extract structured pain point intelligence.
    Returns a list of dictionary pain points matching the DB schema.
    """
    prompt = f"""
    You are a Competitive Intelligence AI analyzing reviews for the food delivery platform '{competitor}'.
    
    RAW REVIEW RATING: {rating} stars
    RAW REVIEW TEXT:
    "{review_text}"
    
    Extract specific customer pain points from this food delivery review. 
    If there are absolutely no pain points (e.g., 5-star positive review), return an empty array for 'pain_points'.
    
    You MUST output valid JSON exactly matching this schema:
    {{
      "pain_points": [
        {{
          "category": "delivery|food_quality|customer_service|pricing|app_ux|restaurant_selection",
          "specific_issue": "string (The core problem, max 10 words)",
          "severity": "low|medium|high|critical",
          "sentiment_score": float (-1.0 to 1.0, where -1 is extreme anger),
          "emotional_tone": "angry|frustrated|disappointed|neutral",
          "customer_segment_inferred": "student|family|professional|foodie|unknown",
          "actionable_insight": "string (Why did this specific failure happen?)",
          "is_systemic_issue": boolean (true if highly likely to happen to others),
          "opportunity_score": integer (1 to 100 on how big an opportunity this is for a competitor to solve),
          "homemade_solution": "string (How can a premium home-chef delivery service effortlessly solve this?)"
        }}
      ]
    }}
    
    Return pure JSON with no markdown formatting blocks.
    """
    
    try:
        text = call_ollama(prompt).strip()
        data = json.loads(text)
        return data.get("pain_points", [])
    except Exception as e:
        print(f"Error extracting pain points: {e}")
        return []

def extract_unmet_needs(source: str, user_post: str, upvotes: int = 0):
    """
    Sends a raw social media post to Gemini and extracts unmet market needs.
    Returns a list of dictionary needs matching the unmet_customer_needs DB schema.
    """
    prompt = f"""
    You are a Strategic Market Researcher analyzing a social media post from {source}.
    
    RAW POST (Upvotes: {upvotes}):
    "{user_post}"
    
    Extract specific unmet customer needs or complaints about the current market (specifically food delivery/dining in Amsterdam). 
    If this is just a general statement with NO unmet needs, return an empty array for 'unmet_needs'.
    
    You MUST output valid JSON exactly matching this schema:
    {{
      "unmet_needs": [
        {{
          "unmet_need": "string (The core missing thing they want, max 10 words)",
          "need_category": "authenticity|price|quality|variety|convenience|health|cultural",
          "customer_segment": "student|expat|family|professional|foodie|unknown",
          "urgency_level": "nice_to_have|important|critical",
          "validation_score": integer (base this off the upvotes, 1-100),
          "homemade_solution": "string (How Homemade can instantly fulfill this need)",
          "market_size_estimate": "small|medium|large",
          "competitive_gap": boolean (true if existing competitors clearly fail to provide this),
          "implementation_priority": integer (1 to 10 on how easy/valuable it is to build)
        }}
      ]
    }}
    
    Return pure JSON with no markdown formatting blocks.
    """
    
    try:
        text = call_ollama(prompt).strip()
        data = json.loads(text)
        return data.get("unmet_needs", [])
    except Exception as e:
        print(f"Error extracting unmet needs: {e}")
        return []
