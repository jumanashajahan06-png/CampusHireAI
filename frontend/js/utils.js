/* ============================================================
   utils.js — Shared utilities used across all pages
   - API calls (fetch wrapper)
   - Auth token management (localStorage)
   - Toast notifications
   - Auth guard (redirect if not logged in)
   ============================================================ */

// Base URL for the backend API (change in production)
const API_BASE = 'http://localhost:3000/api';

/* ── Auth token helpers ─────────────────────────────────── */

/** Save JWT token after login/signup */
function saveToken(token) {
  localStorage.setItem('ch_token', token);
}

/** Get the stored JWT token */
function getToken() {
  return localStorage.getItem('ch_token');
}

/** Remove token on logout */
function clearToken() {
  localStorage.removeItem('ch_token');
  localStorage.removeItem('ch_user');
}

/** Save user info to localStorage */
function saveUser(user) {
  localStorage.setItem('ch_user', JSON.stringify(user));
}

/** Get current user from localStorage */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem('ch_user'));
  } catch {
    return null;
  }
}

/** Check if user is logged in */
function isLoggedIn() {
  return !!getToken();
}

/* ── Auth guard ─────────────────────────────────────────── */

/**
 * Call this at the top of any protected page.
 * Redirects to login if not authenticated.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Redirect logged-in users away from auth pages.
 * Call on login.html and signup.html.
 */
function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
}

/* ── API fetch wrapper ──────────────────────────────────── */

/**
 * Makes an authenticated API request.
 * Automatically adds Authorization header with JWT token.
 *
 * @param {string} endpoint - e.g. '/applications'
 * @param {object} options  - fetch options (method, body, etc.)
 * @returns {Promise<any>}  - parsed JSON response
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  };

  // Convert body object to JSON string if needed
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    // If 401 Unauthorized, token is expired → logout
    if (response.status === 401) {
      clearToken();
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/* ── Toast notifications ─────────────────────────────────── */

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideInToast 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Logout ──────────────────────────────────────────────── */

/** Log out and redirect to landing page */
function logout() {
  clearToken();
  window.location.href = 'index.html';
}

/** Attach logout handler to elements with id="logoutBtn" or id="sidebarLogout" */
function setupLogoutHandlers() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const sidebarLogout = document.getElementById('sidebarLogout');
  if (sidebarLogout) sidebarLogout.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

/* ── Display user name in nav ─────────────────────────────── */

function displayUserName() {
  const user = getUser();
  const display = document.getElementById('userNameDisplay');
  if (display && user) {
    // Show first name only
    const firstName = (user.name || user.email || '').split(' ')[0];
    display.textContent = `Hi, ${firstName}`;
  }
}

/* ── Mobile nav toggle ──────────────────────────────────── */

function setupNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
}

/* ── Date formatting helpers ─────────────────────────────── */

/** Format a date string as "Jan 15, 2025" */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Get days until a deadline (negative = overdue) */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

/** Get initials from company name for avatar */
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Run shared setup on every page ─────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupNavToggle();
  setupLogoutHandlers();
  displayUserName();
});