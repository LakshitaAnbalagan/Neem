/**
 * voice-search.js
 * Adds a microphone button to the search bar on products.html.
 * Uses Web Speech API — no backend, no API key needed.
 * Automatically uses the selected i18n language for recognition.
 */
(function () {
    'use strict';

    // Map i18n lang codes → BCP-47 locale codes for SpeechRecognition
    const LANG_MAP = {
        en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
        kn: 'kn-IN', ml: 'ml-IN', bn: 'bn-IN', mr: 'mr-IN',
        gu: 'gu-IN', pa: 'pa-IN'
    };

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // Browser doesn't support — silently skip

    function getLang() {
        const l = localStorage.getItem('ns_lang') || 'en';
        return LANG_MAP[l] || 'en-IN';
    }

    function init() {
        const searchInput = document.getElementById('search');
        if (!searchInput) return;

        // Create mic button
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'voiceMicBtn';
        btn.title = 'Search by voice';
        btn.innerHTML = '🎙️';
        btn.style.cssText = [
            'position:absolute', 'right:0.5rem', 'top:50%', 'transform:translateY(-50%)',
            'background:none', 'border:none', 'font-size:1.25rem', 'cursor:pointer',
            'padding:0.25rem 0.4rem', 'border-radius:50%', 'transition:background 0.2s',
            'line-height:1', 'z-index:5'
        ].join(';');

        // Wrap search input in relative container
        const wrapper = searchInput.parentElement;
        wrapper.style.position = 'relative';
        searchInput.style.paddingRight = '2.5rem';
        wrapper.appendChild(btn);

        // Pulse animation when active
        const style = document.createElement('style');
        style.textContent = `
      #voiceMicBtn.listening {
        background: rgba(220,38,38,0.12) !important;
        animation: mic-pulse 0.9s ease-in-out infinite;
      }
      @keyframes mic-pulse {
        0%,100% { transform: translateY(-50%) scale(1); }
        50%      { transform: translateY(-50%) scale(1.2); }
      }
      #voice-status {
        position:absolute; bottom:-1.5rem; left:0; font-size:0.75rem;
        color:#e11d48; font-weight:500; white-space:nowrap;
      }
    `;
        document.head.appendChild(style);

        const recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        let listening = false;
        let statusEl = null;

        function showStatus(msg) {
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.id = 'voice-status';
                wrapper.appendChild(statusEl);
            }
            statusEl.textContent = msg;
        }
        function hideStatus() {
            if (statusEl) { statusEl.textContent = ''; }
        }

        recognition.onstart = () => {
            listening = true;
            btn.classList.add('listening');
            btn.innerHTML = '🔴';
            showStatus('Listening… speak now');
        };

        recognition.onresult = (e) => {
            let interim = '', final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += t;
                else interim += t;
            }
            searchInput.value = final || interim;
            if (final) showStatus('✓ Got it!');
        };

        recognition.onend = () => {
            listening = false;
            btn.classList.remove('listening');
            btn.innerHTML = '🎙️';
            setTimeout(hideStatus, 1500);
            // Auto-trigger search after voice input
            const searchBtn = document.getElementById('btnSearch');
            if (searchInput.value.trim() && searchBtn) searchBtn.click();
        };

        recognition.onerror = (e) => {
            btn.classList.remove('listening');
            btn.innerHTML = '🎙️';
            const msgs = {
                'not-allowed': '⚠️ Mic permission denied',
                'no-speech': '⚠️ No speech detected',
                'network': '⚠️ Network error'
            };
            showStatus(msgs[e.error] || '⚠️ Voice error');
            setTimeout(hideStatus, 3000);
        };

        btn.addEventListener('click', () => {
            if (listening) {
                recognition.stop();
            } else {
                recognition.lang = getLang();
                recognition.start();
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
