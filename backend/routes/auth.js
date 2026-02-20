const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TrustScore = require('../models/TrustScore');
const { auth } = require('../middleware/auth');

const router = express.Router();

const createToken = (userId) =>
  jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'neem-secret-key',
    { expiresIn: '7d' }
  );

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address, businessName, lat, lng } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required.' });
    }
    if (!['shop', 'supplier'].includes(role)) {
      return res.status(400).json({ error: 'Role must be shop or supplier.' });
    }
    const existing = await User.findOne({ email, role });
    if (existing) return res.status(400).json({ error: 'Email already registered for this role.' });

    const user = new User({
      name,
      email,
      password,
      role,
      phone: phone || '',
      address: address || '',
      businessName: role === 'supplier' ? (businessName || name) : undefined,
      location: lat != null && lng != null ? { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } : undefined
    });
    await user.save();

    if (role === 'supplier') {
      await TrustScore.create({ supplierId: user._id });
    }

    const token = createToken(user._id);
    const u = await User.findById(user._id).select('-password');
    res.status(201).json({ user: u, token });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await User.findOne({ email, role: role || { $in: ['shop', 'supplier'] } }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = createToken(user._id);
    const u = await User.findById(user._id).select('-password');
    res.json({ user: u, token });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
