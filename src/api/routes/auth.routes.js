const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateUpdateProfile } = require('../middlewares/validation.middleware');

/**
 * @openapi
 * /api/auth/sync:
 *   post:
 *     summary: Sync Firebase user to MongoDB
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firebaseUid
 *               - name
 *               - email
 *             properties:
 *               firebaseUid:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [citizen, responder, admin]
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: User synced correctly
 *       400:
 *         description: Validation error
 */
router.post('/sync', validateRegister, authController.syncUser);
router.get('/profile/:uid', authController.getProfile);
router.put('/profile/:uid', validateUpdateProfile, authController.updateProfile);

module.exports = router;
