import socketio
import requests
import json
import time
import sys

# Configuration
SERVER_URL = "http://localhost:3000"

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

def trigger_sos(phrase_detected):
    print(f"!!! MOCK TRIGGER DETECTED: '{phrase_detected}' !!!")
    lat, lng = get_location()
    
    # Register location first
    sio.emit('update_location', {
        "name": "Voice Assistant (Test)",
        "role": "System Bot",
        "lat": lat,
        "lng": lng,
        "phone": "N/A"
    })
    
    sos_payload = {
        "type": "security", # Use a standard category
        "lat": lat,
        "lng": lng,
        "isAnon": False,
        "types": ["security"],
        "description": f"Voice-activated SOS triggered by phrase: '{phrase_detected}'",
        "isVoice": True,
        "confidence": 0.95,
        "urgency": "high"
    }
    
    if sio.connected:
        sio.emit('trigger_sos', sos_payload)
        print("SOS Alert broadcasted successfully to all nearby responders.")
    else:
        print("Error: Not connected to server.")

def main():
    try:
        sio.connect(SERVER_URL)
        print("\n--- NearHelp Voice Assistant TEST MODE ---")
        print("Waiting 5 seconds before simulated trigger...")
        time.sleep(5)
        
        trigger_sos("I need police help")
        
        print("\nTest complete. Waiting 10 seconds to allow broadcast to finish...")
        time.sleep(10)
        sio.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
