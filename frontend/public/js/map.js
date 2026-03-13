const user = getUser();
if (!user || !getToken()) location.href = 'login.html';

document.getElementById('navBrand').href = user.role === 'shop' ? 'dashboard-shop.html' : 'dashboard-supplier.html';
document.getElementById('navDashboard').href = user.role === 'shop' ? 'dashboard-shop.html' : 'dashboard-supplier.html';
document.getElementById('navDashboard').textContent = 'Dashboard';
document.getElementById('logoutBtn').onclick = () => { clearAuth(); location.href = 'index.html'; };

let map;
let markers = [];
let suppliersWithCoords = [];

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function init() {
  const listEl = document.getElementById('supplierList');
  const mapEl = document.getElementById('map');

  try {
    const suppliers = await api('/api/users/suppliers');
    if (!suppliers.length) {
      listEl.innerHTML = '<p class="text-muted mb-0">No suppliers registered yet.</p>';
      initMapBlank(mapEl);
      return;
    }

    suppliersWithCoords = suppliers.filter(s => {
      const c = s.coordinates;
      return c && c.length >= 2 && (c[0] !== 0 || c[1] !== 0);
    });

    listEl.innerHTML = suppliers.map((s, index) => {
      const name = s.businessName || s.name || 'Supplier';
      const trust = s.trustScore ?? 50;
      const tc = trust >= 70 ? 'high' : trust >= 40 ? 'mid' : 'low';
      const hasLoc = s.coordinates && s.coordinates.length >= 2 && (s.coordinates[0] !== 0 || s.coordinates[1] !== 0);
      const markerIndex = hasLoc ? suppliersWithCoords.findIndex(sup => sup._id === s._id) : -1;
      return `<div class="supplier-list-item d-flex justify-content-between align-items-center mb-2 pb-2" style="border-bottom: 1px solid var(--border);" data-supplier-id="${escapeHtml(s._id)}" data-marker-index="${markerIndex}">
        <div class="flex-grow-1">
          <strong>${escapeHtml(name)}</strong>
          ${s.address ? `<div class="text-small text-muted">${escapeHtml(s.address)}</div>` : ''}
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="trust-badge ${tc}">★ ${trust}</span>
          <a href="chat.html?with=${escapeHtml(s._id)}" class="btn btn-sm btn-outline">Chat</a>
        </div>
      </div>`;
    }).join('');

    map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const bounds = [];
    suppliersWithCoords.forEach((s, index) => {
      const coords = s.coordinates;
      const lat = coords[1], lng = coords[0];
      const name = s.businessName || s.name || 'Supplier';
      const trust = s.trustScore ?? 50;
      const popupContent = `<div class="map-popup">
        <strong>${escapeHtml(name)}</strong>
        ${s.address ? `<div class="text-small text-muted">${escapeHtml(s.address)}</div>` : ''}
        <div class="mt-2"><span class="trust-badge ${trust >= 70 ? 'high' : trust >= 40 ? 'mid' : 'low'}">★ ${trust}</span></div>
        <a href="chat.html?with=${escapeHtml(s._id)}" class="btn btn-sm btn-primary mt-2 w-100">Message supplier</a>
      </div>`;
      const m = L.marker([lat, lng]).addTo(map);
      m.bindPopup(popupContent, { minWidth: 220 });
      m._supplierIndex = index;
      markers.push(m);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }

    listEl.querySelectorAll('.supplier-list-item').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.getAttribute('href').startsWith('chat')) return;
        const markerIndex = parseInt(el.getAttribute('data-marker-index'), 10);
        if (markerIndex >= 0 && markers[markerIndex]) {
          const m = markers[markerIndex];
          map.setView(m.getLatLng(), Math.max(map.getZoom(), 10));
          m.openPopup();
        }
      });
    });
  } catch (e) {
    listEl.innerHTML = '<p class="text-danger">Could not load suppliers. Check your connection and try again.</p>';
    initMapBlank(mapEl);
  }
}

function initMapBlank(mapEl) {
  if (typeof L === 'undefined') return;
  if (!document.getElementById('map')) return;
  map = L.map('map').setView([20.5937, 78.9629], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

init();
