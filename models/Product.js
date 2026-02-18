const mongoose = require('mongoose');

const specSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  unit: { type: String, trim: true, default: '' }
}, { _id: false });

const productSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Neem-only domain: this should always represent a neem or neem-derived product.
  name: { type: String, required: true, trim: true },
  // e.g. Neem oil, Neem kernels, Neem cake, Neem powder, Neem leaves
  category: { type: String, trim: true },
  description: { type: String, trim: true },
  unit: { type: String, default: 'kg', trim: true },
  pricePerUnit: { type: Number, default: 0 },
  minOrderQuantity: { type: Number, default: 1 },
  // Quality specs for buyer consideration
  moistureContentPercent: { type: Number, default: null },
  ppmValue: { type: Number, default: null },
  ppmLabel: { type: String, trim: true, default: '' },
  specifications: [specSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.index({ supplierId: 1 });
productSchema.index({ name: 'text', description: 'text', category: 'text' });

// Guardrail: ensure only neem / neem-based products are stored.
// A product is considered valid if its name or category mentions "neem".
productSchema.pre('save', function (next) {
  const name = this.name || '';
  const category = this.category || '';
  const combined = `${name} ${category}`.toLowerCase();

  if (!combined.includes('neem')) {
    return next(
      new Error('Only neem and neem-based products are allowed. Please include \"Neem\" in the product name or category.')
    );
  }

  return next();
});

module.exports = mongoose.model('Product', productSchema);
