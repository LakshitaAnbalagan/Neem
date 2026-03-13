/**
 * payment.js (frontend) — Free UPI Payment with Verification
 * Anti-cheating: Buyer must provide UTR number + payment screenshot.
 * Supplier verifies payment before order proceeds.
 */

function loadQRLib() {
  return new Promise((resolve, reject) => {
    if (window.QRCode) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load QR library'));
    document.head.appendChild(s);
  });
}

function buildUpiUri({ upiId, payeeName, amount, orderId, note }) {
  const params = new URLSearchParams({
    pa: upiId, pn: payeeName, am: amount.toFixed(2), cu: 'INR',
    tn: note || `Neem Order #${orderId || ''}`,
    tr: orderId || Date.now().toString()
  });
  return 'upi://pay?' + params.toString();
}

function createPaymentModal() {
  if (document.getElementById('upiPaymentModal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'upiPaymentModal';
  overlay.innerHTML = `
    <div class="upi-modal-backdrop"></div>
    <div class="upi-modal-box">
      <button class="upi-modal-close" id="upiCloseBtn">&times;</button>

      <!-- Step 1: Pay -->
      <div id="upiStep1">
        <div class="upi-modal-header">
          <span style="font-size:2rem;">💳</span>
          <div>
            <h3 style="margin:0;font-size:1.15rem;font-weight:700;">Step 1: Pay via UPI</h3>
            <p style="margin:0;font-size:0.78rem;color:#6c757d;">Scan QR or tap to pay with any UPI app</p>
          </div>
        </div>

        <div class="upi-amount-display">
          <span style="color:#6c757d;font-size:0.85rem;">Total Amount</span>
          <span id="upiAmountText" style="font-size:1.75rem;font-weight:800;color:#1b5e34;">₹0</span>
        </div>

        <div class="upi-qr-wrap">
          <div id="upiQrCode"></div>
          <p style="font-size:0.78rem;color:#6c757d;margin-top:0.75rem;">Scan with any UPI app</p>
        </div>

        <div class="upi-apps-row">
          <a id="upiGpayLink" class="upi-app-btn" style="background:#4285F4;">
            <span style="font-size:1.2rem;">G</span><span>Google Pay</span>
          </a>
          <a id="upiPhonepeLink" class="upi-app-btn" style="background:#5f259f;">
            <span style="font-size:1.2rem;">📱</span><span>PhonePe</span>
          </a>
          <a id="upiPaytmLink" class="upi-app-btn" style="background:#00b9f5;">
            <span style="font-size:1.2rem;">P</span><span>Paytm</span>
          </a>
        </div>

        <div class="upi-or-divider"><span>or copy UPI ID</span></div>
        <div class="upi-id-display">
          <span id="upiIdText">supplier@upi</span>
          <button id="upiCopyBtn" class="upi-copy-btn">📋 Copy</button>
        </div>

        <button id="upiNextBtn" class="upi-confirm-btn" style="margin-top:1rem;">
          ✅ I have paid → Next: Enter Transaction Proof
        </button>
      </div>

      <!-- Step 2: Verify (anti-cheat) -->
      <div id="upiStep2" style="display:none;">
        <div class="upi-modal-header">
          <span style="font-size:2rem;">🔐</span>
          <div>
            <h3 style="margin:0;font-size:1.15rem;font-weight:700;">Step 2: Payment Proof</h3>
            <p style="margin:0;font-size:0.78rem;color:#6c757d;">Enter your UTR number &amp; upload screenshot to verify</p>
          </div>
        </div>

        <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:0.75rem;padding:0.75rem 1rem;margin-bottom:1rem;font-size:0.8rem;color:#7b6b1a;">
          ⚠️ <strong>Why is this needed?</strong> The supplier will verify your payment using the UTR number before processing your order. This prevents fraud.
        </div>

        <!-- UTR Number -->
        <div style="margin-bottom:1rem;">
          <label style="font-weight:600;font-size:0.88rem;display:block;margin-bottom:0.4rem;">
            UPI Transaction Reference (UTR) Number <span style="color:#e11d48;">*</span>
          </label>
          <input type="text" id="upiUtrInput" class="form-control" placeholder="e.g. 412345678901 (12 digits)"
            style="font-size:1rem;letter-spacing:1px;font-weight:600;text-align:center;" maxlength="30" required>
          <p style="font-size:0.72rem;color:#6c757d;margin-top:0.3rem;">
            📍 Find this in your UPI app → Payment History → Transaction Details → UTR/Ref No.
          </p>
        </div>

        <!-- Screenshot Upload -->
        <div style="margin-bottom:1rem;">
          <label style="font-weight:600;font-size:0.88rem;display:block;margin-bottom:0.4rem;">
            Payment Screenshot <span style="color:#e11d48;">*</span>
          </label>
          <div id="screenshotZone" style="border:2px dashed #c8d6c0;border-radius:0.75rem;padding:1.5rem;text-align:center;cursor:pointer;background:#f7faf5;transition:background 0.2s;">
            <input type="file" id="screenshotInput" accept="image/*" style="display:none">
            <div id="screenshotPrompt">
              <div style="font-size:2rem;margin-bottom:0.5rem;">📸</div>
              <p style="margin:0;font-size:0.82rem;color:#6c757d;">Click to upload payment screenshot</p>
            </div>
            <div id="screenshotPreview" style="display:none;">
              <img id="screenshotImg" src="" style="max-height:140px;border-radius:0.5rem;border:1px solid #e0e0e0;">
              <p id="screenshotName" style="font-size:0.72rem;color:#6c757d;margin-top:0.4rem;"></p>
            </div>
          </div>
        </div>

        <button id="upiConfirmBtn" class="upi-confirm-btn" disabled>
          📤 Submit Payment Proof
        </button>

        <p style="font-size:0.72rem;color:#999;text-align:center;margin-top:0.5rem;">
          🔒 Your supplier will verify the UTR number. Order will be processed after verification.
        </p>

        <button id="upiBackBtn" style="width:100%;margin-top:0.5rem;padding:0.5rem;background:none;border:1px solid #ddd;border-radius:0.5rem;cursor:pointer;font-size:0.82rem;color:#666;">
          ← Go back to QR code
        </button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #upiPaymentModal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;pointer-events:none;transition:opacity 0.3s}
    #upiPaymentModal.open{opacity:1;pointer-events:all}
    .upi-modal-backdrop{position:absolute;inset:0;background:rgba(10,46,26,0.55);backdrop-filter:blur(6px)}
    .upi-modal-box{position:relative;background:#fff;border-radius:1.5rem;padding:2rem 1.75rem;max-width:24rem;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(10,46,26,0.25);transform:scale(0.9) translateY(20px);transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1)}
    #upiPaymentModal.open .upi-modal-box{transform:scale(1) translateY(0)}
    .upi-modal-close{position:absolute;top:1rem;right:1rem;background:#f0f0f0;border:none;width:2rem;height:2rem;border-radius:50%;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;transition:all 0.2s;z-index:2}
    .upi-modal-close:hover{background:#e0e0e0;color:#333}
    .upi-modal-header{display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem}
    .upi-amount-display{text-align:center;padding:1rem;background:linear-gradient(135deg,#f0f7ec,#e8f5e1);border-radius:1rem;margin-bottom:1.25rem;display:flex;flex-direction:column;gap:0.25rem}
    .upi-qr-wrap{text-align:center;padding:0.75rem 0}
    .upi-qr-wrap canvas,.upi-qr-wrap img{border-radius:0.75rem;border:3px solid #e8f5e1}
    .upi-apps-row{display:flex;gap:0.5rem;margin:0.75rem 0}
    .upi-app-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:0.2rem;padding:0.55rem 0.4rem;border-radius:0.75rem;color:#fff;text-decoration:none;font-size:0.7rem;font-weight:600;transition:transform 0.2s;cursor:pointer}
    .upi-app-btn:hover{transform:scale(1.05);color:#fff}
    .upi-or-divider{text-align:center;color:#ccc;font-size:0.78rem;margin:0.5rem 0;position:relative}
    .upi-or-divider::before,.upi-or-divider::after{content:'';position:absolute;top:50%;width:30%;height:1px;background:#e0e0e0}
    .upi-or-divider::before{left:0}.upi-or-divider::after{right:0}
    .upi-id-display{display:flex;align-items:center;justify-content:center;gap:0.5rem;background:#f8f8f8;padding:0.5rem 1rem;border-radius:0.75rem}
    .upi-id-display span:first-child{font-weight:700;font-size:0.92rem;color:#1b5e34}
    .upi-copy-btn{background:#e8f5e1;border:none;padding:0.25rem 0.5rem;border-radius:0.5rem;font-size:0.75rem;cursor:pointer;color:#1b5e34;font-weight:600;transition:background 0.2s}
    .upi-copy-btn:hover{background:#d4edda}
    .upi-confirm-btn{width:100%;padding:0.8rem;background:linear-gradient(135deg,#1b5e34,#2d7a4a);color:#fff;border:none;border-radius:0.75rem;font-size:0.95rem;font-weight:700;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s}
    .upi-confirm-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 16px rgba(27,94,52,0.3)}
    .upi-confirm-btn:disabled{opacity:0.5;cursor:not-allowed}
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);
}

/* ─── Main entry point ───────────────────────────────────── */
async function initiatePayment({ amount, orderId, productName, upiId, payeeName, onSuccess, onFailure }) {
  try {
    await loadQRLib();
    createPaymentModal();

    const modal = document.getElementById('upiPaymentModal');
    const receiverUpi = upiId || 'neemproject@ybl';
    const receiverName = payeeName || 'Neem Sourcing';

    const uri = buildUpiUri({
      upiId: receiverUpi, payeeName: receiverName, amount, orderId,
      note: productName ? `Payment for ${productName}` : undefined
    });

    // Reset to step 1
    document.getElementById('upiStep1').style.display = '';
    document.getElementById('upiStep2').style.display = 'none';

    // Amount
    document.getElementById('upiAmountText').textContent = '₹' + Number(amount).toLocaleString('en-IN');

    // QR Code
    const qrWrap = document.getElementById('upiQrCode');
    qrWrap.innerHTML = '';
    new QRCode(qrWrap, { text: uri, width: 180, height: 180, colorDark: '#1b5e34', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });

    // Deep links
    document.getElementById('upiGpayLink').href = uri;
    document.getElementById('upiPhonepeLink').href = uri;
    document.getElementById('upiPaytmLink').href = uri;

    // UPI ID
    document.getElementById('upiIdText').textContent = receiverUpi;

    // Copy btn
    document.getElementById('upiCopyBtn').onclick = () => {
      navigator.clipboard.writeText(receiverUpi).then(() => {
        const btn = document.getElementById('upiCopyBtn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
      });
    };

    // Close modal
    document.getElementById('upiCloseBtn').onclick = () => {
      modal.classList.remove('open');
      if (typeof onFailure === 'function') onFailure(new Error('Payment cancelled by user'));
    };

    // Step 1 → Step 2
    document.getElementById('upiNextBtn').onclick = () => {
      document.getElementById('upiStep1').style.display = 'none';
      document.getElementById('upiStep2').style.display = '';
      // Reset step 2
      document.getElementById('upiUtrInput').value = '';
      document.getElementById('screenshotInput').value = '';
      document.getElementById('screenshotPrompt').style.display = '';
      document.getElementById('screenshotPreview').style.display = 'none';
      document.getElementById('upiConfirmBtn').disabled = true;
    };

    // Step 2 → Back to Step 1
    document.getElementById('upiBackBtn').onclick = () => {
      document.getElementById('upiStep2').style.display = 'none';
      document.getElementById('upiStep1').style.display = '';
    };

    // Screenshot upload
    const screenshotZone = document.getElementById('screenshotZone');
    const screenshotInput = document.getElementById('screenshotInput');
    let screenshotBase64 = null;

    screenshotZone.onclick = () => screenshotInput.click();
    screenshotInput.onchange = () => {
      const file = screenshotInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        screenshotBase64 = e.target.result;
        document.getElementById('screenshotImg').src = screenshotBase64;
        document.getElementById('screenshotName').textContent = file.name + ' · ' + (file.size / 1024).toFixed(0) + ' KB';
        document.getElementById('screenshotPrompt').style.display = 'none';
        document.getElementById('screenshotPreview').style.display = '';
        validateStep2();
      };
      reader.readAsDataURL(file);
    };

    // UTR input validation
    const utrInput = document.getElementById('upiUtrInput');
    utrInput.oninput = validateStep2;

    function validateStep2() {
      const utr = utrInput.value.trim();
      const hasScreenshot = !!screenshotBase64;
      // UTR must be at least 8 chars (some banks use shorter refs)
      document.getElementById('upiConfirmBtn').disabled = !(utr.length >= 8 && hasScreenshot);
    }

    // Submit proof
    document.getElementById('upiConfirmBtn').onclick = async () => {
      const btn = document.getElementById('upiConfirmBtn');
      const utr = utrInput.value.trim();

      if (utr.length < 8) { alert('Please enter a valid UTR/reference number (at least 8 characters).'); return; }
      if (!screenshotBase64) { alert('Please upload your payment screenshot.'); return; }

      btn.disabled = true;
      btn.textContent = '⏳ Submitting proof…';

      try {
        const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('ns_token');
        const res = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            orderId,
            amount,
            utrNumber: utr,
            paymentScreenshot: screenshotBase64
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Submission failed');

        modal.classList.remove('open');
        if (typeof onSuccess === 'function') onSuccess(utr);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = '📤 Submit Payment Proof';
        alert('Error: ' + e.message);
      }
    };

    modal.classList.add('open');
  } catch (err) {
    if (typeof onFailure === 'function') onFailure(err);
  }
}

window.initiatePayment = initiatePayment;
