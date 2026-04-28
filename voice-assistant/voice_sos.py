import speech_recognition as sr
import socketio
import requests
import json
import time
import sys
import os
from dotenv import load_dotenv

# Configuration
SERVER_URL = "http://localhost:3000"

# Comprehensive list of emergency keywords and phrases
EMERGENCY_KEYWORDS = [
    "police", "help", "emergency", "save", "danger", "stop", "don't", 
    "ambulance", "fire", "attack", "run", "threat", "safety", "panic",
    "medical", "doctor", "heart", "hospital", "breathing",
    "bachao", "madad", "police ko bulao", "khatra"
]

TRIGGER_PHRASES = [
    "i need help", "help me", "save me", "call the police", 
    "emergency emergency", "someone help", "i'm in danger",
    "stop it", "get away", "call 112", "call 100", "medical help"
]

# Initialize Socket.io client
sio = socketio.Client()

def get_location():
    """Fetches approximate location based on IP address."""
    try:
        response = requests.get("http://ip-api.com/json/")
        data = response.json()
        if data['status'] == 'success':
            return data['lat'], data['lon']
    except Exception as e:
        print(f"Error fetching location: {e}")
    return 22.7745, 86.1439 

@sio.event
def connect():
    print(f"Connected to NearHelp server at {SERVER_URL}")

@sio.event
def disconnect():
    print("Disconnected from server")

def trigger_sos(category, description):
    """Broadcasts the SOS to the server."""
    print(f"\n[!!!] SOS TRIGGERED [!!!]")
    print(f"Category: {category.upper()}")
    print(f"Reason: {description}")
    
    lat, lng = get_location()
    
    # Register location first
    sio.emit('update_location', {
        "name": "Voice Assistant",
        "role": "System Bot",
        "lat": lat,
        "lng": lng,
        "phone": "N/A"
    })
    
    sos_payload = {
        "type": category, 
        "lat": lat,
        "lng": lng,
        "isAnon": False,
        "types": [category],
        "description": f"Voice Trigger [{category.upper()}]: {description}",
        "isVoice": True # Added flag for backend/frontend
    }
    
    if sio.connected:
        sio.emit('trigger_sos', sos_payload)
        print(f"Alert broadcasted to all responders successfully.")
    else:
        print("Error: Disconnected from server.")

def check_emergency_intent(text):
    """
    Classifies text into categories: 'medical', 'fire', 'security', 'mechanic', 'other'
    """
    text = text.lower().strip()
    
    # AI-Powered Classification
    try:
        load_dotenv(dotenv_path="../.env")
        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            # Use gemini-2.0-flash as it is known to work in this environment
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = f"""
            Analyze this spoken text: '{text}'
            Is this an emergency? If yes, classify into: 'medical', 'fire', 'security', 'mechanic', 'other'.
            Return ONLY a JSON object: {{"is_emergency": true, "category": "security", "reason": "..."}}
            If not emergency: {{"is_emergency": false}}
            """
            response = model.generate_content(prompt)
            res_text = response.text.strip()
            if "```json" in res_text:
                res_text = res_text.split("```json")[1].split("```")[0].strip()
            
            data = json.loads(res_text)
            if data.get("is_emergency"):
                return True, data.get("category", "other"), data.get("reason", text)
    except Exception as e:
        print(f"AI classification failed: {e}. Using keywords...")

    # Keyword Fallback
    for phrase in TRIGGER_PHRASES:
        if phrase in text:
            return True, "security", f"Phrase match: {phrase}"

    for word in EMERGENCY_KEYWORDS:
        if word in text:
            category = "security"
            if word in ["medical", "doctor", "ambulance", "hospital"]: category = "medical"
            if word in ["fire", "smoke"]: category = "fire"
            return True, category, f"Keyword match: {word}"

    return False, None, None

def main():
    try:
        sio.connect(SERVER_URL)
    except:
        print("Waiting for server...")

    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    recognizer.energy_threshold = 300
    
    print("\n--- NearHelp Voice Assistant Active ---")
    
    while True:
        try:
            if not sio.connected:
                try: sio.connect(SERVER_URL)
                except: pass

            with microphone as source:
                print(".", end="", flush=True)
                audio = recognizer.listen(source, timeout=3, phrase_time_limit=8)
            
            try:
                text = recognizer.recognize_google(audio).lower()
                print(f"\nHeard: {text}")
                
                is_emergency, category, reason = check_emergency_intent(text)
                if is_emergency:
                    trigger_sos(category, reason)
                        
            except sr.UnknownValueError:
                pass
            except sr.RequestError:
                pass
                
        except sr.WaitTimeoutError:
            pass
        except KeyboardInterrupt:
            print("\nExiting...")
            sys.exit()
        except Exception as e:
            time.sleep(1)

if __name__ == "__main__":
    main()
