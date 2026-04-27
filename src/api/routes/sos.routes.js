const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sos.controller');
const { validateSOSGuidance } = require('../middlewares/validation.middleware');

/**
 * @openapi
 * /api/sos/ai-guidance:
 *   post:
 *     summary: Get AI generated crisis guidance
 *     tags: [SOS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - crisisType
 *             properties:
 *               crisisType:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Guidance returned
 *       400:
 *         description: Invalid input
 */
router.post('/ai-guidance', validateSOSGuidance, sosController.getGuidance);

/**
 * @openapi
 * /api/sos/alerts:
 *   get:
 *     summary: Get all active/resolved SOS alerts (Admin View)
 *     tags: [SOS]
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/alerts', sosController.getAllSos);

module.exports = router;
