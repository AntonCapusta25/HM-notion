import os
import sys
from google import genai
from google.genai import types
from trend_engine.config import GEMINI_API_KEY

print(f"API Key present: {bool(GEMINI_API_KEY)}")

try:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("Client initialized.")
    
    # Simple list models call to check connection
    # Note: New SDK might have different list_models syntax, let's try generate simple text
    response = client.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents="Hello, are you online?"
    )
    print(f"Response received: {response.text}")
    
except Exception as e:
    print(f"Connection failed: {e}")
