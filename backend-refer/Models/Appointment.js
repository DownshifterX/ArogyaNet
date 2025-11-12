const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date },
  status: {
    type: String,
    enum: ['requested', 'confirmed', 'cancelled', 'completed'],
    default: 'requested'
  },
  notes: { type: String },
  meetingRoomId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
