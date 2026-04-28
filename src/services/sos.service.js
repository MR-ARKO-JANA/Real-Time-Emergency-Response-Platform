const { GoogleGenerativeAI } = require('@google/generative-ai');
const SOS = require('../models/sos.model');
const logger = require('../loaders/logger');

class SOSService {
    constructor() {
        try {
            if (process.env.GEMINI_API_KEY) {
                this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                // Configuration for powerful, reliable responses
                this.model = this.genAI.getGenerativeModel({ 
                    model: "gemini-1.5-flash-latest"
                });
            }
        } catch (err) {
            logger.error('Failed to initialize Gemini AI:', err);
        }
    }

    async getAIResponse(crisisType, description) {
        if (!this.model) {
            logger.warn('Gemini API key missing, using fallback guidance');
            return this.getFallbackGuidance(crisisType);
        }

        if (crisisType === 'custom_chat') {
            return await this.getChatResponse(description);
        }

        const prompt = `You are an expert AI Crisis Assistant for an emergency response platform in India.
        You must provide immediate, life-saving guidance based on the provided crisis type and description. 
        You should route people to Indian emergency services (e.g., dial 112 for National Emergency, 108 for Ambulance, 100 for Police, 101 for Fire).

        CRISIS TYPE: ${crisisType}
        DESCRIPTION: ${description || "No description provided."}

        Return a STRICT JSON object with EXACTLY the following three keys:
        1. "firstResponseGuidance": An array of 3-4 string elements. Each string is a brief, immediate, actionable step a bystander in India should take right now.
        2. "emergencySummary": A short, dense paragraph summarizing the situation, designed to be read aloud to an Indian emergency dispatcher (such as a 112 operator).
        3. "debriefPrompt": A single string question to ask the responder after the SOS is resolved to verify the outcome or gather final details.

        Output only valid JSON, nothing else.`;

        try {
            const result = await this.model.generateContent(prompt);
            let responseText = result.response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }
            return JSON.parse(responseText);
        } catch (err) {
            logger.error('Error generating AI response:', err);
            return this.getFallbackGuidance(crisisType);
        }
    }

    async getChatResponse(userQuery) {
        try {
            // Check if model exists
            if (!this.model) throw new Error("AI Model not initialized");

            const chat = this.model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: "You are NearHelp AI, a powerful, smart, and friendly assistant. You function exactly like Gemini or ChatGPT. You can answer general questions, say hello, and assist with any query. However, if the user mentions an emergency, prioritize safety advice. Be helpful, concise, and professional." }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Hello! I am NearHelp AI. I can help you with safety guidance, emergency protocols, or answer any general questions you have. How can I assist you today?" }],
                    },
                ],
            });

            const result = await chat.sendMessage(userQuery);
            return { emergencySummary: result.response.text() };
        } catch (err) {
            logger.error('Chat AI error:', err);
            // Fallback to simple generation
            try {
                const result = await this.model.generateContent(userQuery);
                return { emergencySummary: result.response.text() };
            } catch (err2) {
                return { emergencySummary: "I'm having a connection issue with my brain! Please try again in a moment." };
            }
        }
    }

    getFallbackGuidance(crisisType) {
        return {
            firstResponseGuidance: [
                "Stay calm and assess the immediate danger.",
                "Alert nearby people for assistance.",
                "Call emergency services (112) immediately.",
                "Follow standard first aid protocols for " + (crisisType || "this emergency") + "."
            ],
            emergencySummary: `A ${crisisType || "unspecified"} emergency has occurred. Immediate assistance is requested. Bystanders are advised to keep the area clear and wait for professional responders.`,
            debriefPrompt: "How many people were affected by this incident?"
        };
    }

    async getAllRecords() {
        return await SOS.find().populate('broadcaster', ['name', 'phone', 'rating']).sort({ createdAt: -1 });
    }
}

module.exports = new SOSService();
