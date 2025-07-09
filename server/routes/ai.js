const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/authenticate');

// Generate AI text response
router.post('/generate', authenticate, aiController.generateText);

// Generate image from prompt
router.post('/image', authenticate, aiController.generateImage);

// Generate code
router.post('/code', authenticate, aiController.generateCode);

// Voice processing
router.post('/voice', authenticate, aiController.processVoice);

module.exports = router; 