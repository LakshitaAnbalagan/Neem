const mongoose = require('mongoose');

const seasonMap = {
  jan: 'Winter', feb: 'Winter', mar: 'Spring', apr: 'Spring', may: 'Summer',
  jun: 'Summer', jul: 'Monsoon', aug: 'Monsoon', sep: 'Monsoon', oct: 'Autumn',
  nov: 'Autumn', dec: 'Winter'
};

const availabilitySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantityAvailable: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'kg' },
  availableFrom: { type: Date },
  availableUntil: { type: Date },
  peakSeasonMonths: [{ type: Number, min: 1, max: 12 }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  lastUpdated: { type: Date, default: Date.now }
});

availabilitySchema.index({ productId: 1, supplierId: 1 }, { unique: true });
availabilitySchema.index({ supplierId: 1 });
availabilitySchema.index({ location: '2dsphere' });

availabilitySchema.virtual('currentSeason').get(function () {
  const m = new Date().getMonth() + 1;
  return seasonMap[['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][m - 1]] || 'Unknown';
});

module.exports = mongoose.model('Availability', availabilitySchema);
