import os
from google import genai
from trend_engine.config import GEMINI_API_KEY

# Create dummy file
with open("test_video.txt", "w") as f:
    f.write("This is a dummy video file for testing upload.")

try:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("Client initialized.")
    
    print("Uploading file...")
    # Try different upload syntax or just standard
    response = client.files.upload(file="test_video.txt")
    print(f"Upload successful: {response.name}")
    
    print("Generating content...")
    # Use 1.5 flash which should be available
    res = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=[response, "What is this file?"]
    )
    print(res.text)

except Exception as e:
    print(f"Error: {e}")
