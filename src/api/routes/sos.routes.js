const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sos.controller');
const { validateSOSGuidance } = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const { aiLimiter, sosLimiter } = require('../middlewares/security.middleware');

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
router.post('/ai-guidance', authMiddleware, aiLimiter, validateSOSGuidance, sosController.getGuidance);

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
router.get('/alerts', sosLimiter, authMiddleware, sosController.getAllSos);

/**
 * @openapi
 * /api/sos/health:
 *   get:
 *     summary: SOS service health check
 *     tags: [SOS]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sos' }));

module.exports = router;
