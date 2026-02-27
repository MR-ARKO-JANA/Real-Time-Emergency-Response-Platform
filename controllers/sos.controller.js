const SOS = require('../models/sos.model');

// Mock AI Logic Endpoint
exports.getGuidance = async (req, res) => {
    try {
        const { crisisType } = req.body;

        // Simulating external LLM API
        const mockData = {
            medical: {
                steps: [
                    "Check for responsiveness. Tap the shoulder and shout 'Are you OK?'",
                    "If unresponsive and not breathing normally, call 911.",
                    "Begin chest compressions (100-120 per minute)."
                ],
                summary: "Medical emergency reported. Victim is unresponsive. CPR initiated by bystander. Location: 100m from Central Park entrance."
            },
            fire: {
                steps: ["Evacuate the area immediately.", "Do not use elevators.", "Stay low under smoke."],
                summary: "Fire reported in building. Evacuation in progress. Need fire suppression unit."
            },
            security: {
                steps: ["Find a safe, lockable room.", "Stay quiet and mute your phone.", "Do not confront the threat."],
                summary: "Security threat reported. Caller is hiding. Requesting immediate police dispatch."
            },
            other: {
                steps: ["Assess the situation from a safe distance.", "Do not intervene directly.", "Wait for authorized personnel."],
                summary: "General emergency reported. Caller is observing safely."
            }
        };

        setTimeout(() => {
            res.json(mockData[crisisType] || mockData.other);
        }, 1000); // simulate API latency
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
