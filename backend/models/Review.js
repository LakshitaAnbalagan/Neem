const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now }
});

reviewSchema.index({ supplierId: 1 });
reviewSchema.index({ buyerId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
