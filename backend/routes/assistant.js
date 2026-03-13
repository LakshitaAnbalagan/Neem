/**
 * POST /api/assistant/chat
 * Public endpoint — no auth required (used by homepage chatbot widget).
 * Uses full RAG pipeline: static knowledge base + live DB context + Groq LLM.
 * Falls back to rule-based responses if no GROQ_API_KEY is set.
 */

const express = require('express');
const router = express.Router();
const { retrieveContext } = require('../services/ragRetrieval');
const { getStaticContext } = require('../services/neemKnowledge');
const { groqChat } = require('../services/groq');

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Neem Assistant — the AI sourcing expert for Neem Sourcing, India's premier B2B platform for neem raw materials. Your job is to help buyers and suppliers with:

• Product knowledge: neem oil (cold-pressed vs solvent-extracted), kernels, seed cake, dried leaves, leaf powder
• Pricing guidance: bulk rates, seasonal price trends, negotiation tips
• Seasonal sourcing strategy: which months to buy each product and why
• Quality parameters: azadirachtin content (ppm), moisture %, FFA, certifications (organic, FSSAI, phytosanitary)
• Supplier selection: how to use trust scores, what to ask suppliers in chat
• Platform navigation: Products page, Map, Supplier Chat, Dashboard

Rules:
- Keep answers concise, helpful, and specific (2–5 sentences max for simple Q, max 10 bullet points for guides).
- Use ₹ for Indian Rupee amounts, spell out MT for metric tons.
- Always reference actual data from the CONTEXT sections provided (knowledge base and live DB).
- Do NOT invent product names, supplier names, or prices not present in the context.
- If a question is completely unrelated to neem sourcing, politely redirect.
- If asked to do something harmful, refuse gracefully.
- For the latest product or supplier data, always tell users to check the Products page or use the platform search.
- Use simple markdown (*bold*, bullet points) sparingly.`;

// ── Rule-based fallback (no API key) ─────────────────────────────────────────
const RULE_DB = [
    {
        tags: ['hello', 'hi', 'hey', 'start', 'namaste'],
        reply: '👋 Hello! I\'m Neem Assistant — your expert guide for neem raw material sourcing. Ask me about pricing, seasons, suppliers, certifications, or how to use this platform!'
    },
    {
        tags: ['price', 'pricing', 'cost', 'rate', '₹', 'rs', 'inr'],
        reply: '💰 **Current neem bulk rates (approx):**\n• Cold-pressed neem oil: ₹280–340/kg (500 kg+)\n• Neem kernels A-Grade: ₹24–32/kg\n• Neem seed cake: ₹10–16/kg\n• Dried neem leaves: ₹18–28/kg\nPrices are lowest after harvest (Aug–Nov). For live pricing, check product listings directly.'
    },
    {
        tags: ['oil', 'neem oil', 'cold press', 'extract', 'azadirachtin'],
        reply: '🫒 Neem oil comes in cold-pressed (₹280–340/kg, high azadirachtin 300–3000 ppm) and solvent-extracted (₹180–240/kg, lower ppm) varieties. Cold-press is preferred for biopesticides and cosmetics. Check the Products page for live listings from verified suppliers.'
    },
    {
        tags: ['kernel', 'seed', 'kernels', 'seeds'],
        reply: '🌱 Neem kernels are graded A (≤8% moisture, ≥40% oil, ≥1000 ppm azadirachtin) and B (8–12% moisture). A-Grade: ₹24–32/kg; B-Grade: ₹18–24/kg. Best time to buy: August–November during harvest season when prices dip 10–20%.'
    },
    {
        tags: ['cake', 'seed cake', 'fertilizer', 'organic'],
        reply: '🟫 Neem seed cake is a rich organic fertilizer (4–6% N, natural pest control). Pricing: ₹10–16/kg granular, ₹12–18/kg powder. Available year-round. Major suppliers in Tamil Nadu, Andhra Pradesh, and Karnataka. NIL GST as organic manure!'
    },
    {
        tags: ['leaf', 'leaves', 'dried', 'powder', 'ayurveda'],
        reply: '🍃 Neem leaves are available fresh (Feb–May, ₹3–6/kg farm-gate), sun-dried (₹18–28/kg), and as powder (₹60–90/kg, pharmaceutical grade). Best procurement window is Feb–April during the new leaf flush.'
    },
    {
        tags: ['season', 'seasonal', 'when', 'harvest', 'best time', 'month'],
        reply: '📅 **Neem sourcing calendar:**\n• Feb–May: Fresh leaf season\n• Aug–Oct: PEAK kernel/seed harvest (lowest prices)\n• Nov–Jan: Oil pressing season\n• Apr–Jun: Peak oil demand (prices highest)\nBuy oil contracts Oct–Feb to save 15–20% vs summer rates!'
    },
    {
        tags: ['supplier', 'trust', 'score', 'verify', 'reliable'],
        reply: '🔒 Trust Scores (0–100) reflect supplier delivery reliability (40%), product quality (35%), and communication (25%). Aim for 80+ for standard orders, 85+ before any forward contract. Browse top-rated suppliers on our Products page.'
    },
    {
        tags: ['bulk', 'large', 'mt', 'ton', 'minimum', 'moq'],
        reply: '📦 Typical minimum orders: Oil 200–500 kg, Kernels 500 kg–1 MT, Cake 1 MT, Dried leaves 200–500 kg. For 5 MT+ orders, suppliers typically offer 8–15% discount. Negotiate via the in-platform chat.'
    },
    {
        tags: ['export', 'organic', 'certification', 'usda', 'eu', 'fssai', 'certificate'],
        reply: '📜 For export, you\'ll need: USDA Organic or EU Organic certificate (via ECOCERT, IMO, Control Union), Phytosanitary Certificate from the state agriculture dept, and CoA (Certificate of Analysis) for azadirachtin, moisture, FFA. Filter for certified suppliers in the Products page.'
    },
    {
        tags: ['yield', 'litre', 'how much', 'extraction', 'liter'],
        reply: '🧪 A-Grade kernels yield ~400–480 ml neem oil per 1 kg (cold press). So 1 MT of A-Grade kernels ≈ 400–480 litres of oil. Rule of thumb: you need 2.2–2.5 kg of A-Grade kernels per litre of cold-press neem oil.'
    },
    {
        tags: ['gst', 'tax', 'invoice'],
        reply: '🧾 GST rates: Neem oil — 5%, Neem kernels — 5%, Neem cake (organic fertilizer) — NIL (exempt), Dried neem leaves — 5%. Always request a proper GST invoice. Registered buyers can claim ITC on 5% items.'
    },
    {
        tags: ['storage', 'store', 'shelf life', 'expiry', 'how long'],
        reply: '🏪 Neem oil shelf life: 12–18 months (unrefined) in dark HDPE/steel drums below 25°C. Kernels: store in jute bags at ≤15% RH — last 12 months if moisture ≤8%. Avoid galvanized containers for oil (zinc reacts with FFA).'
    },
    {
        tags: ['how', 'platform', 'work', 'register', 'use', 'steps', 'buy', 'source'],
        reply: '🚀 **How to source on Neem Sourcing:**\n1. Register free as a buyer at /register\n2. Browse Products page — filter by category & trust score\n3. Click a product → check specs & supplier profile\n4. Message the supplier via chat\n5. Negotiate and agree on terms\n6. Use Map page to find suppliers by location.'
    },
    {
        tags: ['thank', 'thanks', 'great', 'good', 'bye', 'goodbye'],
        reply: '🌿 Happy to help! Reach out anytime for neem sourcing advice. Good luck with your procurement!'
    },
];

function ruleBasedReply(msg) {
    const lc = (msg || '').toLowerCase();
    for (const rule of RULE_DB) {
        if (rule.tags.some(tag => lc.includes(tag))) return rule.reply;
    }
    return '🤔 I\'m not sure about that specific question. Try asking about **neem pricing**, **seasonal availability**, **quality specifications**, or **how to use the platform**. For live data, visit the Products page!';
}

// ── POST /api/assistant/chat ──────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
    const { message, role = 'shop', conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const userMsg = message.trim().slice(0, 1000);

    try {
        // ── STEP 1: Retrieve static knowledge base context ────────────────────────
        const staticCtx = getStaticContext(userMsg, 3);

        // ── STEP 2: Retrieve live DB context (products, suppliers, availability) ───
        let liveCtx = '';
        try {
            liveCtx = await retrieveContext(userMsg, { role });
        } catch (dbErr) {
            console.warn('DB context unavailable for RAG:', dbErr.message);
            liveCtx = '=== LIVE DATABASE ===\nDatabase context temporarily unavailable.';
        }

        // ── STEP 3: Build full RAG context ────────────────────────────────────────
        const fullContext = [staticCtx, liveCtx].join('\n\n');

        // ── STEP 4: Try Groq LLM with RAG context ─────────────────────────────────
        const apiKey = process.env.GROQ_API_KEY;
        if (apiKey) {
            // Build conversation messages (last 4 turns for context window)
            const historyMessages = (conversationHistory || [])
                .slice(-4)
                .map(turn => [
                    { role: 'user', content: (turn.user || '').slice(0, 500) },
                    { role: 'assistant', content: (turn.reply || '').slice(0, 500) }
                ]).flat();

            const ragSystemPrompt = `${SYSTEM_PROMPT}\n\n--- RETRIEVED CONTEXT ---\n${fullContext}\n--- END CONTEXT ---`;

            const body = {
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: ragSystemPrompt },
                    ...historyMessages,
                    { role: 'user', content: userMsg }
                ],
                max_tokens: 512,
                temperature: 0.45
            };

            const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (resp.ok) {
                const data = await resp.json();
                const content = data?.choices?.[0]?.message?.content?.trim();
                if (content) {
                    return res.json({ reply: content, source: 'rag-groq', model: 'llama-3.1-8b-instant' });
                }
            } else {
                console.warn('Groq API non-ok:', resp.status, await resp.text().catch(() => ''));
            }
        }

        // ── STEP 5: RAG-enhanced rule-based fallback ───────────────────────────────
        // Even without an LLM, use static context to give richer responses
        const ruleReply = ruleBasedReply(userMsg);
        return res.json({ reply: ruleReply, source: 'rag-rules' });

    } catch (err) {
        console.error('Assistant chat error:', err.message);
        return res.json({ reply: ruleBasedReply(userMsg), source: 'fallback' });
    }
});

module.exports = router;
