const express = require('express');
const User = require('../models/User');
const TrustScore = require('../models/TrustScore');
const { auth, role } = require('../middleware/auth');

const router = express.Router();

router.get('/suppliers', auth, async (req, res) => {
  try {
    const suppliers = await User.find({ role: 'supplier' }).select('name email businessName phone address location').lean();
    const scores = await TrustScore.find({ supplierId: { $in: suppliers.map(s => s._id) } }).lean();
    const scoreMap = Object.fromEntries(scores.map(s => [s.supplierId.toString(), s]));
    const list = suppliers.map(s => ({
      ...s,
      trustScore: scoreMap[s._id.toString()]?.score ?? 50,
      coordinates: s.location?.coordinates
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/profile', auth, async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'address', 'businessName'];
    const updates = {};
    if (req.body.lat != null && req.body.lng != null) {
      updates.location = { type: 'Point', coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] };
    }
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
