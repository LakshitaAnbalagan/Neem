const mongoose = require('mongoose');

const trustScoreSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  score: { type: Number, default: 50, min: 0, max: 100 },
  responseCount: { type: Number, default: 0 },
  avgResponseTimeMinutes: { type: Number, default: null },
  completedTransactions: { type: Number, default: 0 },
  ratingsSum: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

trustScoreSchema.index({ supplierId: 1 });
trustScoreSchema.index({ score: -1 });

module.exports = mongoose.model('TrustScore', trustScoreSchema);
