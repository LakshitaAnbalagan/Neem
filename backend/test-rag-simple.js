// Simple RAG test — no colors, plain output
// Run: node test-rag-simple.js

const BASE = 'http://localhost:3000/api/assistant/chat';

async function ask(msg, history = []) {
    const t0 = Date.now();
    const r = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, role: 'shop', conversationHistory: history })
    });
    const d = await r.json();
    return { ...d, ms: Date.now() - t0 };
}

const TESTS = [
    { q: 'What is the price of cold pressed neem oil per kg bulk order?', expect: ['₹', '/kg'] },
    { q: 'When is the best season to buy neem kernels?', expect: ['August', 'harvest'] },
    { q: 'What is azadirachtin and why does the ppm level matter?', expect: ['ppm', 'azadirachtin'] },
    { q: 'How long can I store neem oil and in what container?', expect: ['months', 'HDPE', 'shelf'] },
    { q: 'What certifications do I need to export neem products?', expect: ['USDA', 'ECOCERT'] },
    { q: 'What is the GST rate on neem cake and neem oil?', expect: ['GST', 'NIL', '5%'] },
    { q: 'How do I verify a supplier trust score on the platform?', expect: ['trust', 'score'] },
    { q: 'What is the minimum order quantity for neem kernels?', expect: ['MT', 'kg', 'minimum'] },
    { q: 'How many litres of oil from 1 kg of neem kernels?', expect: ['litre', 'cold press'] },
    { q: 'Give me a pizza recipe', expect: [], offTopic: true },
];

const MULTI = [
    'Hi, I want to source neem oil in bulk',
    'What price can I expect for 5 metric tons?',
    'Which state in India gives highest azadirachtin content?',
    'How do I place a forward contract safely?',
];

async function main() {
    console.log('\n' + '='.repeat(65));
    console.log('  NEEM SOURCING - RAG CHATBOT TEST SUITE');
    console.log('  Endpoint: ' + BASE);
    console.log('='.repeat(65));

    // ── Section 1: Query tests ──────────────────────────────────────
    console.log('\n--- SECTION 1: Individual Query Tests ---\n');
    let passed = 0, failed = 0;
    const times = [];

    for (const [i, t] of TESTS.entries()) {
        try {
            const r = await ask(t.q);
            times.push(r.ms);
            const replyLc = r.reply.toLowerCase();

            let pass;
            if (t.offTopic) {
                pass = !replyLc.includes('pizza') && !replyLc.includes('dough');
            } else {
                const hits = t.expect.filter(k => replyLc.includes(k.toLowerCase()));
                pass = hits.length >= Math.ceil(t.expect.length * 0.5);
            }

            const status = pass ? 'PASS' : 'FAIL';
            console.log(`[${String(i + 1).padStart(2, '0')}] ${status} | ${r.source.padEnd(12)} | ${r.ms}ms`);
            console.log(`     Q: ${t.q}`);
            console.log(`     A: ${r.reply.replace(/\n/g, ' ').substring(0, 180)}...`);

            if (t.offTopic) {
                console.log(`     Off-topic guard: ${pass ? 'OK - correctly redirected' : 'FAILED - gave off-topic answer'}`);
            } else {
                const hits = t.expect.filter(k => replyLc.includes(k.toLowerCase()));
                const miss = t.expect.filter(k => !replyLc.includes(k.toLowerCase()));
                if (hits.length) console.log(`     Keywords matched: [${hits.join(', ')}]`);
                if (miss.length) console.log(`     Keywords missing: [${miss.join(', ')}]`);
            }
            console.log('');

            pass ? passed++ : failed++;
        } catch (e) {
            console.log(`[${String(i + 1).padStart(2, '0')}] FAIL | ERROR: ${e.message}\n`);
            failed++;
        }
    }

    // ── Section 2: Multi-turn conversation ─────────────────────────
    console.log('--- SECTION 2: Multi-Turn Conversation Test ---\n');
    const history = [];
    for (const [i, msg] of MULTI.entries()) {
        try {
            const r = await ask(msg, history.slice(-4));
            console.log(`  Turn ${i + 1} [${r.source}] ${r.ms}ms`);
            console.log(`  YOU: ${msg}`);
            console.log(`  BOT: ${r.reply.replace(/\n/g, ' ').substring(0, 180)}...`);
            console.log('');
            history.push({ user: msg, reply: r.reply });
        } catch (e) {
            console.log(`  Turn ${i + 1} ERROR: ${e.message}\n`);
        }
    }

    // ── Section 3: Latency ─────────────────────────────────────────
    console.log('--- SECTION 3: Latency Summary ---\n');
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const min = Math.min(...times);
    const max = Math.max(...times);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`  Avg: ${avg}ms\n`);

    // ── Summary ────────────────────────────────────────────────────
    console.log('='.repeat(65));
    console.log(`  RESULTS: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL`);
    console.log(`  SCORE:   ${Math.round(passed / (passed + failed) * 100)}%`);
    console.log(`  MODE:    ${process.env.GROQ_API_KEY ? 'RAG + Groq LLM (GROQ_API_KEY found)' : 'RAG Knowledge Base (no GROQ_API_KEY)'}`);
    console.log('='.repeat(65) + '\n');
}

main().catch(e => {
    console.error('\nERROR: Cannot connect to server.');
    console.error('Make sure the server is running:  cd backend && node server.js');
    console.error('Details:', e.message);
});
