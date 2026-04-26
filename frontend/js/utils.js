/* ============================================================
   utils.js — Shared utilities (Phase 7: final polish)
   ============================================================ */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : '/api';

// ── Auth helpers ─────────────────────────────────────────────
function saveToken(token)  { localStorage.setItem('ch_token', token); }
function getToken()        { return localStorage.getItem('ch_token'); }
function clearToken()      { localStorage.removeItem('ch_token'); localStorage.removeItem('ch_user'); }
function saveUser(user)    { localStorage.setItem('ch_user', JSON.stringify(user)); }
function getUser()         { try { return JSON.parse(localStorage.getItem('ch_user')); } catch { return null; } }
function isLoggedIn()      { return !!getToken(); }

function requireAuth() {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
  return true;
}
function redirectIfLoggedIn() {
  if (isLoggedIn()) window.location.href = 'dashboard.html';
}

// ── API fetch ────────────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  };
  if (options.body) config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch {
    throw new Error('Cannot reach the server. Make sure it is running on port 3000.');
  }

  if (response.status === 401) { clearToken(); window.location.href = 'login.html'; return; }

  let data;
  try { data = await response.json(); } catch { throw new Error(`Server error (${response.status})`); }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

// ── Auth actions ─────────────────────────────────────────────
function logout() { clearToken(); window.location.href = 'index.html'; }

function setupLogoutHandlers() {
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('sidebarLogout')?.addEventListener('click', e => { e.preventDefault(); logout(); });
}

function displayUserName() {
  const user = getUser();
  const el   = document.getElementById('userNameDisplay');
  if (el && user) el.textContent = `Hi, ${(user.name || user.email || '').split(' ')[0]}`;
}

// ── Mobile nav ───────────────────────────────────────────────
function setupNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));

  // Close nav when clicking a link on mobile
  links?.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => links.classList.remove('open'))
  );
}

// ── Toasts ───────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Icon prefix per type
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span style="margin-right:0.5rem">${icons[type] || ''}</span>${escapeHtml(message)}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(110%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

// ── Loading button ────────────────────────────────────────────
function setLoading(btn, text = '') {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = text ? `<span class="spinner"></span> ${text}` : '<span class="spinner"></span>';
  return () => { btn.disabled = false; btn.innerHTML = original; };
}

// ── Formatting helpers ────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const tgt = new Date(dateStr); tgt.setHours(0,0,0,0);
  return Math.round((tgt - now) / 86_400_000);
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}

// ── Confirm dialog (replaces native confirm()) ───────────────
function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:360px;text-align:center">
        <p style="margin-bottom:1.5rem;font-size:0.9rem;color:var(--text)">${escapeHtml(message)}</p>
        <div style="display:flex;gap:0.75rem;justify-content:center">
          <button class="btn btn-ghost" id="cfmNo">Cancel</button>
          <button class="btn btn-danger" id="cfmYes">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cfmYes').addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.querySelector('#cfmNo').addEventListener('click',  () => { overlay.remove(); resolve(false); });
  });
}

// ── Back-to-top button ────────────────────────────────────────
function setupBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () =>
    btn.classList.toggle('visible', window.scrollY > 400)
  , { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── Page init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavToggle();
  setupLogoutHandlers();
  displayUserName();
  setupBackToTop();

  // Animate page sections into view on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.observe-fade').forEach(el => observer.observe(el));
});