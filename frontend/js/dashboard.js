/* ============================================================
   dashboard.js — Dashboard page logic
   - Loads application stats from API (or localStorage fallback)
   - Renders recent applications list
   - Shows upcoming deadlines
   - Animates status bars
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Protect this page — redirect to login if not authenticated
  if (!requireAuth()) return;

  // Set greeting name from stored user
  const user = getUser();
  if (user) {
    const greetEl = document.getElementById('greeting-name');
    if (greetEl) greetEl.textContent = (user.name || 'there').split(' ')[0];
  }

  // Load and render dashboard data
  await loadDashboard();
});

/* ── Main loader ─────────────────────────────────────────── */

async function loadDashboard() {
  try {
    // Fetch all applications from the backend
    const data = await apiRequest('/applications');
    const applications = data.applications || [];

    renderStats(applications);
    renderRecentApplications(applications);
    renderDeadlines(applications);
    renderStatusBars(applications);

  } catch (err) {
    // If API not yet connected, show demo data
    console.warn('API not available, using demo data:', err.message);
    const demoApps = getDemoApplications();
    renderStats(demoApps);
    renderRecentApplications(demoApps);
    renderDeadlines(demoApps);
    renderStatusBars(demoApps);
  }
}

/* ── Stats Cards ─────────────────────────────────────────── */

function renderStats(apps) {
  const total     = apps.length;
  const interview = apps.filter(a => a.status === 'Interview').length;
  const offer     = apps.filter(a => a.status === 'Offer').length;
  const rejected  = apps.filter(a => a.status === 'Rejected').length;

  // Success rate = offers / total (excluding still-pending)
  const rate = total > 0 ? Math.round((offer / total) * 100) : 0;

  // Animate numbers counting up
  animateCount('stat-total',    total);
  animateCount('stat-interview', interview);
  animateCount('stat-offer',    offer);
  animateCount('stat-rejected', rejected);

  const rateEl = document.getElementById('stat-rate');
  if (rateEl) rateEl.textContent = rate + '%';
}

/** Animate a number counting up from 0 */
function animateCount(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let current = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

/* ── Recent Applications ─────────────────────────────────── */

function renderRecentApplications(apps) {
  const container = document.getElementById('recentAppsList');
  if (!container) return;

  // Sort by date applied, show latest 5
  const recent = [...apps]
    .sort((a, b) => new Date(b.dateApplied || b.createdAt) - new Date(a.dateApplied || a.createdAt))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No applications yet</h3>
        <p>Start tracking your job applications</p>
        <a href="applications.html" class="btn btn-primary btn-sm" style="margin-top:1rem">
          Add your first application
        </a>
      </div>`;
    return;
  }

  container.innerHTML = recent.map(app => `
    <div class="app-list-item">
      <div class="app-company-logo">${getInitials(app.company)}</div>
      <div class="app-info">
        <div class="company">${escapeHtml(app.company)}</div>
        <div class="role">${escapeHtml(app.role)}</div>
      </div>
      <div class="app-meta">
        <span class="badge badge-${app.status.toLowerCase()}">${app.status}</span>
        <div class="date">${formatDate(app.dateApplied)}</div>
      </div>
    </div>
  `).join('');
}

/* ── Upcoming Deadlines ──────────────────────────────────── */

function renderDeadlines(apps) {
  const container = document.getElementById('deadlineList');
  if (!container) return;

  const now = new Date();

  // Filter apps with future deadlines, sort by soonest
  const upcoming = apps
    .filter(a => a.deadline && new Date(a.deadline) >= now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  if (upcoming.length === 0) {
    container.innerHTML = `<div style="padding:0.5rem 0; color:var(--text-dim); font-size:0.8rem; text-align:center">No upcoming deadlines 🎉</div>`;
    return;
  }

  container.innerHTML = `<div class="deadline-list">` +
    upcoming.map(app => {
      const days = daysUntil(app.deadline);
      let dotClass = 'normal';
      if (days <= 3)       dotClass = 'urgent';
      else if (days <= 7)  dotClass = 'soon';

      const daysText = days === 0 ? 'Today!' :
                       days === 1 ? 'Tomorrow' :
                       `${days} days`;

      return `
        <div class="deadline-item">
          <div class="deadline-dot ${dotClass}"></div>
          <div>
            <div class="dl-company">${escapeHtml(app.company)}</div>
            <div class="dl-role">${escapeHtml(app.role)}</div>
            <div class="dl-date">⏰ ${daysText} — ${formatDate(app.deadline)}</div>
          </div>
        </div>`;
    }).join('') + `</div>`;
}

/* ── Status Breakdown Bars ───────────────────────────────── */

function renderStatusBars(apps) {
  const total = apps.length;
  if (total === 0) return;

  const counts = {
    applied:   apps.filter(a => a.status === 'Applied').length,
    interview: apps.filter(a => a.status === 'Interview').length,
    offer:     apps.filter(a => a.status === 'Offer').length,
    rejected:  apps.filter(a => a.status === 'Rejected').length,
  };

  // Update count labels
  Object.keys(counts).forEach(key => {
    const countEl = document.getElementById(`count-${key}`);
    if (countEl) countEl.textContent = counts[key];
  });

  // Animate bar widths after a short delay
  setTimeout(() => {
    Object.keys(counts).forEach(key => {
      const bar = document.getElementById(`bar-${key}`);
      if (bar) bar.style.width = `${(counts[key] / total) * 100}%`;
    });
  }, 200);
}

/* ── Demo data (used before API is connected) ────────────── */

function getDemoApplications() {
  return [
    { company: 'Google',    role: 'SWE Intern',       status: 'Interview', dateApplied: '2025-01-10', deadline: '2025-02-15' },
    { company: 'Microsoft', role: 'Product Intern',   status: 'Applied',   dateApplied: '2025-01-12', deadline: '2025-02-20' },
    { company: 'Stripe',    role: 'Backend Intern',   status: 'Applied',   dateApplied: '2025-01-14', deadline: null },
    { company: 'Notion',    role: 'Design Intern',    status: 'Rejected',  dateApplied: '2025-01-05', deadline: null },
    { company: 'Figma',     role: 'Frontend Intern',  status: 'Offer',     dateApplied: '2024-12-20', deadline: null },
    { company: 'Airbnb',    role: 'Data Intern',      status: 'Applied',   dateApplied: '2025-01-16', deadline: '2025-01-28' },
  ];
}

/* ── XSS protection helper ───────────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}