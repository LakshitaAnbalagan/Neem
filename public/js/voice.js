(function () {
  let recognition = null;
  let isListening = false;

  window.initVoice = function (opts) {
    const inputEl = opts.inputEl;
    const statusEl = opts.statusEl;
    const buttonEl = opts.buttonEl;
    if (!inputEl || !buttonEl) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (statusEl) statusEl.textContent = 'Voice input is not supported in this browser. Try Chrome or Edge.';
      buttonEl.disabled = true;
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onresult = function (e) {
      const transcript = (e.results[0] && e.results[0][0]) ? e.results[0][0].transcript : '';
      if (transcript) inputEl.value = (inputEl.value ? inputEl.value + ' ' : '') + transcript;
      setStatus('');
      buttonEl.classList.remove('recording');
      isListening = false;
    };

    recognition.onerror = function (e) {
      setStatus(e.error === 'no-speech' ? 'No speech heard. Try again.' : 'Voice input failed.');
      buttonEl.classList.remove('recording');
      isListening = false;
    };

    recognition.onend = function () {
      if (isListening) {
        try { recognition.start(); } catch (_) {}
      } else {
        buttonEl.classList.remove('recording');
      }
    };

    function setStatus(t) {
      if (statusEl) statusEl.textContent = t;
    }

    buttonEl.onclick = function () {
      if (isListening) {
        recognition.stop();
        isListening = false;
        buttonEl.classList.remove('recording');
        setStatus('');
        return;
      }
      try {
        recognition.start();
        isListening = true;
        buttonEl.classList.add('recording');
        setStatus('Listening… Speak your sourcing request.');
      } catch (err) {
        setStatus('Could not start voice input.');
      }
    };
  };
})();
