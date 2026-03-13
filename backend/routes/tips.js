const express = require('express');
const { auth } = require('../middleware/auth');
const { getSeasonalTipAI } = require('../services/aiFeatures');

const router = express.Router();

router.get('/seasonal', auth, async (req, res) => {
  try {
    const role = (req.query.role || (req.user && req.user.role) || 'shop') === 'supplier' ? 'supplier' : 'shop';
    const month = Math.min(12, Math.max(1, parseInt(req.query.month, 10) || new Date().getMonth() + 1));
    const tip = await getSeasonalTipAI(month, role);
    res.json({ tip });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Tip unavailable.' });
  }
});

module.exports = router;
