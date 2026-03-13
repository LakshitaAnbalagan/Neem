/**
 * payment.js — UPI Payment Verification Routes
 * Anti-cheating: stores UTR number + screenshot proof.
 * Supplier must verify payment before order proceeds.
 *
 * POST /api/payment/confirm   → Buyer submits UTR + screenshot
 * POST /api/payment/verify    → Supplier approves/rejects payment
 * GET  /api/payment/status/:id → Check payment status
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');

/**
 * POST /api/payment/confirm
 * Buyer submits payment proof (UTR number + screenshot)
 * Body: { orderId, amount, utrNumber, paymentScreenshot }
 */
router.post('/confirm', auth, async (req, res) => {
    try {
        const { orderId, amount, utrNumber, paymentScreenshot } = req.body;

        if (!orderId) return res.status(400).json({ error: 'orderId is required' });
        if (!utrNumber || utrNumber.trim().length < 8) {
            return res.status(400).json({ error: 'Valid UTR/reference number is required (min 8 chars)' });
        }
        if (!paymentScreenshot) {
            return res.status(400).json({ error: 'Payment screenshot is required' });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Verify the buyer owns this order
        if (order.buyerId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Check for duplicate UTR
        const existingUtr = await Order.findOne({
            paymentUtr: utrNumber.trim(),
            _id: { $ne: orderId }
        });
        if (existingUtr) {
            return res.status(400).json({ error: 'This UTR number has already been used for another order. Please provide a unique transaction reference.' });
        }

        // Save payment proof
        order.paymentStatus = 'pending_verification';
        order.paymentUtr = utrNumber.trim();
        order.paymentScreenshot = paymentScreenshot; // base64 image
        order.paymentAmount = amount;
        order.paymentSubmittedAt = new Date();
        order.updatedAt = new Date();
        await order.save();

        res.json({
            success: true,
            message: 'Payment proof submitted. Supplier will verify your UTR number.',
            paymentStatus: 'pending_verification'
        });
    } catch (err) {
        console.error('Payment confirm error:', err);
        res.status(500).json({ error: err.message || 'Payment confirmation failed' });
    }
});

/**
 * POST /api/payment/verify
 * Supplier verifies or rejects a payment
 * Body: { orderId, action: 'approve' | 'reject', reason }
 */
router.post('/verify', auth, async (req, res) => {
    try {
        const { orderId, action, reason } = req.body;

        if (!orderId) return res.status(400).json({ error: 'orderId is required' });
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'action must be "approve" or "reject"' });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Verify the supplier owns this order
        if (order.supplierId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Only the supplier can verify payments' });
        }

        if (action === 'approve') {
            order.paymentStatus = 'verified';
            order.paymentVerifiedAt = new Date();
            order.paymentVerifiedBy = req.user.id;
        } else {
            order.paymentStatus = 'rejected';
            order.paymentRejectionReason = reason || 'Payment could not be verified';
        }

        order.updatedAt = new Date();
        await order.save();

        res.json({
            success: true,
            message: action === 'approve' ? 'Payment verified successfully' : 'Payment rejected',
            paymentStatus: order.paymentStatus
        });
    } catch (err) {
        console.error('Payment verify error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/payment/status/:orderId
 * Check payment status and proof for an order
 */
router.get('/status/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .select('paymentStatus paymentUtr paymentAmount paymentSubmittedAt paymentVerifiedAt paymentRejectionReason');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/payment/screenshot/:orderId
 * Get payment screenshot (supplier only)
 */
router.get('/screenshot/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).select('supplierId paymentScreenshot');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.supplierId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Only the supplier can view payment screenshots' });
        }
        res.json({ screenshot: order.paymentScreenshot || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
