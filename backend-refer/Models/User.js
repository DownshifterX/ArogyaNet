const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  bio: { type: String },
  specialties: { type: [String], default: [] }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  phone: { type: String },
  profile: { type: ProfileSchema, default: {} },
  verified: { type: Boolean, default: false },
  avatarUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
