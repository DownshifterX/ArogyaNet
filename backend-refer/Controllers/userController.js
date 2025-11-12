const User = require('../Models/User');

const getProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'Not found' });

    // role-based access: allow self, doctors to view patients, or admin
    if (req.user && (String(req.user.id) === String(id) || req.user.role === 'admin' || req.user.role === 'doctor')) {
      return res.json(user);
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const listUsers = async (req, res) => {
  // admin only in routes
  const users = await User.find().select('-passwordHash').limit(200);
  res.json(users);
};

module.exports = { getProfile, listUsers };
