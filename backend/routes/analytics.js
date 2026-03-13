const express = require('express');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { auth, role } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/analytics/supplier — supplier dashboard stats ────────────────────
router.get('/supplier', auth, role('supplier'), async (req, res) => {
    try {
        const sid = req.user._id;

        // Total orders by status
        const statusAgg = await Order.aggregate([
            { $match: { supplierId: sid } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const byStatus = Object.fromEntries(statusAgg.map(s => [s._id, s.count]));

        // Total revenue (from fulfilled orders)
        const revenueAgg = await Order.aggregate([
            { $match: { supplierId: sid, status: 'fulfilled' } },
            { $group: { _id: null, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } }
        ]);
        const revenue = revenueAgg[0]?.revenue || 0;
        const fulfilled = revenueAgg[0]?.orders || 0;

        // Top buyers (by order count)
        const topBuyersAgg = await Order.aggregate([
            { $match: { supplierId: sid } },
            { $group: { _id: '$buyerId', count: { $sum: 1 }, total: { $sum: '$totalPrice' } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'buyer' } },
            { $unwind: '$buyer' },
            { $project: { _id: 1, count: 1, total: 1, 'buyer.name': 1, 'buyer.businessName': 1, 'buyer.email': 1 } }
        ]);

        // Top products by order count
        const topProductsAgg = await Order.aggregate([
            { $match: { supplierId: sid } },
            { $group: { _id: '$productId', count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' },
            { $project: { _id: 1, count: 1, revenue: 1, 'product.name': 1, 'product.category': 1 } }
        ]);

        // Monthly revenue trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        const monthlyAgg = await Order.aggregate([
            { $match: { supplierId: sid, status: 'fulfilled', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$totalPrice' }, count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Average rating
        const ratingAgg = await Review.aggregate([
            { $match: { supplierId: sid } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        res.json({
            byStatus,
            revenue,
            fulfilled,
            totalOrders: Object.values(byStatus).reduce((a, b) => a + b, 0),
            topBuyers: topBuyersAgg,
            topProducts: topProductsAgg,
            monthlyTrend: monthlyAgg,
            avgRating: +(ratingAgg[0]?.avg || 0).toFixed(1),
            reviewCount: ratingAgg[0]?.count || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/analytics/buyer — buyer purchase history stats ───────────────────
router.get('/buyer', auth, role('shop'), async (req, res) => {
    try {
        const bid = req.user._id;

        const totalSpendAgg = await Order.aggregate([
            { $match: { buyerId: bid, status: { $in: ['accepted', 'fulfilled'] } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } }
        ]);

        const statusAgg = await Order.aggregate([
            { $match: { buyerId: bid } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const byStatus = Object.fromEntries(statusAgg.map(s => [s._id, s.count]));

        // Most ordered products
        const topProductsAgg = await Order.aggregate([
            { $match: { buyerId: bid } },
            { $group: { _id: '$productId', count: { $sum: 1 }, spent: { $sum: '$totalPrice' } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, count: 1, spent: 1, 'product.name': 1, 'product.category': 1 } }
        ]);

        // Monthly spend
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        const monthlyAgg = await Order.aggregate([
            { $match: { buyerId: bid, status: { $in: ['accepted', 'fulfilled'] }, createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    spent: { $sum: '$totalPrice' }, count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            totalSpend: totalSpendAgg[0]?.total || 0,
            totalOrders: totalSpendAgg[0]?.count || 0,
            byStatus,
            topProducts: topProductsAgg,
            monthlyTrend: monthlyAgg,
            allOrders: Object.values(byStatus).reduce((a, b) => a + b, 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
