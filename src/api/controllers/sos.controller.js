const sosService = require('../../services/sos.service');
const logger = require('../../loaders/logger');

exports.getGuidance = async (req, res) => {
    try {
        const { crisisType, description } = req.body;
        if (!crisisType) {
            return res.status(400).json({ error: 'crisisType is required.' });
        }

        const responseData = await sosService.getAIResponse(crisisType, description);
        return res.status(200).json(responseData);
    } catch (err) {
        logger.error('Controller error in getGuidance:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.notifyEmergencyServices = async (req, res) => {
    try {
        const { crisisType, location, number } = req.body;
        const targetNumber = number || "7478435239";

        return res.status(200).json({ success: true, contacted: targetNumber });
    } catch (err) {
        logger.error('Controller error in notifyEmergencyServices:', err);
        return res.status(500).json({ error: 'Failed to notify emergency services' });
    }
};

exports.getAllSos = async (req, res) => {
    try {
        const alerts = await sosService.getAllRecords();
        res.json(alerts);
    } catch (err) {
        logger.error('Controller error in getAllSos:', err);
        res.status(500).send('Server Error');
    }
};
