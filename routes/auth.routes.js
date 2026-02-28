const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

// @route   POST api/auth/sync
// @desc    Sync Firebase user to MongoDB
router.post('/sync', authController.syncUser);

module.exports = router;
