import { useState, useEffect, useCallback } from 'react';

// Keywords ported from voice_sos.py
const MEDICAL_KEYWORDS = ["medical", "doctor", "ambulance", "hospital", "heart", "breathing", "breathe", "breath", "pain", "bleeding", "wound", "choking", "poison", "seizure", "stroke", "collapsed", "unconscious", "chest pain", "not breathing", "faint"];
const FIRE_KEYWORDS = ["fire", "smoke", "burn", "burning", "flames"];
const SECURITY_KEYWORDS = ["police", "attack", "stab", "gun", "robbery", "theft", "kidnap", "assault", "threat", "stalking", "stalk", "stalker", "following", "followed"];
const MECHANIC_KEYWORDS = ["mechanic", "car broke", "flat tire", "accident", "crash", "collision"];
const GENERAL_KEYWORDS = ["help", "emergency", "save", "danger", "stop", "don't", "run", "panic", "trapped", "drowning", "safety", "bachao", "madad", "police ko bulao", "khatra"];

const EMERGENCY_KEYWORDS = [...MEDICAL_KEYWORDS, ...FIRE_KEYWORDS, ...SECURITY_KEYWORDS, ...MECHANIC_KEYWORDS, ...GENERAL_KEYWORDS];

export function useVoiceTrigger(onEmergencyDetected) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);

    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError('Speech recognition is not supported in this browser.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                currentTranscript += event.results[i][0].transcript;
            }
            
            setTranscript(currentTranscript);
            
            const lowerTranscript = currentTranscript.toLowerCase();
            
            // Check for emergency keywords
            const foundKeyword = EMERGENCY_KEYWORDS.find(keyword => lowerTranscript.includes(keyword));
            
            if (foundKeyword) {
                let category = 'other';
                if (MEDICAL_KEYWORDS.includes(foundKeyword)) category = 'medical';
                else if (FIRE_KEYWORDS.includes(foundKeyword)) category = 'fire';
                else if (SECURITY_KEYWORDS.includes(foundKeyword)) category = 'security';
                else if (MECHANIC_KEYWORDS.includes(foundKeyword)) category = 'mechanic';
                
                // Stop listening to prevent multiple triggers
                recognition.stop();
                
                if (onEmergencyDetected) {
                    onEmergencyDetected({
                        category,
                        keyword: foundKeyword,
                        transcript: currentTranscript
                    });
                }
            }
        };

        recognition.onerror = (event) => {
            setError(event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            // Automatically restart if it was supposed to be listening (continuous mode fallback)
            if (isListening) {
                try {
                    recognition.start();
                } catch (e) {
                    setIsListening(false);
                }
            } else {
                setIsListening(false);
            }
        };

        try {
            recognition.start();
        } catch (e) {
            setError('Failed to start speech recognition.');
        }

        return () => {
            recognition.stop();
            setIsListening(false);
        };
    }, [onEmergencyDetected, isListening]);

    const stopListening = useCallback(() => {
        setIsListening(false);
        // We rely on state to prevent auto-restart in onend
    }, []);

    return { isListening, startListening, stopListening, transcript, error };
}
