const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateAccessToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = { id: payload.sub, role: payload.role };
    next();
  });
};

module.exports = { authenticateAccessToken };
