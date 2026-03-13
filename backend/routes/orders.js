const express = require('express');
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { auth, role } = require('../middleware/auth');

const router = express.Router();

// ── Helper: resolve tiered price ────────────────────────────────────────────
function resolvePrice(product, quantity) {
    const tiers = (product.priceTiers || []).slice().sort((a, b) => b.minQty - a.minQty);
    for (const tier of tiers) {
        if (quantity >= tier.minQty) return tier.pricePerUnit;
    }
    return product.pricePerUnit;
}

function fmtINR(n) {
    return Number(n).toLocaleString('en-IN');
}

// ══════════════════════════════════════════════════════════════════════════════
//  IMPORTANT:  Static routes MUST come before parameterised `:id` routes
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/orders/reviews/supplier/:sid — public reviews for a supplier ───
router.get('/reviews/supplier/:sid', async (req, res) => {
    try {
        const reviews = await Review.find({ supplierId: req.params.sid })
            .sort({ createdAt: -1 })
            .populate('buyerId', 'name businessName')
            .lean();
        const avg = reviews.length
            ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
            : null;
        res.json({ reviews, avg, count: reviews.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/orders — buyer creates an order ───────────────────────────────
router.post('/', auth, role('shop'), async (req, res) => {
    try {
        const { productId, quantity, buyerNote, counterOfferPrice } = req.body;
        if (!productId || !quantity || quantity < 1)
            return res.status(400).json({ error: 'productId and quantity are required.' });

        const product = await Product.findById(productId);
        if (!product || !product.isActive)
            return res.status(404).json({ error: 'Product not found.' });

        const unitPrice = resolvePrice(product, quantity);
        const totalPrice = +(unitPrice * quantity).toFixed(2);

        const orderData = {
            buyerId: req.user._id,
            supplierId: product.supplierId,
            productId: product._id,
            quantity,
            unit: product.unit || 'kg',
            unitPrice,
            totalPrice,
            buyerNote: buyerNote || ''
        };

        if (counterOfferPrice && +counterOfferPrice > 0) {
            orderData.counterOfferPrice = +counterOfferPrice;
            orderData.negotiationStatus = 'pending';
        }

        const order = await Order.create(orderData);
        await order.populate(['buyerId', 'supplierId', 'productId']);
        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/orders — list orders for current user ──────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const user = req.user;
        const filter = user.role === 'supplier' ? { supplierId: user._id } : { buyerId: user._id };
        if (req.query.status) filter.status = req.query.status;
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .populate('buyerId', 'name businessName email phone')
            .populate('supplierId', 'name businessName email phone')
            .populate('productId', 'name category unit images')
            .lean();

        if (orders.length) {
            const ids = orders.map(o => o._id);
            const reviews = await Review.find({ orderId: { $in: ids } }).lean();
            const reviewMap = Object.fromEntries(reviews.map(r => [r.orderId.toString(), r]));
            orders.forEach(o => { o.review = reviewMap[o._id.toString()] || null; });
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/orders/:id/invoice — generate PDF invoice ──────────────────────
router.get('/:id/invoice', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('buyerId', 'name businessName email phone address')
            .populate('supplierId', 'name businessName email phone address')
            .populate('productId', 'name category unit')
            .lean();
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        const uid = req.user._id.toString();
        if (order.buyerId._id.toString() !== uid && order.supplierId._id.toString() !== uid)
            return res.status(403).json({ error: 'Access denied.' });

        if (!['accepted', 'fulfilled'].includes(order.status))
            return res.status(400).json({ error: 'Invoice only available for accepted/fulfilled orders.' });

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order._id}.pdf"`);
        doc.pipe(res);

        // ── Header ──
        doc.fontSize(22).fillColor('#2d5a27').font('Helvetica-Bold')
            .text('NEEM SOURCING', 50, 50, { align: 'center' });
        doc.fontSize(10).fillColor('#666').font('Helvetica')
            .text("India's B2B Neem Raw Materials Platform", { align: 'center' });
        doc.moveDown(0.3);
        const lineY1 = doc.y;
        doc.moveTo(50, lineY1).lineTo(545, lineY1).strokeColor('#2d5a27').lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        // ── Invoice meta ──
        doc.fontSize(16).fillColor('#111').font('Helvetica-Bold')
            .text('TAX INVOICE', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#555').font('Helvetica');
        doc.text('Invoice No: INV-' + String(order._id).slice(-8).toUpperCase(), { align: 'right' });
        doc.text('Date: ' + new Date(order.createdAt).toLocaleDateString('en-IN'), { align: 'right' });
        doc.text('Status: ' + order.status.toUpperCase(), { align: 'right' });
        doc.moveDown(1);

        // ── From / To (side by side) ──
        const fromToY = doc.y;

        doc.fontSize(10).fillColor('#2d5a27').font('Helvetica-Bold')
            .text('FROM (Supplier)', 50, fromToY);
        doc.fontSize(9).fillColor('#333').font('Helvetica');
        doc.text(order.supplierId.businessName || order.supplierId.name || '-', 50);
        if (order.supplierId.email) doc.text(order.supplierId.email, 50);
        if (order.supplierId.phone) doc.text(order.supplierId.phone, 50);
        if (order.supplierId.address) doc.text(order.supplierId.address, 50, doc.y, { width: 220 });
        const afterFromY = doc.y;

        doc.fontSize(10).fillColor('#2d5a27').font('Helvetica-Bold')
            .text('TO (Buyer)', 310, fromToY);
        doc.fontSize(9).fillColor('#333').font('Helvetica');
        doc.text(order.buyerId.businessName || order.buyerId.name || '-', 310);
        if (order.buyerId.email) doc.text(order.buyerId.email, 310);
        if (order.buyerId.phone) doc.text(order.buyerId.phone, 310);
        if (order.buyerId.address) doc.text(order.buyerId.address, 310, doc.y, { width: 220 });

        doc.y = Math.max(afterFromY, doc.y) + 20;

        const sep1 = doc.y;
        doc.moveTo(50, sep1).lineTo(545, sep1).strokeColor('#ccc').lineWidth(0.5).stroke();
        doc.y = sep1 + 10;

        // ── Table header ──
        const tTop = doc.y;
        doc.rect(50, tTop, 495, 20).fill('#2d5a27');
        doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold');
        doc.text('Product', 58, tTop + 5, { width: 180 });
        doc.text('Qty', 248, tTop + 5, { width: 60, align: 'center' });
        doc.text('Unit Price (Rs)', 318, tTop + 5, { width: 100, align: 'right' });
        doc.text('Total (Rs)', 428, tTop + 5, { width: 110, align: 'right' });

        // ── Table row ──
        const rY = tTop + 24;
        doc.fillColor('#111').font('Helvetica').fontSize(9);
        const pName = (order.productId.name || 'Product') + (order.productId.category ? ' (' + order.productId.category + ')' : '');
        doc.text(pName, 58, rY, { width: 180 });
        doc.text(order.quantity + ' ' + order.unit, 248, rY, { width: 60, align: 'center' });
        doc.text('Rs ' + fmtINR(order.unitPrice), 318, rY, { width: 100, align: 'right' });
        doc.text('Rs ' + fmtINR(order.totalPrice), 428, rY, { width: 110, align: 'right' });

        doc.y = rY + 30;
        const sep2 = doc.y;
        doc.moveTo(50, sep2).lineTo(545, sep2).strokeColor('#ccc').lineWidth(0.5).stroke();
        doc.y = sep2 + 10;

        // ── Totals ──
        const gstPct = (order.productId.category || '').toLowerCase().includes('cake') ? 0 : 5;
        const gstAmt = +(order.totalPrice * gstPct / 100).toFixed(2);
        const grand = +(order.totalPrice + gstAmt).toFixed(2);

        doc.fontSize(9).fillColor('#333').font('Helvetica');
        const totX = 370, valX = 470, totW = 90, valW = 70;
        doc.text('Subtotal:', totX, doc.y, { width: totW, align: 'right' });
        doc.text('Rs ' + fmtINR(order.totalPrice), valX, doc.y - doc.currentLineHeight(), { width: valW, align: 'right' });
        doc.moveDown(0.3);
        doc.text('GST (' + gstPct + '%):', totX, doc.y, { width: totW, align: 'right' });
        doc.text('Rs ' + fmtINR(gstAmt), valX, doc.y - doc.currentLineHeight(), { width: valW, align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#2d5a27').font('Helvetica-Bold');
        doc.text('Grand Total:', totX, doc.y, { width: totW, align: 'right' });
        doc.text('Rs ' + fmtINR(grand), valX, doc.y - doc.currentLineHeight(), { width: valW, align: 'right' });

        // ── Footer ──
        doc.moveDown(3);
        doc.fontSize(8).fillColor('#888').font('Helvetica')
            .text('This is a computer-generated invoice. Neem Sourcing is a B2B procurement platform.', 50, doc.y, { align: 'center', width: 495 });

        doc.end();

        await Order.findByIdAndUpdate(order._id, { invoiceGenerated: true });
    } catch (err) {
        console.error('Invoice error:', err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// ── POST /api/orders/:id/review — buyer submits a review ────────────────────
router.post('/:id/review', auth, role('shop'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        if (order.buyerId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Only the buyer can review this order.' });
        if (order.status !== 'fulfilled')
            return res.status(400).json({ error: 'You can only review fulfilled orders.' });

        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5)
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });

        const review = await Review.findOneAndUpdate(
            { orderId: order._id },
            { orderId: order._id, buyerId: req.user._id, supplierId: order.supplierId, rating: +rating, comment: comment || '' },
            { upsert: true, new: true }
        );

        const agg = await Review.aggregate([
            { $match: { supplierId: order.supplierId } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        if (agg.length) {
            const TrustScore = require('../models/TrustScore');
            const newScore = Math.round((agg[0].avg / 5) * 100);
            await TrustScore.findOneAndUpdate(
                { supplierId: order.supplierId },
                { score: newScore, updatedAt: new Date() },
                { upsert: true }
            );
        }
        res.json(review);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/orders/:id — single order ──────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('buyerId', 'name businessName email phone')
            .populate('supplierId', 'name businessName email phone')
            .populate('productId', 'name category unit images priceTiers pricePerUnit')
            .lean();
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        const uid = req.user._id.toString();
        if (order.buyerId._id.toString() !== uid && order.supplierId._id.toString() !== uid)
            return res.status(403).json({ error: 'Access denied.' });
        const review = await Review.findOne({ orderId: order._id }).lean();
        order.review = review || null;
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/orders/:id — update status / negotiation ─────────────────────
router.patch('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        const uid = req.user._id.toString();
        const isSupplier = order.supplierId.toString() === uid;
        const isBuyer = order.buyerId.toString() === uid;
        if (!isSupplier && !isBuyer) return res.status(403).json({ error: 'Access denied.' });

        const { status, supplierNote, buyerNote, action, counterOfferPrice, negotiationNote } = req.body;

        if (isSupplier) {
            if (status && ['accepted', 'rejected', 'fulfilled'].includes(status)) order.status = status;
            if (supplierNote !== undefined) order.supplierNote = supplierNote;
            if (action === 'accept_offer') {
                order.unitPrice = order.counterOfferPrice;
                order.totalPrice = +(order.counterOfferPrice * order.quantity).toFixed(2);
                order.negotiationStatus = 'accepted';
                order.status = 'accepted';
            }
            if (action === 'reject_offer') order.negotiationStatus = 'rejected';
        }

        if (isBuyer) {
            if (status === 'cancelled') order.status = 'cancelled';
            if (buyerNote !== undefined) order.buyerNote = buyerNote;
            if (counterOfferPrice && +counterOfferPrice > 0) {
                order.counterOfferPrice = +counterOfferPrice;
                order.negotiationStatus = 'pending';
                if (negotiationNote) order.negotiationNote = negotiationNote;
            }
        }

        order.updatedAt = new Date();
        await order.save();
        await order.populate(['buyerId', 'supplierId', 'productId']);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
