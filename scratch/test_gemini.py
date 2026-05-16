import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

try:
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents='Say hello'
    )
    print(f"Success: {response.text}")
except Exception as e:
    print(f"Failed: {e}")
