const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

function generateAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken() {
  // return a random token string (not JWT) that will be stored hashed server-side
  return crypto.randomBytes(40).toString('hex');
}

module.exports = { generateAccessToken, generateRefreshToken };
