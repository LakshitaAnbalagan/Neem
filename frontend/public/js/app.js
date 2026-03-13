// Determine API base: if frontend is served from a different port (e.g. 5000
// for static dev), point API requests to the backend on port 3000 by default.
const API_BASE = (function () {
  if (window.__API_BASE__) return window.__API_BASE__;
  try {
    const port = window.location.port;
    if (port && port !== '3000') return 'http://localhost:3000';
  } catch (e) {}
  return window.location.origin;
})();

function getToken() {
  return localStorage.getItem('neem_token');
}

function getUser() {
  try {
    const u = localStorage.getItem('neem_user');
    return u ? JSON.parse(u) : null;
  } catch (_) {
    return null;
  }
}

function setAuth(user, token) {
  localStorage.setItem('neem_user', JSON.stringify(user));
  localStorage.setItem('neem_token', token);
}

function clearAuth() {
  localStorage.removeItem('neem_user');
  localStorage.removeItem('neem_token');
}

function isLoggedIn() {
  return !!getToken();
}

function requireAuth(role) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html' + (role ? '?role=' + role : '');
    return false;
  }
  const user = getUser();
  if (role && user && user.role !== role) {
    window.location.href = user.role === 'shop' ? 'dashboard-shop.html' : 'dashboard-supplier.html';
    return false;
  }
  return true;
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data;
}

function trustClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getSeasonalTip(month) {
  const tips = {
    1: 'Winter: Neem leaves less abundant; kernel/oil focus.',
    2: 'Winter: Plan ahead for spring harvest.',
    3: 'Spring: New leaf growth; good for leaf-based sourcing.',
    4: 'Spring: Peak planning for summer harvest.',
    5: 'Summer: High neem availability in many regions.',
    6: 'Summer: Peak season for seeds and kernels.',
    7: 'Monsoon: Harvest season; bulk availability.',
    8: 'Monsoon: Best time for seed collection.',
    9: 'Monsoon: Post-monsoon quality checks.',
    10: 'Autumn: Good availability; plan winter stocks.',
    11: 'Autumn: Year-end procurement window.',
    12: 'Winter: Secure stocks for early next year.'
  };
  return tips[month] || 'Check supplier listings for current availability.';
}

function currentSeasonMonth() {
  return new Date().getMonth() + 1;
}
