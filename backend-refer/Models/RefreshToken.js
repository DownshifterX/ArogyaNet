const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
