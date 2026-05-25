import speech_recognition as sr
import socketio
import requests
import json
import time
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()  # Fallback for local directory .env

# Configuration
SERVER_URL = os.getenv("SERVER_URL", "https://nearhelp-service-127178207448.us-central1.run.app")

# ── Emergency Keywords (mapped to categories) ──
MEDICAL_KEYWORDS = [
    "medical", "doctor", "ambulance", "hospital", "heart", "breathing",
    "bleeding", "wound", "choking", "poison", "seizure", "stroke",
    "collapsed", "unconscious", "chest pain", "not breathing", "faint"
]
FIRE_KEYWORDS = ["fire", "smoke", "burn", "burning", "flames"]
SECURITY_KEYWORDS = [
    "police", "attack", "stab", "gun", "robbery", "theft", "kidnap",
    "assault", "threat", "stalking", "stalk", "stalker", "following",
    "followed"
]
MECHANIC_KEYWORDS = ["mechanic", "car broke", "flat tire", "accident", "crash", "collision"]
GENERAL_KEYWORDS = [
    "help", "emergency", "save", "danger", "stop", "don't",
    "run", "panic", "trapped", "drowning", "safety",
    "bachao", "madad", "police ko bulao", "khatra"
]

# Combined flat list for quick lookup
EMERGENCY_KEYWORDS = (
    MEDICAL_KEYWORDS + FIRE_KEYWORDS + SECURITY_KEYWORDS +
    MECHANIC_KEYWORDS + GENERAL_KEYWORDS
)

TRIGGER_PHRASES = [
    "i need help", "help me", "save me", "call the police",
    "emergency emergency", "someone help", "i'm in danger",
    "stop it", "get away", "call 112", "call 100", "medical help",
    "i've been in a car accident", "there's been an accident",
    "someone is hurt", "i can't breathe", "i'm trapped"
]

# ── Non-emergency context patterns (suppress false positives) ──
NON_EMERGENCY_CONTEXT = [
    "on the news", "on tv", "in a movie", "in the movie",
    "video game", "game", "supplies", "store", "buy", "shopping",
    "yesterday", "last week", "last year", "read about",
    "saw a", "watched", "article", "newspaper", "feeling fine",
    "drill", "practice", "training", "test", "testing",
    "joke", "joking", "kidding", "just kidding"
]

# Cooldown: prevent duplicate SOS triggers within this window (seconds)
SOS_COOLDOWN = 30
_last_sos_time = 0

# Initialize Socket.io client
sio = socketio.Client()

def get_location():
    """
    Fetches real location. Priority:
    1. Manual override in .env (LAT/LNG)
    2. IP-based geolocation (ipinfo.io)
    3. Default Fallback (Jamshedpur)
    """
    # 1. Manual Override for Testing
    env_lat = os.getenv("LAT")
    env_lng = os.getenv("LNG")
    if env_lat and env_lng:
        try:
            return float(env_lat), float(env_lng)
        except Exception:
            pass

    # 2. IP-based Geolocation
    try:
        # Using ipinfo.io as it's often more accurate for city-level data
        response = requests.get("https://ipinfo.io/json")
        data = response.json()
        if 'loc' in data:
            lat, lon = data['loc'].split(',')
            return float(lat), float(lon)
    except Exception as e:
        print(f"  [LOC] IP Lookup failed: {e}. Trying secondary service...")
        try:
            response = requests.get("http://ip-api.com/json/")
            data = response.json()
            if data['status'] == 'success':
                return data['lat'], data['lon']
        except Exception:
            pass
    
    # 3. Final Fallback
    return 22.7745, 86.1439 

@sio.event
def connect():
    print(f"Connected to NearHelp server at {SERVER_URL}")

@sio.event
def disconnect():
    print("Disconnected from server")

def trigger_sos(category, description, confidence=None, urgency=None):
    """Broadcasts the SOS to the server."""
    print(f"\n{'='*50}")
    print(f"[!!!] SOS TRIGGERED [!!!]")
    print(f"  Category : {category.upper()}")
    print(f"  Reason   : {description}")
    if confidence is not None:
        print(f"  Confidence: {confidence:.0%}")
    if urgency:
        print(f"  Urgency  : {urgency.upper()}")
    print(f"{'='*50}")
    
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
        "isVoice": True,
        "confidence": confidence,
        "urgency": urgency
    }
    
    if sio.connected:
        sio.emit('trigger_sos', sos_payload)
        print(f"Alert broadcasted to all responders successfully.")
    else:
        print("Error: Disconnected from server.")

# Minimum confidence threshold for AI classification to trigger SOS
CONFIDENCE_THRESHOLD = 0.4

def check_emergency_intent(text):
    """
    Classifies transcribed text using a two-stage pipeline:
      Stage 1: Gemini AI with structured prompt (confidence + urgency scoring)
      Stage 2: Keyword/phrase fallback if AI is unavailable
    
    Returns: (is_emergency, category, reason, confidence, urgency)
    """
    text = text.lower().strip()
    
    # ── Stage 1: AI-Powered Classification ──
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key:
            from google import genai
            client = genai.Client(api_key=api_key)
            
            prompt = f"""### ROLE
You are the Real-Time Intent Classifier for NearHelp, an emergency SOS platform. Your task is to analyze audio-transcribed text and determine if the user is in immediate danger.

### INPUT DATA
User Text: "{text}"

### CLASSIFICATION RULES
1. **EMERGENCY (True)**: Trigger if the text indicates a need for help, danger, or a specific crisis (Medical, Fire, Security, Mechanic).
   - Examples: "I'm having a heart attack," "Help, someone is following me," "My kitchen is on fire," "I've been in a car accident."
   - Include Hindi keywords: "Bachao," "Madad," "Police ko bulao," "Khatra."
2. **NON-EMERGENCY (False)**: Do not trigger for casual mentions, testing, or general conversation.
   - Examples: "I saw a fire on the news," "I need to buy medical supplies," "I'm feeling fine."

### OUTPUT FORMAT (STRICT JSON ONLY)
Return a JSON object with exactly these fields:
{{"is_emergency": boolean, "category": "medical" | "fire" | "security" | "mechanic" | "other" | "none", "confidence_score": float, "urgency_level": "high" | "medium" | "low", "reasoning": "short explanation"}}

### CRITICAL INSTRUCTION
If the user sounds panicked or the intent is ambiguous but potentially dangerous, default to "is_emergency": true. Accuracy is life-critical."""

            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )
            res_text = response.text.strip()
            if "```json" in res_text:
                res_text = res_text.split("```json")[1].split("```")[0].strip()
            elif "```" in res_text:
                res_text = res_text.split("```")[1].split("```")[0].strip()
            
            data = json.loads(res_text)
            is_emergency = data.get("is_emergency", False)
            category = data.get("category", "other")
            confidence = data.get("confidence_score", 0.0)
            urgency = data.get("urgency_level", "low")
            reasoning = data.get("reasoning", text)

            # Log classification result for debugging
            print(f"  [AI] emergency={is_emergency} | {category} | conf={confidence:.0%} | urgency={urgency}")
            print(f"  [AI] reasoning: {reasoning}")

            if is_emergency and confidence >= CONFIDENCE_THRESHOLD:
                return True, category, reasoning, confidence, urgency
            elif is_emergency and confidence < CONFIDENCE_THRESHOLD:
                print(f"  [AI] Suppressed: confidence {confidence:.0%} < threshold {CONFIDENCE_THRESHOLD:.0%}")
                return False, None, None, confidence, None
            else:
                return False, None, None, confidence, None

    except Exception as e:
        print(f"  [AI] Classification failed: {e}. Falling back to keywords...")

    # ── Stage 2: Keyword Fallback with context filtering ──
    
    # Check if text contains non-emergency context clues
    has_safe_context = any(ctx in text for ctx in NON_EMERGENCY_CONTEXT)
    
    # Trigger phrases are high-confidence (override safe context)
    for phrase in TRIGGER_PHRASES:
        if phrase in text:
            return True, _categorize_text(text), f"Phrase match: {phrase}", 0.8, "high"

    # Keyword matching (suppressed if safe context detected)
    if not has_safe_context:
        for word in EMERGENCY_KEYWORDS:
            if word in text:
                category = _categorize_text(text)
                return True, category, f"Keyword match: {word}", 0.6, "medium"

    return False, None, None, 0.0, None


def _categorize_text(text):
    """Determines the best crisis category from the text content."""
    text = text.lower()
    if any(k in text for k in MEDICAL_KEYWORDS):
        return "medical"
    if any(k in text for k in FIRE_KEYWORDS):
        return "fire"
    if any(k in text for k in MECHANIC_KEYWORDS):
        return "mechanic"
    if any(k in text for k in SECURITY_KEYWORDS):
        return "security"
    return "security"  # Default for general distress

def main():
    try:
        sio.connect(SERVER_URL, transports=['websocket'])
    except:
        print("Waiting for server...")

    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    
    print("Calibrating microphone for ambient noise... Please wait.")
    try:
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source, duration=1.5)
        print(f"Calibration complete. Dynamic energy threshold: {recognizer.energy_threshold:.0f}")
    except Exception as e:
        print(f"Ambient noise calibration failed: {e}. Using default threshold (300).")
        recognizer.energy_threshold = 300
    
    print("\n--- NearHelp Voice Assistant Active (Listening...) ---")
    
    while True:
        try:
            if not sio.connected:
                try: sio.connect(SERVER_URL, transports=['websocket'])
                except: pass

            with microphone as source:
                print(".", end="", flush=True)
                audio = recognizer.listen(source, timeout=3, phrase_time_limit=8)
            
            try:
                text = recognizer.recognize_google(audio).lower()
                print(f"\nHeard: {text}")
                
                is_emergency, category, reason, confidence, urgency = check_emergency_intent(text)
                if is_emergency:
                    global _last_sos_time
                    now = time.time()
                    if now - _last_sos_time < SOS_COOLDOWN:
                        print(f"  [COOLDOWN] Skipping duplicate SOS ({SOS_COOLDOWN - int(now - _last_sos_time)}s remaining)")
                    else:
                        _last_sos_time = now
                        trigger_sos(category, reason, confidence, urgency)
                        
            except sr.UnknownValueError:
                print("?", end="", flush=True)
            except sr.RequestError as e:
                print(f"\n[Mic Error] Speech Recognition service error: {e}")
                
        except sr.WaitTimeoutError:
            pass
        except KeyboardInterrupt:
            print("\nExiting...")
            sys.exit()
        except Exception as e:
            time.sleep(1)

if __name__ == "__main__":
    main()
