const Joi = require('joi');
const bcrypt = require('bcrypt');
const { sha256 } = require('../Utils/hash');
const { generateAccessToken, generateRefreshToken } = require('../Utils/token');
const User = require('../Models/User');
const RefreshToken = require('../Models/RefreshToken');
const { sendVerificationEmail } = require('../Utils/mailer');

const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_EXPIRES_DAYS || '7', 10);

const register = async (req, res) => {
  const schema = Joi.object({ name: Joi.string().required(), email: Joi.string().email().required(), password: Joi.string().min(6).required(), role: Joi.string().valid('patient','doctor','admin') });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const existing = await User.findOne({ email: value.email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(value.password, 12);
    const user = await User.create({ name: value.name, email: value.email, passwordHash, role: value.role || 'patient' });

    // send verification (stub)
    const verificationToken = generateRefreshToken(); // one-time token for verification link
    await sendVerificationEmail(user.email, verificationToken);

    // create refresh token for the session
    const rawRefresh = generateRefreshToken();
    const refreshHash = sha256(rawRefresh);
    const refreshDoc = await RefreshToken.create({ userId: user._id, tokenHash: refreshHash, expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 3600 * 1000) });

    res.cookie('refreshToken', rawRefresh, { httpOnly: true, sameSite: 'lax' });
    const accessToken = generateAccessToken(user);
    return res.status(201).json({ accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    const user = await User.findOne({ email: value.email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(value.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const rawRefresh = generateRefreshToken();
    const refreshHash = sha256(rawRefresh);
    await RefreshToken.create({ userId: user._id, tokenHash: refreshHash, expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 3600 * 1000) });

    res.cookie('refreshToken', rawRefresh, { httpOnly: true, sameSite: 'lax' });
    const accessToken = generateAccessToken(user);
    return res.json({ accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const refresh = async (req, res) => {
  // refresh token rotation: token stored in httpOnly cookie or body
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) return res.status(401).json({ message: 'Missing refresh token' });

  try {
    const tokenHash = sha256(token);
    const doc = await RefreshToken.findOne({ tokenHash, revoked: false });
    if (!doc || doc.expiresAt < new Date()) return res.status(401).json({ message: 'Invalid or expired refresh token' });

    // rotate: remove old token and issue new one
    await RefreshToken.findByIdAndUpdate(doc._id, { revoked: true });

    const user = await require('../Models/User').findById(doc.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token user' });

    const rawRefresh = generateRefreshToken();
    const refreshHash = sha256(rawRefresh);
    await RefreshToken.create({ userId: user._id, tokenHash: refreshHash, expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 3600 * 1000) });

    res.cookie('refreshToken', rawRefresh, { httpOnly: true, sameSite: 'lax' });
    const accessToken = generateAccessToken(user);
    return res.json({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const logout = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (token) {
    const tokenHash = sha256(token);
    await RefreshToken.findOneAndUpdate({ tokenHash }, { revoked: true });
  }
  res.clearCookie('refreshToken');
  return res.json({ ok: true });
};

module.exports = { register, login, refresh, logout };
