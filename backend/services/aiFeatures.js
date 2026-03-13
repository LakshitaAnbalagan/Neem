/**
 * AI features: search interpretation, seasonal tips, product suggest.
 * All use Groq when GROQ_API_KEY is set; otherwise return safe fallbacks.
 */

const { groqChat } = require('./groq');

const CATEGORIES = ['Neem oil', 'Neem kernels', 'Neem seeds', 'Neem cake', 'Neem powder', 'Neem leaves', 'Neem extract', 'Other neem product'];

/** In-memory cache for seasonal tip: key -> { tip, expires } */
const seasonalTipCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Interpret natural-language search into query + category for product filter.
 * @param {string} userQuery
 * @returns {Promise<{ q: string, category: string | null }>}
 */
async function interpretSearchQuery(userQuery) {
  const trimmed = (userQuery || '').trim().slice(0, 200);
  if (!trimmed) return { q: '', category: null };

  const system = `You are a search helper for a neem sourcing platform. Given the user's search phrase, output a JSON object with exactly two keys:
- "q": a short search string (2-4 words) to find neem products, e.g. "neem oil", "kernels", "cake powder". Use only neem-related product terms.
- "category": one of: Neem oil, Neem kernels, Neem seeds, Neem cake, Neem powder, Neem leaves, Neem extract, or null if unclear.
Reply with ONLY the JSON object, no other text.`;

  const content = await groqChat(system, trimmed, { maxTokens: 120 });
  if (!content) return { q: trimmed, category: null };
  try {
    const json = JSON.parse(content.replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/, '$1'));
    const q = (json.q || trimmed).trim().slice(0, 100);
    const cat = json.category && CATEGORIES.some(c => c.toLowerCase() === String(json.category).toLowerCase()) ? json.category : null;
    return { q: q || trimmed, category: cat };
  } catch (_) {
    return { q: trimmed, category: null };
  }
}

/**
 * AI-generated one-line seasonal tip. Cached per (month, role) for 24h.
 * @param {number} month 1-12
 * @param {'shop'|'supplier'} role
 * @returns {Promise<string>}
 */
async function getSeasonalTipAI(month, role) {
  const key = `seasonal-${month}-${role}`;
  const cached = seasonalTipCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.tip;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[Math.max(0, month - 1)] || 'this month';
  const system = `You are a neem sourcing expert. In one short sentence (max 20 words), give a practical tip for ${role === 'shop' ? 'buyers' : 'suppliers'} about neem sourcing in ${monthName}. Be specific to neem (oil, kernels, cake, powder, leaves). No preamble.`;

  const content = await groqChat(system, `Tip for ${monthName}`, { maxTokens: 80 });
  const tip = (content && content.slice(0, 200).trim()) || getFallbackSeasonalTip(month, role);
  seasonalTipCache.set(key, { tip, expires: Date.now() + CACHE_TTL_MS });
  return tip;
}

function getFallbackSeasonalTip(month, role) {
  const tips = {
    shop: 'Check product availability and trust scores; summer and monsoon often have higher neem kernel and seed supply.',
    supplier: 'Update your availability and prices; buyers often plan bulk orders in summer and monsoon.'
  };
  return tips[role] || tips.shop;
}

/**
 * Suggest category and description for a neem product. Supplier-only.
 * @param {string} name
 * @param {string} [description]
 * @returns {Promise<{ category: string, description: string }>}
 */
async function suggestProductFields(name, description) {
  const n = (name || '').trim().slice(0, 150);
  const d = (description || '').trim().slice(0, 300);
  const fallback = {
    category: CATEGORIES[0],
    description: n ? `Quality ${n} for B2B sourcing. Contact for specifications and bulk pricing.` : 'Neem product for B2B sourcing.'
  };
  if (!n) return fallback;

  const system = `You are a catalog helper for a neem B2B platform. Given a product name (and optional description), reply with a JSON object with exactly two keys:
- "category": exactly one of: Neem oil, Neem kernels, Neem seeds, Neem cake, Neem powder, Neem leaves, Neem extract, Other neem product
- "description": a single short sentence (max 25 words) for a product listing, professional and factual. No quotes inside.
Reply with ONLY the JSON object.`;

  const userMsg = d ? `Name: ${n}\nDescription: ${d}` : `Name: ${n}`;
  const content = await groqChat(system, userMsg, { maxTokens: 150 });
  if (!content) return fallback;
  try {
    const json = JSON.parse(content.replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/, '$1'));
    const category = json.category && CATEGORIES.some(c => c.toLowerCase() === String(json.category).toLowerCase()) ? json.category : fallback.category;
    const description = (json.description && String(json.description).trim().slice(0, 300)) || fallback.description;
    return { category, description };
  } catch (_) {
    return fallback;
  }
}

module.exports = {
  interpretSearchQuery,
  getSeasonalTipAI,
  suggestProductFields
};
