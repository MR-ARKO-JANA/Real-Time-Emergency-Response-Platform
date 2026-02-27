const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sos.controller');

// @route   POST api/sos/ai-guidance
// @desc    Get AI generated crisis guidance
router.post('/ai-guidance', sosController.getGuidance);

// @route   GET api/sos/alerts
// @desc    Get all active/resolved SOS alerts (Admin View)
router.get('/alerts', sosController.getAllSos);

module.exports = router;
