const express = require('express');
const router = express.Router();
const { authenticateAccessToken } = require('../Middlewares/auth');
const { requireRole } = require('../Middlewares/role');
const { getProfile, listUsers } = require('../Controllers/userController');

router.get('/', authenticateAccessToken, requireRole(['admin']), listUsers);
router.get('/:id', authenticateAccessToken, getProfile);

module.exports = router;