import os
import google.generativeai as genai
from trend_engine.config import GEMINI_API_KEY

# Using older SDK version for compatibility if new one is tricky
genai.configure(api_key=GEMINI_API_KEY)

try:
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
