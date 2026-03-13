const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Please log in.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'neem-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found.' });
    req.user = user;
    req.token = token;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const role = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  if (allowed.includes(req.user.role)) return next();
  res.status(403).json({ error: 'Not allowed for your role.' });
};

module.exports = { auth, role };
