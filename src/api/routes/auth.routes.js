const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateUpdateProfile } = require('../middlewares/validation.middleware');
const { authLimiter } = require('../middlewares/security.middleware');

router.post('/register', authLimiter, authController.register); // validateRegister needs update if it still expects firebaseUid
router.post('/login', authLimiter, authController.login);
router.get('/profile/:uid', authLimiter, authController.getProfile);
router.put('/profile/:uid', authLimiter, authController.updateProfile);

module.exports = router;
