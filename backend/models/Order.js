const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'kg' },
    unitPrice: { type: Number, required: true },   // agreed/listed price per unit
    totalPrice: { type: Number, required: true },   // quantity * unitPrice (or negotiated)

    // Negotiation
    counterOfferPrice: { type: Number, default: null },   // buyer's counter-offer per unit
    negotiationStatus: {
        type: String,
        enum: ['none', 'pending', 'accepted', 'rejected'],
        default: 'none'
    },
    negotiationNote: { type: String, trim: true, default: '' },

    // Order lifecycle
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'fulfilled', 'cancelled'],
        default: 'pending'
    },

    buyerNote: { type: String, trim: true, default: '' },
    supplierNote: { type: String, trim: true, default: '' },

    invoiceGenerated: { type: Boolean, default: false },

    // Payment (UPI — with anti-cheat verification)
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'pending_verification', 'verified', 'rejected'],
        default: 'unpaid'
    },
    paymentUtr: { type: String, default: null, trim: true },         // UTR / UPI ref number
    paymentScreenshot: { type: String, default: null },              // base64 payment proof image
    paymentAmount: { type: Number, default: null },                  // amount paid (₹)
    paymentSubmittedAt: { type: Date, default: null },               // when buyer submitted proof
    paymentVerifiedAt: { type: Date, default: null },                // when supplier verified
    paymentVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paymentRejectionReason: { type: String, default: null, trim: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ supplierId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentUtr: 1 }, { sparse: true });  // prevent duplicate UTR

module.exports = mongoose.model('Order', orderSchema);
