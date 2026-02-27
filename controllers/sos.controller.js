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
        const { crisisType, description } = req.body;

        if (!crisisType) {
            return res.status(400).json({ error: 'crisisType is required.' });
        }

        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-lite-latest",
            generationConfig: {
                responseMimeType: "application/json",
            }
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

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse the generated JSON
        const responseData = JSON.parse(responseText);

        return res.status(200).json(responseData);

    } catch (err) {
        console.error("AI Guidance Error:", err.message);
        return res.status(500).json({ error: 'Failed to generate AI guidance.' });
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
