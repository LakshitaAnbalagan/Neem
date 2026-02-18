const express = require('express');
const Product = require('../models/Product');
const Availability = require('../models/Availability');
const User = require('../models/User');
const TrustScore = require('../models/TrustScore');
const { auth, role } = require('../middleware/auth');
const { interpretSearchQuery, suggestProductFields } = require('../services/aiFeatures');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let { q, category, supplierId, maxMoisture, minPpm, smart } = req.query;
    if (smart === '1' && q && typeof q === 'string' && q.trim()) {
      const interpreted = await interpretSearchQuery(q.trim());
      if (interpreted.q) q = interpreted.q;
      if (interpreted.category) category = interpreted.category;
    }
    const filter = { isActive: true };
    if (supplierId) filter.supplierId = supplierId;
    if (category) filter.category = new RegExp(category, 'i');
    if (q) {
      const term = q.trim().replace(/\s+/g, ' ').split(' ').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      filter.$or = [
        { name: new RegExp(term, 'i') },
        { description: new RegExp(term, 'i') },
        { category: new RegExp(term, 'i') }
      ];
    }
    const andParts = [];
    if (maxMoisture != null && maxMoisture !== '') {
      const val = parseFloat(maxMoisture);
      if (!isNaN(val)) andParts.push({
        $or: [
          { moistureContentPercent: { $lte: val } },
          { moistureContentPercent: null },
          { moistureContentPercent: { $exists: false } }
        ]
      });
    }
    if (minPpm != null && minPpm !== '') {
      const val = parseFloat(minPpm);
      if (!isNaN(val)) andParts.push({
        $or: [
          { ppmValue: { $gte: val } },
          { ppmValue: null },
          { ppmValue: { $exists: false } }
        ]
      });
    }
    if (andParts.length) filter.$and = [...(filter.$and || []), ...andParts];
    const products = await Product.find(filter).populate('supplierId', 'name email businessName').lean();
    const supplierIds = [...new Set(products.map(p => p.supplierId?._id).filter(Boolean))];
    const scores = await TrustScore.find({ supplierId: { $in: supplierIds } }).lean();
    const scoreMap = Object.fromEntries(scores.map(s => [s.supplierId.toString(), s]));
    for (const p of products) {
      if (p.supplierId) p.supplierTrustScore = scoreMap[p.supplierId._id.toString()]?.score ?? 50;
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suggest', auth, role('supplier'), async (req, res) => {
  try {
    const { name, description } = req.body || {};
    const result = await suggestProductFields(name, description);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Suggestion unavailable.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplierId', 'name email businessName phone address').lean();
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const avail = await Availability.findOne({ productId: product._id, supplierId: product.supplierId._id }).lean();
    const trust = await TrustScore.findOne({ supplierId: product.supplierId._id }).lean();
    product.availability = avail;
    product.supplierTrustScore = trust?.score ?? 50;
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, role('supplier'), async (req, res) => {
  try {
    const product = new Product({ ...req.body, supplierId: req.user._id });
    await product.save();
    await product.populate('supplierId', 'name businessName');
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', auth, role('supplier'), async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('supplierId', 'name businessName');
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, role('supplier'), async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: req.user._id },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deactivated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/availability', async (req, res) => {
  try {
    const avail = await Availability.findOne({ productId: req.params.id }).populate('supplierId', 'name businessName').lean();
    if (!avail) return res.status(404).json({ error: 'Availability not found.' });
    const trust = await TrustScore.findOne({ supplierId: avail.supplierId._id }).lean();
    avail.supplierTrustScore = trust?.score ?? 50;
    res.json(avail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/availability', auth, role('supplier'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, supplierId: req.user._id });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const loc = req.user.location || { type: 'Point', coordinates: [0, 0] };
    const avail = await Availability.findOneAndUpdate(
      { productId: req.params.id, supplierId: req.user._id },
      {
        ...req.body,
        productId: req.params.id,
        supplierId: req.user._id,
        location: loc,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
    res.json(avail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
