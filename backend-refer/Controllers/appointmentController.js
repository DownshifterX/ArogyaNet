const Joi = require('joi');
const Appointment = require('../Models/Appointment');

const createAppointment = async (req, res) => {
  const schema = Joi.object({ doctorId: Joi.string().required(), startAt: Joi.date().required(), endAt: Joi.date().optional(), notes: Joi.string().optional() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const appointment = await Appointment.create({ patientId: req.user.id, doctorId: value.doctorId, startAt: value.startAt, endAt: value.endAt, notes: value.notes });
    // emit socket notification if doctor online
    const io = req.app.get('io');
    io && io.emit('notification', { to: value.doctorId, message: 'New appointment requested' });
    return res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const listAppointments = async (req, res) => {
  try {
    const q = {};
    if (req.user.role === 'patient') q.patientId = req.user.id;
    else if (req.user.role === 'doctor') q.doctorId = req.user.id;
    // admin sees all
    const appointments = await Appointment.find(q).sort({ startAt: 1 }).limit(500);
    res.json(appointments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateAppointment = async (req, res) => {
  const { id } = req.params;
  const schema = Joi.object({ startAt: Joi.date().optional(), endAt: Joi.date().optional(), status: Joi.string().valid('requested','confirmed','cancelled','completed').optional(), notes: Joi.string().optional() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Not found' });

    // Only doctor for that appointment or admin can update status/times
    if (req.user.role !== 'admin' && String(req.user.id) !== String(appt.doctorId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    Object.assign(appt, value);
    await appt.save();

    const io = req.app.get('io');
    io && io.emit('notification', { to: appt.patientId, message: 'Appointment updated' });

    res.json(appt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createAppointment, listAppointments, updateAppointment };
