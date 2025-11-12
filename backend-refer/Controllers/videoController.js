// Minimal HTTP fallback for signaling if client cannot use sockets directly
const Joi = require('joi');

const signal = async (req, res) => {
  const schema = Joi.object({ toUserId: Joi.string().required(), payload: Joi.object().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  // try to emit over sockets if io available
  const io = req.app.get('io');
  if (io) {
    io.emit('signal', { toUserId: value.toUserId, payload: value.payload });
    return res.json({ ok: true });
  }

  // otherwise return 501 as real-time channel missing
  return res.status(501).json({ message: 'Real-time signaling not available' });
};

module.exports = { signal };
