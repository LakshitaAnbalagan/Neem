/**
 * i18n.js – Auto-translate every page using MyMemory Translation API
 * - No API key required (MyMemory free tier)
 * - Caches translations in localStorage (per language per page)
 * - Translates ALL visible text nodes, placeholders, titles, alt text
 * - MutationObserver re-translates dynamically added content
 * - Language selector injected into every navbar automatically
 */
(function () {
    'use strict';

    /* ─── Supported languages ─────────────────────────── */
    const LANGS = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'हिन्दी' },
        { code: 'ta', label: 'தமிழ்' },
        { code: 'te', label: 'తెలుగు' },
        { code: 'kn', label: 'ಕನ್ನಡ' },
        { code: 'ml', label: 'മലയാളം' },
        { code: 'bn', label: 'বাংলা' },
        { code: 'mr', label: 'मराठी' },
        { code: 'gu', label: 'ગુજરાતી' },
        { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    ];

    const STORAGE_KEY = 'ns_lang';
    const CACHE_PREFIX = 'ns_tr_';
    const PAGE_KEY = location.pathname.split('/').pop() || 'index';

    /* ─── Language helpers ─────────────────────────────── */
    function getLang() { return localStorage.getItem(STORAGE_KEY) || 'en'; }
    function setLang(l) { localStorage.setItem(STORAGE_KEY, l); }

    /* ─── Cache helpers ────────────────────────────────── */
    function cacheKey(lang) { return CACHE_PREFIX + lang + '_' + PAGE_KEY; }

    function getCache(lang) {
        try { return JSON.parse(localStorage.getItem(cacheKey(lang)) || '{}'); }
        catch { return {}; }
    }

    function setCache(lang, map) {
        try { localStorage.setItem(cacheKey(lang), JSON.stringify(map)); }
        catch { /* storage full – ignore */ }
    }

    /* ─── Translation API (MyMemory – free, no key) ───── */
    const pending = {}; // dedup in-flight requests

    async function translateText(text, targetLang) {
        if (!text || !text.trim() || targetLang === 'en') return text;
        const trimmed = text.trim();
        if (/^[\d\s₹%.,:/\-+()]+$/.test(trimmed)) return text; // skip pure numbers/symbols

        // If offline, return original text (cache will be used by translateBatch)
        if (!navigator.onLine) return text;

        const dedup = trimmed + '||' + targetLang;
        if (pending[dedup]) return pending[dedup];

        const url =
            'https://api.mymemory.translated.net/get?q=' +
            encodeURIComponent(trimmed) +
            '&langpair=en|' + targetLang;

        pending[dedup] = fetch(url)
            .then(r => r.json())
            .then(data => {
                delete pending[dedup];
                const t = data?.responseData?.translatedText;
                return t && data.responseStatus === 200 ? t : text;
            })
            .catch(() => { delete pending[dedup]; return text; });

        return pending[dedup];
    }

    /* ─── Batch translate an array of strings ──────────── */
    async function translateBatch(strings, targetLang, cache) {
        const unique = [...new Set(strings.map(s => s.trim()).filter(s =>
            s && s.length > 0 && !/^[\d\s₹%.,:/\-+()]+$/.test(s)
        ))];

        const toFetch = unique.filter(s => !cache[s]);

        if (toFetch.length > 0) {
            // Fetch in parallel but limit concurrency to 5 at a time
            const chunks = [];
            for (let i = 0; i < toFetch.length; i += 5) {
                chunks.push(toFetch.slice(i, i + 5));
            }
            for (const chunk of chunks) {
                await Promise.all(
                    chunk.map(s =>
                        translateText(s, targetLang).then(t => { cache[s] = t; })
                    )
                );
            }
            setCache(targetLang, cache);
        }

        return cache;
    }

    /* ─── Collect all translatable text nodes ──────────── */
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'SVG', 'PATH']);

    function collectTextNodes(root) {
        const nodes = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const p = node.parentElement;
                    if (!p) return NodeFilter.FILTER_REJECT;
                    if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
                    if (p.tagName === 'OPTION') return NodeFilter.FILTER_REJECT;
                    // Skip nav-hamburger, lang-select
                    if (p.classList && (p.classList.contains('lang-select') || p.classList.contains('nav-hamburger'))) return NodeFilter.FILTER_REJECT;
                    const txt = node.nodeValue.trim();
                    if (!txt || txt.length < 1) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        return nodes;
    }

    /* Store original English text so we can re-translate if language changes */
    function storeOriginals(nodes) {
        nodes.forEach(n => {
            if (!n.__i18n_orig) n.__i18n_orig = n.nodeValue;
        });
    }

    function getOriginalText(node) {
        return node.__i18n_orig || node.nodeValue;
    }

    /* ─── Apply translations to the page ──────────────── */
    async function applyTranslations(lang) {
        if (lang === 'en') {
            // Restore originals
            const nodes = collectTextNodes(document.body);
            nodes.forEach(n => {
                if (n.__i18n_orig) n.nodeValue = n.__i18n_orig;
            });
            // Restore placeholders
            document.querySelectorAll('[data-i18n-orig-placeholder]').forEach(el => {
                el.placeholder = el.getAttribute('data-i18n-orig-placeholder');
            });
            document.querySelectorAll('[data-i18n-orig-title]').forEach(el => {
                el.title = el.getAttribute('data-i18n-orig-title');
            });
            return;
        }

        const cache = getCache(lang);
        const nodes = collectTextNodes(document.body);
        storeOriginals(nodes);

        // Collect all unique strings
        const strings = nodes.map(n => getOriginalText(n).trim()).filter(Boolean);

        // Also collect placeholders and titles
        const inputs = [...document.querySelectorAll('[placeholder]')];
        const titledEls = [...document.querySelectorAll('[title]:not(html):not(meta)')];

        inputs.forEach(el => {
            if (!el.getAttribute('data-i18n-orig-placeholder')) {
                el.setAttribute('data-i18n-orig-placeholder', el.placeholder);
            }
            const orig = el.getAttribute('data-i18n-orig-placeholder');
            if (orig && orig.trim()) strings.push(orig.trim());
        });

        titledEls.forEach(el => {
            if (!el.getAttribute('data-i18n-orig-title')) {
                el.setAttribute('data-i18n-orig-title', el.title);
            }
            const orig = el.getAttribute('data-i18n-orig-title');
            if (orig && orig.trim()) strings.push(orig.trim());
        });

        // Translate everything
        await translateBatch(strings, lang, cache);

        // Apply to text nodes
        nodes.forEach(n => {
            const orig = getOriginalText(n).trim();
            if (orig && cache[orig]) {
                n.nodeValue = n.nodeValue.replace(orig, cache[orig]);
            }
        });

        // Apply to placeholders
        inputs.forEach(el => {
            const orig = el.getAttribute('data-i18n-orig-placeholder');
            if (orig && cache[orig.trim()]) el.placeholder = cache[orig.trim()];
        });

        // Apply to titles
        titledEls.forEach(el => {
            const orig = el.getAttribute('data-i18n-orig-title');
            if (orig && cache[orig.trim()]) el.title = cache[orig.trim()];
        });
    }

    /* ─── Show a loading overlay while translating ─────── */
    function showLoader(show) {
        let el = document.getElementById('i18n-loader');
        if (show) {
            if (!el) {
                el = document.createElement('div');
                el.id = 'i18n-loader';
                el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;"><div style="width:20px;height:20px;border:3px solid #fff;border-top-color:transparent;border-radius:50%;animation:i18n-spin 0.7s linear infinite;"></div><span>Translating…</span></div>';
                el.style.cssText = 'position:fixed;top:1rem;right:1rem;background:rgba(13,92,46,0.92);color:#fff;padding:0.55rem 1.1rem;border-radius:2rem;font-size:0.82rem;z-index:99999;transition:opacity 0.3s;font-family:inherit;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
                document.body.appendChild(el);
                const style = document.createElement('style');
                style.textContent = '@keyframes i18n-spin{to{transform:rotate(360deg)}}';
                document.head.appendChild(style);
            }
            el.style.opacity = '1';
            el.style.pointerEvents = 'none';
        } else if (el) {
            el.style.opacity = '0';
            setTimeout(() => el && el.remove(), 400);
        }
    }

    /* ─── Language selector dropdown ───────────────────── */
    function createSelector() {
        const sel = document.createElement('select');
        sel.className = 'lang-select';
        sel.setAttribute('aria-label', 'Select Language');
        sel.style.cssText = 'margin-left:0.5rem;padding:0.3rem 0.5rem;border:1.5px solid rgba(13,92,46,0.25);border-radius:0.5rem;background:#fff;font-size:0.82rem;cursor:pointer;font-family:inherit;color:#1b5e34;outline:none;';

        LANGS.forEach(({ code, label }) => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = label;
            sel.appendChild(opt);
        });

        sel.value = getLang();

        sel.addEventListener('change', async function () {
            const lang = this.value;
            setLang(lang);
            showLoader(true);
            try {
                await applyTranslations(lang);
            } finally {
                showLoader(false);
            }
        });

        return sel;
    }

    /* ─── Inject selector into navbar ──────────────────── */
    function injectSelector() {
        // Try multiple navbar containers the project uses
        const navLinks = document.querySelector('.nav-links, .nav-inner, nav');
        if (!navLinks) return;
        if (navLinks.querySelector('.lang-select')) return;
        navLinks.appendChild(createSelector());
    }

    /* ─── MutationObserver for dynamic content ─────────── */
    let translateTimer = null;
    const obs = new MutationObserver((mutations) => {
        const lang = getLang();
        if (lang === 'en') return;
        // Debounce so rapid DOM changes don't spam the API
        clearTimeout(translateTimer);
        translateTimer = setTimeout(async () => {
            const added = [];
            mutations.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) added.push(n);
            }));
            if (!added.length) return;

            const cache = getCache(lang);
            for (const el of added) {
                if (SKIP_TAGS.has(el.tagName)) continue;
                const nodes = collectTextNodes(el);
                storeOriginals(nodes);
                const strings = nodes.map(n => getOriginalText(n).trim()).filter(Boolean);
                if (!strings.length) continue;
                await translateBatch(strings, lang, cache);
                nodes.forEach(n => {
                    const orig = getOriginalText(n).trim();
                    if (orig && cache[orig]) n.nodeValue = n.nodeValue.replace(orig, cache[orig]);
                });
            }
        }, 600);
    });

    /* ─── Init ─────────────────────────────────────────── */
    async function init() {
        injectSelector();
        obs.observe(document.body, { childList: true, subtree: true });

        const lang = getLang();
        if (lang !== 'en') {
            showLoader(true);
            try {
                await applyTranslations(lang);
            } finally {
                showLoader(false);
            }
        }
    }

    // Expose API
    window.i18n = { getLang, setLang, applyTranslations };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
