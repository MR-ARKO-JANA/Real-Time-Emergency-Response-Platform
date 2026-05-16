"""
Test the enhanced intent classifier without needing a microphone.
Tests both keyword fallback accuracy and context-aware filtering.

Run: python voice-assistant/test_classifier.py
"""
import sys
import os
import time
sys.path.insert(0, os.path.dirname(__file__))

from voice_sos import check_emergency_intent

# ── Test Cases ──
TEST_CASES = [
    # === SHOULD TRIGGER (True Emergencies) ===
    ("help me someone is following me",      True,  "security"),
    ("i'm having a heart attack",            True,  "medical"),
    ("my kitchen is on fire",                True,  "fire"),
    ("bachao madad karo",                    True,  "security"),
    ("i've been in a car accident",          True,  "mechanic"),
    ("call the police",                      True,  "security"),
    ("someone is bleeding badly",            True,  "medical"),
    ("there's smoke in the building",        True,  "fire"),
    ("i'm trapped in the elevator",          True,  "security"),
    ("my car crashed into a pole",           True,  "mechanic"),
    ("he has a gun",                         True,  "security"),
    ("she's choking on food",                True,  "medical"),
    ("i can't breathe",                      True,  "medical"),
    
    # === SHOULD NOT TRIGGER (Non-Emergencies) ===
    ("i saw a fire on the news",             False, None),
    ("i need to buy medical supplies",       False, None),
    ("i'm feeling fine today",               False, None),
    ("the weather is nice",                  False, None),
    ("watched an attack scene in a movie",   False, None),
    ("i read about a crash yesterday",       False, None),
    ("just testing the microphone",          False, None),
]

print("=" * 70)
print("  NearHelp Intent Classifier — Full Test Suite")
print("  Mode: Keyword Fallback (no Gemini API required)")
print("=" * 70)

passed = 0
failed = 0

for text, expected_emergency, expected_category in TEST_CASES:
    is_emergency, category, reason, confidence, urgency = check_emergency_intent(text)
    
    # Check emergency status match
    status_ok = is_emergency == expected_emergency
    # Check category match (only if emergency expected)
    category_ok = (not expected_emergency) or (category == expected_category)
    
    all_ok = status_ok and category_ok
    status = "✅" if all_ok else "❌"
    
    if all_ok:
        passed += 1
    else:
        failed += 1
    
    print(f"\n{status} \"{text}\"")
    if not status_ok:
        print(f"   ⚠ Emergency: expected={expected_emergency}, got={is_emergency}")
    if not category_ok:
        print(f"   ⚠ Category: expected={expected_category}, got={category}")
    if is_emergency:
        print(f"   → {category} | conf={confidence} | urgency={urgency} | {reason}")

    # Delay to stay under the 15 requests/minute free tier quota
    time.sleep(4)

print(f"\n{'=' * 70}")
accuracy = (passed / len(TEST_CASES)) * 100
icon = "🟢" if accuracy >= 90 else "🟡" if accuracy >= 70 else "🔴"
print(f"  {icon} Results: {passed}/{len(TEST_CASES)} passed ({accuracy:.0f}% accuracy)")
print(f"{'=' * 70}")
