const express = require('express');
const router = express.Router();
const { authenticateAccessToken } = require('../Middlewares/auth');
const { signal } = require('../Controllers/videoController');

router.post('/signal', authenticateAccessToken, signal);

module.exports = router;