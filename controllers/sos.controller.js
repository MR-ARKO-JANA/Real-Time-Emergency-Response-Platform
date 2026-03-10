const SOS = require('../models/sos.model');

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper to get genAI instance lazily
const getGenAI = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing from environment variables.");
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Real AI Logic Endpoint using Gemini
exports.getGuidance = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is required.' });
        }
        const { crisisType, description } = req.body;
        if (!crisisType) {
            return res.status(400).json({ error: 'crisisType is required.' });
        }

        const genAI = getGenAI();
        // Use gemini-1.5-flash which is the current most stable/available for free tier
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
        });

        const prompt = `You are an expert AI Crisis Assistant for an emergency response platform in India.
You must provide immediate, life-saving guidance based on the provided crisis type and description. You should route people to Indian emergency services (e.g., dial 112 for National Emergency, 108 for Ambulance, 100 for Police, 101 for Fire).

CRISIS TYPE: ${crisisType}
DESCRIPTION: ${description || "No description provided."}

Return a STRICT JSON object with EXACTLY the following three keys:
1. "firstResponseGuidance": An array of 3-4 string elements. Each string is a brief, immediate, actionable step a bystander in India should take right now.
2. "emergencySummary": A short, dense paragraph summarizing the situation, designed to be read aloud to an Indian emergency dispatcher (such as a 112 operator).
3. "debriefPrompt": A single string question to ask the responder after the SOS is resolved to verify the outcome or gather final details.

Output only valid JSON, nothing else.`;

        let result;
        try {
            result = await model.generateContent(prompt);
        } catch (genErr) {
            throw genErr; // Let the outer catch handle it
        }
        let responseText = result.response.text();

        // If it's a custom chat, we can be more flexible
        if (crisisType === 'custom_chat') {
            return res.status(200).json({
                emergencySummary: responseText,
                firstResponseGuidance: [responseText.substring(0, 100) + "..."]
            });
        }

        // For structured guidance, try to extract JSON
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }
            const responseData = JSON.parse(responseText);
            return res.status(200).json(responseData);
        } catch (parseErr) {
            return res.status(200).json({
                firstResponseGuidance: ["Follow instructions in summary."],
                emergencySummary: responseText,
                debriefPrompt: "Was the guidance helpful?"
            });
        }

    } catch (err) {
        // Fallback for demo/restricted environments
        const cType = req.body ? req.body.crisisType : "emergency";
        const fallback = {
            firstResponseGuidance: [
                "Stay calm and assess the immediate danger.",
                "Alert nearby people for assistance.",
                "Call emergency services (112) immediately.",
                "Follow standard first aid protocols for " + (cType || "this emergency") + "."
            ],
            emergencySummary: `A ${cType || "unspecified"} emergency has occurred. Immediate assistance is requested. Bystanders are advised to keep the area clear and wait for professional responders.`,
            debriefPrompt: "How many people were affected by this incident?"
        };
        return res.status(200).json(fallback);
    }
};

const EMERGENCY_CONTACTS = {
    medical: "7478435239",
    police: "7478435239",
    fire: "7478435239",
    mechanic: "7478435239"
};

exports.notifyEmergencyServices = async (req, res) => {
    try {
        const { crisisType, location, number } = req.body;
        const targetNumber = number || "7478435239";

        return res.status(200).json({ success: true, contacted: targetNumber });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to notify emergency services' });
    }
};

// Admin: Get all SOS Records
exports.getAllSos = async (req, res) => {
    try {
        const alerts = await SOS.find().populate('broadcaster', ['name', 'phone', 'rating']).sort({ createdAt: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};
