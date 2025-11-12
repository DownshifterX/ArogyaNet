const express = require('express');
const router = express.Router();
const { authenticateAccessToken } = require('../Middlewares/auth');
const { createAppointment, listAppointments, updateAppointment } = require('../Controllers/appointmentController');

router.get('/', authenticateAccessToken, listAppointments);
router.post('/', authenticateAccessToken, createAppointment);
router.put('/:id', authenticateAccessToken, updateAppointment);

module.exports = router;