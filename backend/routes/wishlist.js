const express = require('express');
const Wishlist = require('../models/Wishlist');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/wishlist — list saved products
router.get('/', auth, async (req, res) => {
    try {
        const items = await Wishlist.find({ userId: req.user._id })
            .populate({
                path: 'productId',
                populate: { path: 'supplierId', select: 'name businessName' }
            })
            .sort({ createdAt: -1 })
            .lean();
        res.json(items.map(i => i.productId).filter(Boolean));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/wishlist/ids — just the product IDs (lightweight)
router.get('/ids', auth, async (req, res) => {
    try {
        const items = await Wishlist.find({ userId: req.user._id }).select('productId').lean();
        res.json(items.map(i => i.productId.toString()));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/wishlist/:productId — save product
router.post('/:productId', auth, async (req, res) => {
    try {
        await Wishlist.findOneAndUpdate(
            { userId: req.user._id, productId: req.params.productId },
            { userId: req.user._id, productId: req.params.productId },
            { upsert: true, new: true }
        );
        res.json({ saved: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/wishlist/:productId — unsave product
router.delete('/:productId', auth, async (req, res) => {
    try {
        await Wishlist.findOneAndDelete({ userId: req.user._id, productId: req.params.productId });
        res.json({ saved: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
