/**
 * Static Neem Knowledge Base for RAG retrieval.
 * Each chunk has: id, topic, tags[], content.
 * Used when DB context is unavailable OR to supplement live data.
 */

const NEEM_KNOWLEDGE_BASE = [
    // ─── PRODUCTS ────────────────────────────────────────────────────────────────
    {
        id: 'prod-oil-1',
        topic: 'Neem Oil – Types & Uses',
        tags: ['neem oil', 'cold pressed', 'solvent extracted', 'azadirachtin', 'biopesticide', 'cosmetic', 'pharma'],
        content: `Neem oil comes in two main forms: Cold-pressed neem oil retains the highest azadirachtin content (300–3000 ppm) and is dark yellow-brown with a strong garlic odor. It is preferred for biopesticides, cosmetics, and pharmaceuticals. Solvent-extracted neem oil has lower azadirachtin content but is cheaper, suitable for industrial and agricultural spray use. Both forms are sourced from neem seeds/kernels. Cold-pressed oil commands a 20–40% premium over solvent-extracted.`
    },
    {
        id: 'prod-oil-2',
        topic: 'Neem Oil – Pricing & Bulk Rates',
        tags: ['neem oil', 'price', 'bulk', 'rate', 'cost', 'kg', 'MT'],
        content: `Neem oil bulk pricing in India (2024–2025): Cold-pressed neem oil: ₹280–340/kg for orders above 500 kg; ₹320–380/kg for small lots. Solvent-extracted neem oil: ₹180–240/kg bulk. Export-grade neem oil (certified organic): ₹380–480/kg. Minimum export order typically 1 MT. Prices are highest May–July (peak agricultural demand) and lowest December–February. Forward contracts placed October–January save 15–20% on summer procurement.`
    },
    {
        id: 'prod-kernels-1',
        topic: 'Neem Kernels – Quality & Grading',
        tags: ['neem kernels', 'neem seeds', 'grade', 'quality', 'azadirachtin', 'oil content'],
        content: `Neem kernels are the inner seed after removing the outer shell from neem fruit. Graded as A-Grade (moisture ≤8%, oil content 40–50%, azadirachtin ≥1000 ppm) and B-Grade (moisture 8–12%, oil content 35–42%). A-Grade kernels are used for pharmaceutical and premium biopesticide extraction. B-Grade is suitable for bulk oil pressing and fertilizer. Key quality parameter: moisture content — high moisture leads to aflatoxin contamination. Always ask suppliers for moisture certificate.`
    },
    {
        id: 'prod-kernels-2',
        topic: 'Neem Kernels – Price & Season',
        tags: ['neem kernels', 'price', 'rate', 'season', 'harvest', 'kg'],
        content: `Neem kernel pricing in India (2024–2025): A-Grade: ₹24–32/kg bulk (500 kg+); B-Grade: ₹18–24/kg. Post-harvest season (August–November) offers lowest prices, typically 10–20% below off-season rates. Minimum order quantity from most suppliers: 500 kg–2 MT. Rajasthan, Gujarat, and Madhya Pradesh are the largest kernel-producing states. Monsoon kernel (harvested July–September) tends to have higher moisture — check before bulk purchase.`
    },
    {
        id: 'prod-cake-1',
        topic: 'Neem Cake (Seed Cake) – Uses & Benefits',
        tags: ['neem cake', 'seed cake', 'fertilizer', 'soil', 'nitrogen', 'pesticide', 'organic'],
        content: `Neem cake (also called neem seed cake or de-oiled cake) is the solid residue left after neem oil extraction. It is a rich organic fertilizer containing nitrogen (4–6%), phosphorus (0.5–1%), and potassium (1–2%). It also contains natural azadirachtin residues that act as a biopesticide in soil. Benefits: improves soil structure, suppresses soil-borne pathogens and nematodes, and provides slow-release nutrition. Used in paddy, sugarcane, horticulture, and organic farming. Available year-round since it's a byproduct of oil pressing.`
    },
    {
        id: 'prod-cake-2',
        topic: 'Neem Cake – Pricing',
        tags: ['neem cake', 'price', 'bulk', 'rate', 'fertilizer'],
        content: `Neem cake bulk pricing (2024–2025): Granular neem cake: ₹10–16/kg for 2 MT+ orders. Powder form (finer mesh): ₹12–18/kg. Pelletized (agricultural grade): ₹14–20/kg. Prices are relatively stable year-round due to consistent byproduct supply. Export-grade neem cake (certified organic): ₹18–26/kg. Large-scale buyers (10 MT+) can negotiate 10–15% below listed rates directly with oil press units. Tamil Nadu, Andhra Pradesh, and Karnataka are major suppliers.`
    },
    {
        id: 'prod-leaves-1',
        topic: 'Neem Leaves – Types & Applications',
        tags: ['neem leaves', 'fresh', 'dried', 'powder', 'pharmacy', 'ayurveda', 'cosmetic'],
        content: `Neem leaves are available in three forms: (1) Fresh leaves — used in pharmaceuticals, ayurvedic formulations, and direct agricultural applications as pest repellent sprays. Available Feb–June. (2) Sun-dried leaves — used in herbal extracts, grinding into powder, and export. Available year-round from dried stock. (3) Neem leaf powder — dried and ground, used in skincare, toothpaste, nutraceuticals. Moisture content for dried leaves should be ≤10% for pharmaceutical grade. Key active compounds: nimbin, nimbidin, azadirachtin.`
    },
    {
        id: 'prod-leaves-2',
        topic: 'Neem Leaves – Pricing',
        tags: ['neem leaves', 'price', 'dried', 'fresh', 'powder', 'rate'],
        content: `Neem leaf pricing (2024–2025): Fresh neem leaves (farm-gate): ₹3–6/kg seasonal. Sun-dried neem leaves: ₹18–28/kg bulk (500 kg+). Neem leaf powder (pharmaceutical grade, mesh 60–80): ₹60–90/kg. Organic certified neem leaf powder: ₹100–140/kg. Procurement is best done February–May when fresh leaf flush is abundant and drying conditions are optimal in most neem belt states (UP, MP, Rajasthan, Gujarat, Andhra, Tamil Nadu).`
    },

    // ─── SEASONAL GUIDE ──────────────────────────────────────────────────────────
    {
        id: 'season-1',
        topic: 'Neem Seasonality – Annual Calendar',
        tags: ['season', 'harvest', 'calendar', 'best time', 'when to buy', 'availability'],
        content: `Neem annual procurement calendar:
- February–May: Fresh neem leaf season. Best time to procure dried leaves and leaf powder.
- June–July: Neem fruiting begins in most regions. Early-season green fruit available.
- August–October: PEAK HARVEST SEASON. Neem fruit ripens and falls. Best time to buy kernels and seeds at lowest prices. Highest availability.
- November–January: Post-harvest processing. Oil pressing in full swing. Good time to lock in neem oil and cake contracts at moderate prices.
- April–June: PEAK DEMAND for neem oil (agricultural spray season before monsoon). Prices are highest. Buyers should secure contracts 3–4 months in advance.
Current month: February — leaf season is beginning. Kernel prices are moderate. Oil prices are stable.`
    },
    {
        id: 'season-2',
        topic: 'Seasonal Pricing Strategy',
        tags: ['season', 'price', 'strategy', 'forward contract', 'when to buy', 'save money'],
        content: `Optimal buying strategy by product:
NEEM OIL: Buy or contract October–February for 15–20% savings before peak summer demand. Prices spike April–July (+18–25%).
NEEM KERNELS: Buy August–November during harvest when supply is maximum and prices lowest. Dry and store in cool, dry conditions.
NEEM CAKE: Stable year-round. Buy when you need it; no significant seasonal premium.
NEEM LEAVES (dried): Stock up February–April from current-season fresh leaves. Quality is highest then.
Forward contracts (advance payment of 20–30% to lock price) are common for oil procurement above 5 MT. Trust score above 80 is recommended before entering a forward contract.`
    },

    // ─── SUPPLIERS & TRUST ────────────────────────────────────────────────────────
    {
        id: 'supplier-1',
        topic: 'Supplier Trust Score System',
        tags: ['trust score', 'supplier', 'rating', 'verified', 'reliable', 'score'],
        content: `The Neem Sourcing platform uses a Trust Score (0–100) for each supplier based on:
- Delivery reliability: Did they deliver on time and in correct quantity? (40% weight)
- Product quality: Did quality match listing specs? (35% weight)
- Communication: Responsiveness and transparency in chat. (25% weight)
Trust score interpretation: 90–100 (Excellent — safest for forward contracts), 75–89 (Good — standard sourcing), 60–74 (Moderate — verify before large orders), below 60 (Caution — start with small test orders). Suppliers with score above 85 are eligible for "Verified Premium" badge.`
    },
    {
        id: 'supplier-2',
        topic: 'How to Choose a Neem Supplier',
        tags: ['choose supplier', 'how to', 'verify', 'due diligence', 'quality check'],
        content: `Steps to choose the right neem supplier:
1. Filter by product type and quantity required on the Products page.
2. Review trust score — prefer 80+ for first orders.
3. Check supplier location on the Map to estimate logistics cost.
4. Use the in-platform chat to ask: moisture content certificate, azadirachtin content (for oil/kernels), origin state, and whether organic certification is available.
5. Start with a trial order (5–10% of full requirement) before bulk commitment.
6. After a successful order, update the supplier's trust score to help the community.
You can message any listed supplier directly from their product page.`
    },
    {
        id: 'supplier-3',
        topic: 'Major Neem-Producing States in India',
        tags: ['location', 'state', 'region', 'rajasthan', 'gujarat', 'andhra', 'tamil nadu', 'maharashtra', 'map'],
        content: `Top neem-producing states in India:
- Rajasthan: Largest neem oil and kernel production state. Jodhpur and Barmer districts are key hubs. High azadirachtin content due to arid climate.
- Gujarat: Major neem kernel and oil supplier. Saurashtra region has dense neem tree coverage.
- Madhya Pradesh: Large natural neem forests. Good for bulk kernel and cake supply.
- Andhra Pradesh & Telangana: Significant neem leaf, dried leaf powder, and seed supply.
- Tamil Nadu: Neem cake and oil processing units concentrated near Coimbatore and Salem.
- Karnataka & Maharashtra: Good for certified organic neem products.
Use the Map page on the platform to locate suppliers by state.`
    },

    // ─── QUALITY & SPECIFICATIONS ────────────────────────────────────────────────
    {
        id: 'quality-1',
        topic: 'Neem Oil Quality Parameters',
        tags: ['quality', 'specification', 'azadirachtin', 'moisture', 'ffa', 'acid value', 'test'],
        content: `Key quality parameters for neem oil:
- Azadirachtin content: ≥300 ppm (standard grade), ≥1500 ppm (premium/pharmaceutical grade). Test using HPLC.
- Free Fatty Acid (FFA): <5% for quality oil. High FFA indicates poor storage or old seeds.
- Moisture: <0.5% for refined grades. High moisture causes rancidity.
- Specific gravity: 0.910–0.928 g/ml
- Refractive index: 1.460–1.470 at 25°C
- Peroxide value: <10 mEq/kg for fresh oil.
Always request a Certificate of Analysis (CoA) from suppliers for pharmaceutical or export-grade purchases. Reputable suppliers on this platform have CoA attached to their product listing.`
    },
    {
        id: 'quality-2',
        topic: 'Neem Kernel Quality & Moisture',
        tags: ['kernel quality', 'moisture', 'grade', 'aflatoxin', 'test', 'certificate'],
        content: `Neem kernel quality checklist:
- Moisture content: Must be ≤8% for A-Grade. Above 12% risks aflatoxin contamination.
- Oil content: 40–50% for A-Grade; 35–42% for B-Grade. Higher oil content = more oil yield per kg.
- Azadirachtin content: ≥1000 ppm for pharmaceutical extraction.
- Appearance: Clean, uniform, light brown. No black/mouldy kernels.
- Rejection rate: Should be <2% of total weight.
Ask suppliers for moisture certificate and NIR spectroscopy report if available. Harvest-fresh kernels (August–November) typically have better quality than stored lot from previous season.`
    },

    // ─── PLATFORM HOW-TO ───────────────────────────────────────────────────────────
    {
        id: 'platform-1',
        topic: 'How the Neem Sourcing Platform Works',
        tags: ['platform', 'how it works', 'steps', 'guide', 'source', 'buy', 'register'],
        content: `How to source neem on this platform:
1. REGISTER: Create a free buyer (shop) account at /register?role=shop.
2. BROWSE: Go to the Products page to search and filter listings by product type, state, quantity, and trust score.
3. COMPARE: Click any product to see full specs, supplier profile, trust score, and availability.
4. CHAT: Click "Message Supplier" to open a direct chat. Use quick prompts to ask about bulk pricing, certificates, and delivery terms.
5. MAP: Use the Map page to discover suppliers by geographic location — useful for reducing logistics costs.
6. CONFIRM: Agree on terms via chat. Delivery and payment are coordinated directly between buyer and supplier.
The platform is designed exclusively for neem raw material procurement — no generic products, no middlemen.`
    },
    {
        id: 'platform-2',
        topic: 'How to List Products as a Supplier',
        tags: ['supplier', 'list product', 'add product', 'dashboard', 'how to', 'register'],
        content: `For neem suppliers to list products:
1. Register at /register?role=supplier.
2. Complete your business profile including GST number and location.
3. Go to Dashboard → "Add Product". Fill in product name, category, unit, price/kg, minimum order quantity, and description.
4. Upload specifications: moisture content, azadirachtin content, certifications.
5. Set availability: current quantity available and update weekly.
6. Respond promptly to buyer chat messages — high responsiveness directly improves your Trust Score.
The platform's trust score system rewards reliable suppliers with higher visibility in search results and buyer filters.`
    },
    {
        id: 'platform-3',
        topic: 'Bulk Order & Negotiation Process',
        tags: ['bulk', 'order', 'negotiate', 'chat', 'price', 'minimum order', 'forward contract'],
        content: `For bulk neem procurement (5 MT+):
1. Search Products, filter by category and shortlist 3–5 suppliers.
2. Send each a quick inquiry via the platform chat: "Hi, I need [X MT] of [product] by [date], can you share bulk pricing and specs?"
3. Compare responses. Shortlist 2–3 based on price, trust score, and certificate availability.
4. Negotiate pricing — most suppliers offer 8–15% discount for orders above 5 MT, and 15–25% for 20 MT+.
5. For forward contracts, a 20–30% advance is typical. Only do this with suppliers scoring 85+ in trust score.
6. Finalize by agreeing on: price/kg, quantity, moisture guarantees, delivery timeline, and payment terms.
All conversations are saved in your chat history on the platform for reference.`
    },

    // ─── CERTIFICATIONS ───────────────────────────────────────────────────────────
    {
        id: 'cert-1',
        topic: 'Certifications for Neem Export',
        tags: ['export', 'certification', 'organic', 'USDA', 'EU organic', 'FSSAI', 'phytosanitary', 'certificate'],
        content: `Key certifications for neem product export:
- USDA Organic / NOP: Required for US market. Certifying bodies in India: LACON, ECOCERT, OneCert, Control Union.
- EU Organic (EC 834/2007): Required for European markets. Indian certifiers: ECOCERT, IMO, Naturland.
- FSSAI License: Required for food-grade neem products (leaves, oil used in edibles).
- Phytosanitary Certificate: Required for kernel and leaf export. Issued by state agriculture departments.
- CoA (Certificate of Analysis): Lab report showing azadirachtin content, moisture, FFA, etc. Lab: IARI, CICR-accredited labs.
Filter suppliers on the Products page by "Certified/Organic" tag to find exportable products.`
    },

    // ─── COMMON BUYER QUESTIONS ──────────────────────────────────────────────────
    {
        id: 'faq-1',
        topic: 'How Many Litres of Oil from 1 kg of Kernels?',
        tags: ['oil yield', 'kernel', 'how much', 'extraction', 'litre', 'kg', 'calculate'],
        content: `Oil yield from neem kernels:
- A-Grade kernels (oil content 45–50%): Yield ~400–480 ml oil per 1 kg kernels (cold press). Solvent extraction yields slightly more (~500 ml).
- B-Grade kernels (oil content 35–42%): Yield ~300–380 ml per 1 kg.
- So for 1 MT of A-Grade kernels, expect approximately 400–480 litres of neem oil (cold press).
Loss factor: 5–10% from moisture, shell residue, and processing losses.
Rule of thumb: 1 litre cold-press neem oil requires approximately 2.2–2.5 kg of A-Grade kernels.`
    },
    {
        id: 'faq-2',
        topic: 'Neem Oil Shelf Life & Storage',
        tags: ['storage', 'shelf life', 'store', 'how long', 'expiry', 'container'],
        content: `Neem oil storage guidelines:
- Shelf life: 12–18 months for unrefined cold-press oil in sealed containers; up to 24 months for refined/degummed oil.
- Container: Dark HDPE or mild steel drums. Avoid galvanized containers (zinc reacts with FFA in neem oil).
- Temperature: Store below 25°C in a cool, dry place. Avoid direct sunlight.
- Condition indicator: Fresh neem oil is dark yellow/brown and translucent. If it turns very dark, viscous, or develops a rancid smell (different from normal garlic-sulfur odor), it has degraded.
- Kernels: Store in jute bags in cool, dry godown at ≤15% RH to prevent mold growth. Properly dried kernels (≤8% moisture) last 12 months.`
    },
    {
        id: 'faq-3',
        topic: 'What is Azadirachtin and Why Does It Matter?',
        tags: ['azadirachtin', 'ppm', 'biopesticide', 'active compound', 'pharmaceutical', 'content'],
        content: `Azadirachtin is the primary bioactive compound in neem products, responsible for its biopesticide, antifeedant, and growth-regulatory properties. Measured in ppm (parts per million):
- >3000 ppm: Premium pharmaceutical/export grade
- 1000–3000 ppm: High-grade agricultural biopesticide
- 300–999 ppm: Standard agricultural grade
- <300 ppm: Low-grade; mostly used as carrier in formulations
Azadirachtin content depends on: kernel freshness, tree variety (Azadirachta indica), climate (arid zones like Rajasthan produce highest content), and processing method (cold press preserves more than solvent extraction). Always request HPLC certificate from supplier for pharma or export use.`
    },
    {
        id: 'faq-4',
        topic: 'Minimum Order Quantities',
        tags: ['minimum order', 'MOQ', 'small order', 'trial', 'quantity'],
        content: `Typical minimum order quantities (MOQ) on Neem Sourcing platform:
- Neem oil: 200 kg (small suppliers), 500 kg–1 MT (medium), 5 MT+ (large integrated units)
- Neem kernels: 500 kg–1 MT (most suppliers)
- Neem cake: 1 MT (most common), some accept 500 kg
- Neem leaf (dried): 200–500 kg depending on supplier
- Neem leaf powder: 100–500 kg
For trial orders below standard MOQ, you can message the supplier and negotiate — most are willing to do a 50–100 kg sample order at a slightly higher rate. Mention it's a quality trial for a larger ongoing requirement.`
    },
    {
        id: 'faq-5',
        topic: 'GST on Neem Products',
        tags: ['GST', 'tax', 'rate', 'invoice', 'gst rate'],
        content: `GST rates on neem raw materials in India (as of 2024):
- Neem oil (raw/crude, HSN 1515): 5% GST
- Neem cake (organic fertilizer, HSN 3101): NIL GST (exempt as organic manure)
- Neem kernels/seeds (HSN 1207): 5% GST
- Neem leaves (HSN 0602/1211): 5% GST (dried/processed); usually NIL if sold as agricultural produce
- Processed neem leaf powder (value-added): 18% GST can apply
Always request a proper GST invoice from suppliers. Registered buyers can claim ITC on 5% products.`
    }
];

/**
 * Simple TF-IDF based cosine similarity retrieval.
 * Returns top-K most relevant chunks for a query.
 */
function tokenize(text) {
    return (text || '').toLowerCase()
        .replace(/[^a-z0-9₹\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1);
}

function buildTermFreq(tokens) {
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    return tf;
}

function cosineSimilarity(tf1, tf2) {
    const allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
    let dot = 0, mag1 = 0, mag2 = 0;
    for (const term of allTerms) {
        const v1 = tf1[term] || 0;
        const v2 = tf2[term] || 0;
        dot += v1 * v2;
        mag1 += v1 * v1;
        mag2 += v2 * v2;
    }
    if (!mag1 || !mag2) return 0;
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * Retrieve top-K relevant chunks from the static knowledge base.
 * @param {string} query - User's question
 * @param {number} topK  - Number of chunks to return (default: 3)
 * @returns {{ chunk: Object, score: number }[]}
 */
function retrieveStaticChunks(query, topK = 3) {
    const queryTokens = tokenize(query);
    // Boost: if any tag word appears in query, add to query tokens
    const queryTf = buildTermFreq(queryTokens);

    const scored = NEEM_KNOWLEDGE_BASE.map(chunk => {
        // Combine content + tags + topic for chunk representation
        const chunkText = [chunk.topic, ...chunk.tags, chunk.content].join(' ');
        const chunkTf = buildTermFreq(tokenize(chunkText));

        // Base cosine similarity
        let score = cosineSimilarity(queryTf, chunkTf);

        // Tag boost: if a tag exactly matches a word in the query, boost score
        const tagBoost = chunk.tags.filter(tag => queryTokens.includes(tag) || query.toLowerCase().includes(tag)).length;
        score += tagBoost * 0.15;

        return { chunk, score };
    });

    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

/**
 * Build a context string from top retrieved static chunks.
 * @param {string} query
 * @param {number} topK
 * @returns {string}
 */
function getStaticContext(query, topK = 3) {
    const results = retrieveStaticChunks(query, topK);
    if (!results.length) {
        return '=== NEEM KNOWLEDGE BASE ===\nNo specific matching content found. Provide general neem sourcing guidance.';
    }
    const parts = ['=== NEEM KNOWLEDGE BASE (Retrieved) ==='];
    results.forEach(({ chunk }, i) => {
        parts.push(`\n[${i + 1}] ${chunk.topic}\n${chunk.content}`);
    });
    return parts.join('\n');
}

module.exports = { NEEM_KNOWLEDGE_BASE, retrieveStaticChunks, getStaticContext };
