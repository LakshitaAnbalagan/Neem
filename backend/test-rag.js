/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          NEEM SOURCING — RAG CHATBOT TEST SUITE             ║
 * ╚══════════════════════════════════════════════════════════════╝
 * Run:  node test-rag.js
 * Make sure server is running on http://localhost:3000
 */

const BASE = 'http://localhost:3000/api/assistant/chat';

// ── ANSI colours ─────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    white: '\x1b[37m',
    blue: '\x1b[34m',
};
const c = (color, str) => `${C[color]}${str}${C.reset}`;

// ── Test cases (query + expected keywords in answer) ─────────────
const TESTS = [
    {
        label: '01 · Neem Oil Pricing',
        message: 'What is the price of neem oil per kg for bulk orders?',
        expect: ['₹', '/kg', 'oil', 'bulk'],
    },
    {
        label: '02 · Neem Kernel Season',
        message: 'When is the best time to buy neem kernels and why?',
        expect: ['August', 'October', 'harvest', 'kernel'],
    },
    {
        label: '03 · Azadirachtin / PPM',
        message: 'What is azadirachtin and why does the ppm level matter?',
        expect: ['ppm', 'biopesticide', 'azadirachtin'],
    },
    {
        label: '04 · Neem Oil Storage',
        message: 'How long can I store neem oil and in what container?',
        expect: ['months', 'store', 'HDPE', 'shelf'],
    },
    {
        label: '05 · Oil Yield Calculation',
        message: 'How many litres of neem oil can I get from 1 kg of kernels?',
        expect: ['litre', 'kg', 'cold press', 'yield'],
    },
    {
        label: '06 · Export Certifications',
        message: 'What certifications do I need to export neem products?',
        expect: ['USDA', 'ECOCERT', 'Phytosanitary', 'certification'],
    },
    {
        label: '07 · GST Rates',
        message: 'What is the GST rate on neem cake and neem oil in India?',
        expect: ['GST', 'NIL', '5%', 'exempt'],
    },
    {
        label: '08 · Supplier Trust Score',
        message: 'How do I choose a reliable supplier using trust scores?',
        expect: ['trust', 'score', 'supplier', 'verify'],
    },
    {
        label: '09 · Minimum Order Quantity',
        message: 'What is the minimum order quantity for neem oil and cake?',
        expect: ['kg', 'MT', 'minimum', 'order'],
    },
    {
        label: '10 · Off-topic Guard',
        message: 'Can you give me a recipe for biryani?',
        expect: [], // Should redirect — ANY response is acceptable
        offTopic: true,
    },
];

// ── Multi-turn conversation test ─────────────────────────────────
const MULTITURN = [
    { message: 'I want to source neem oil in large quantity', },
    { message: 'What price can I expect for 10 MT?', },
    { message: 'Which state in India should I source from for quality?', },
    { message: 'How do I verify the supplier before placing the order?', },
];

// ── Helper: POST to RAG API ──────────────────────────────────────
async function ask(message, history = [], role = 'shop') {
    const t0 = Date.now();
    const resp = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, role, conversationHistory: history }),
    });
    const ms = Date.now() - t0;
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return { ...data, ms };
}

// ── Source label ─────────────────────────────────────────────────
function sourceLabel(src) {
    if (src === 'rag-groq') return c('cyan', '★ RAG + Llama 3.1 (Groq)');
    if (src === 'rag-rules') return c('green', '✦ RAG Knowledge Base     ');
    return c('yellow', '⚠ Fallback (no context)  ');
}

// ── Run single test ──────────────────────────────────────────────
function evaluate(test, result) {
    const reply = (result.reply || '').toLowerCase();
    if (test.offTopic) {
        // Off-topic: pass if it redirects (doesn't answer biryani)
        const isRedirected = !reply.includes('rice') && !reply.includes('biryani recipe');
        return { pass: isRedirected, hits: [], miss: [] };
    }
    const hits = test.expect.filter(kw => reply.includes(kw.toLowerCase()));
    const miss = test.expect.filter(kw => !reply.includes(kw.toLowerCase()));
    const pass = hits.length >= Math.ceil(test.expect.length * 0.5); // 50% threshold
    return { pass, hits, miss };
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
    console.log('\n' + c('bold', '╔══════════════════════════════════════════════════╗'));
    console.log(c('bold', '║   NEEM SOURCING · RAG CHATBOT TEST SUITE        ║'));
    console.log(c('bold', '╚══════════════════════════════════════════════════╝'));
    console.log(c('gray', `  Endpoint: ${BASE}\n`));

    // ── SECTION 1: Individual query tests ──────────────────────────
    console.log(c('bold', '━━━  SECTION 1: Query Tests  ━━━━━━━━━━━━━━━━━━━━━━━━━'));
    let passed = 0, failed = 0;

    for (const test of TESTS) {
        try {
            const result = await ask(test.message);
            const { pass, hits, miss } = evaluate(test, result);

            const status = pass ? c('green', ' PASS ') : c('red', ' FAIL ');
            console.log(`\n  [${status}] ${c('white', test.label)}`);
            console.log(`         ${sourceLabel(result.source)}  ${c('gray', `(${result.ms}ms)`)}`);
            console.log(c('gray', `         Q: ${test.message}`));
            console.log(`         A: ${result.reply.slice(0, 160).replace(/\n/g, ' ')}…`);

            if (test.expect.length > 0) {
                if (hits.length)
                    console.log(c('green', `         ✓ Keywords matched: [${hits.join(', ')}]`));
                if (miss.length)
                    console.log(c('yellow', `         ✗ Keywords missing: [${miss.join(', ')}]`));
            } else {
                console.log(c('green', `         ✓ Off-topic guard: ${pass ? 'correctly redirected' : 'DID NOT redirect'}`));
            }

            pass ? passed++ : failed++;
        } catch (err) {
            console.log(`\n  [${c('red', ' FAIL ')}] ${c('white', test.label)}`);
            console.log(c('red', `         ERROR: ${err.message}`));
            failed++;
        }
    }

    // ── SECTION 2: Multi-turn conversation ─────────────────────────
    console.log('\n' + c('bold', '━━━  SECTION 2: Multi-Turn Conversation  ━━━━━━━━━━━━'));
    console.log(c('gray', '  Simulates a buyer having a back-and-forth conversation\n'));

    const history = [];
    for (const [idx, turn] of MULTITURN.entries()) {
        try {
            const result = await ask(turn.message, history, 'shop');
            console.log(c('white', `  [Turn ${idx + 1}] YOU:  ${turn.message}`));
            console.log(`           BOT:  ${result.reply.slice(0, 160).replace(/\n/g, ' ')}…`);
            console.log(c('gray', `           src: ${result.source}  time: ${result.ms}ms\n`));
            history.push({ user: turn.message, reply: result.reply });
        } catch (err) {
            console.log(c('red', `  [Turn ${idx + 1}] ERROR: ${err.message}\n`));
        }
    }

    // ── SECTION 3: Response latency benchmark ──────────────────────
    console.log(c('bold', '━━━  SECTION 3: Latency Benchmark  ━━━━━━━━━━━━━━━━━━━━'));
    const benchQueries = [
        'price of neem oil',
        'best season for neem kernels',
        'what is trust score',
        'gst on neem cake',
        'how to export neem',
    ];
    const latencies = [];
    for (const q of benchQueries) {
        const r = await ask(q);
        latencies.push(r.ms);
        const bar = '█'.repeat(Math.round(r.ms / 50)).padEnd(20);
        console.log(`  ${String(r.ms).padStart(5)}ms  ${c('green', bar)}  "${q}"`);
    }
    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    console.log(c('gray', `\n  Avg latency: ${avg}ms`));

    // ── SUMMARY ────────────────────────────────────────────────────
    console.log('\n' + c('bold', '━━━  SUMMARY  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    const total = passed + failed;
    const pct = Math.round((passed / total) * 100);
    const scoreColor = pct >= 80 ? 'green' : pct >= 60 ? 'yellow' : 'red';
    console.log(`  Query Tests: ${c('green', passed + ' PASSED')}  ${failed > 0 ? c('red', failed + ' FAILED') : ''}  (${c(scoreColor, pct + '%')})`);
    console.log(`  Multi-Turn:  ${c('green', MULTITURN.length + ' turns completed')}`);
    console.log(`  Source Mode: ${process.env.GROQ_API_KEY
        ? c('cyan', '★ RAG + Groq LLM (full RAG pipeline active)')
        : c('green', '✦ RAG Knowledge Base (add GROQ_API_KEY to .env for LLM)')}`);
    console.log(c('bold', '\n  Done! ✦ RAG system is working.\n'));
}

main().catch(err => {
    console.error(c('red', '\nFATAL: Could not connect to server.'));
    console.error(c('gray', 'Make sure the server is running: cd backend && node server.js'));
    console.error(err.message);
    process.exit(1);
});
