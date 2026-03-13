/**
 * RAG Retrieval: Fetch relevant products, suppliers, availability from MongoDB
 * based on user query keywords and context.
 */

const Product = require('../models/Product');
const Availability = require('../models/Availability');
const TrustScore = require('../models/TrustScore');
const User = require('../models/User');

/**
 * Extract search keywords from user message for product search.
 * @param {string} message
 * @returns {string[]} Keywords
 */
function extractKeywords(message) {
  if (!message || typeof message !== 'string') return [];
  const text = message.toLowerCase().trim();
  const neemTerms = ['neem', 'oil', 'kernels', 'seeds', 'cake', 'powder', 'leaves', 'extract'];
  const found = neemTerms.filter(term => text.includes(term));
  if (found.length) return found;
  // If no neem terms, try to extract any product-like words
  const words = text.split(/\s+/).filter(w => w.length > 3);
  return words.slice(0, 3);
}

/**
 * Retrieve relevant products, suppliers, and context for RAG.
 * @param {string} userMessage
 * @param {Object} userInfo - { role: 'shop'|'supplier', userId?: string }
 * @returns {Promise<string>} Context string to inject into prompt
 */
async function retrieveContext(userMessage, userInfo = {}) {
  const keywords = extractKeywords(userMessage);
  const contextParts = [];
  const currentMonth = new Date().getMonth() + 1;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[currentMonth - 1] || 'current month';

  try {
    // 1. Search for relevant products
    let productFilter = { isActive: true };
    if (keywords.length > 0) {
      const searchTerms = keywords.join('|');
      productFilter.$or = [
        { name: new RegExp(searchTerms, 'i') },
        { description: new RegExp(searchTerms, 'i') },
        { category: new RegExp(searchTerms, 'i') }
      ];
    }

    const products = await Product.find(productFilter)
      .populate('supplierId', 'name businessName')
      .limit(5)
      .sort({ createdAt: -1 })
      .lean();

    if (products.length > 0) {
      // Get trust scores for suppliers
      const supplierIds = [...new Set(products.map(p => p.supplierId?._id).filter(Boolean))];
      const trustScores = await TrustScore.find({ supplierId: { $in: supplierIds } }).lean();
      const trustMap = Object.fromEntries(trustScores.map(t => [t.supplierId.toString(), t.score]));

      // Get availability for products
      const productIds = products.map(p => p._id);
      const availabilities = await Availability.find({ productId: { $in: productIds } }).lean();
      const availMap = Object.fromEntries(availabilities.map(a => [a.productId.toString(), a]));

      contextParts.push('=== AVAILABLE NEEM PRODUCTS ===');
      products.slice(0, 5).forEach((p, idx) => {
        const trust = trustMap[p.supplierId?._id?.toString()] ?? 50;
        const avail = availMap[p._id.toString()];
        const parts = [
          `${idx + 1}. ${p.name || 'Unnamed product'}`,
          `   Category: ${p.category || 'Not specified'}`,
          `   Price: ₹${(p.pricePerUnit || 0).toLocaleString()} per ${p.unit || 'kg'}`,
          `   Min order: ${p.minOrderQuantity || 1} ${p.unit || 'kg'}`,
          `   Supplier: ${p.supplierId?.businessName || p.supplierId?.name || 'Unknown'} (Trust: ${trust}/100)`
        ];
        if (avail) {
          parts.push(`   Available: ${avail.quantityAvailable || 0} ${avail.unit || 'kg'}`);
        }
        if (p.moistureContentPercent != null) {
          parts.push(`   Moisture: ≤${p.moistureContentPercent}%`);
        }
        if (p.ppmValue != null) {
          parts.push(`   ${p.ppmLabel || 'PPM'}: ${p.ppmValue} ppm`);
        }
        contextParts.push(parts.join('\n'));
      });
    } else {
      contextParts.push('=== AVAILABLE NEEM PRODUCTS ===');
      contextParts.push('No products found matching the query. Users can browse all products on the Products page.');
    }

    // 2. Top suppliers by trust score (if user is a shop/buyer)
    if (userInfo.role === 'shop') {
      const topSuppliers = await TrustScore.find({})
        .sort({ score: -1 })
        .limit(3)
        .populate('supplierId', 'name businessName')
        .lean();

      if (topSuppliers.length > 0) {
        contextParts.push('\n=== TOP SUPPLIERS (by trust score) ===');
        topSuppliers.forEach((ts, idx) => {
          const supplier = ts.supplierId;
          if (supplier) {
            contextParts.push(`${idx + 1}. ${supplier.businessName || supplier.name || 'Unknown'} - Trust score: ${ts.score}/100`);
          }
        });
      }
    }

    // 3. Seasonal context
    contextParts.push(`\n=== SEASONAL CONTEXT ===`);
    if ([5, 6, 7, 8, 9].includes(currentMonth)) {
      contextParts.push(`Current month: ${monthName} (Summer/Monsoon) - Peak season for neem seeds, kernels, and oil. High availability expected.`);
    } else if ([3, 4].includes(currentMonth)) {
      contextParts.push(`Current month: ${monthName} (Spring) - Good time to plan for summer harvest. Neem leaves available.`);
    } else {
      contextParts.push(`Current month: ${monthName} - Check individual product availability. Some neem products may have lower availability.`);
    }

    // 4. User role context
    if (userInfo.role === 'shop') {
      contextParts.push('\n=== USER CONTEXT ===');
      contextParts.push('User is a buyer/shop looking to source neem products. Guide them to use Products page, check trust scores, and message suppliers via Chat.');
    } else if (userInfo.role === 'supplier') {
      contextParts.push('\n=== USER CONTEXT ===');
      contextParts.push('User is a supplier. Help them understand how to list products, update availability, and improve trust scores.');
    }

  } catch (err) {
    console.error('RAG retrieval error:', err.message);
    contextParts.push('\n=== CONTEXT ===');
    contextParts.push('Database context unavailable. Provide general guidance about neem sourcing.');
  }

  return contextParts.join('\n\n');
}

module.exports = { retrieveContext, extractKeywords };
