/* ============================================================
   applications.js — Application Tracker CRUD
   - Load and render applications table
   - Add / Edit / Delete applications
   - Search and filter functionality
   ============================================================ */

// State: holds the current list and active filters
let allApplications = [];
let currentFilter   = 'all';
let currentSearch   = '';
let currentSort     = 'date-desc';
let deleteTargetId  = null; // ID of app being deleted

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  await loadApplications();
  setupEventListeners();
});

/* ── Load applications from API ──────────────────────────── */

async function loadApplications() {
  try {
    const data = await apiRequest('/applications');
    allApplications = data.applications || [];
  } catch (err) {
    console.warn('Using demo data:', err.message);
    allApplications = getDemoApplications();
  }
  renderTable();
}

/* ── Render Table ────────────────────────────────────────── */

function renderTable() {
  const tbody     = document.getElementById('appsTableBody');
  const emptyState = document.getElementById('emptyState');
  if (!tbody) return;

  // Apply search filter
  let filtered = allApplications.filter(app => {
    const matchSearch = !currentSearch ||
      app.company.toLowerCase().includes(currentSearch) ||
      app.role.toLowerCase().includes(currentSearch);
    const matchStatus = currentFilter === 'all' || app.status === currentFilter;
    return matchSearch && matchStatus;
  });

  // Apply sort
  filtered = sortApplications(filtered, currentSort);

  // Show/hide empty state
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  // Build table rows
  tbody.innerHTML = filtered.map(app => {
    const days = daysUntil(app.deadline);
    const deadlineText = app.deadline
      ? `<span style="color:${days <= 3 ? 'var(--red)' : days <= 7 ? 'var(--yellow)' : 'var(--text-muted)'}">${formatDate(app.deadline)}</span>`
      : '<span style="color:var(--text-dim)">—</span>';

    return `
      <tr data-id="${app._id || app.id}">
        <td>
          <div class="company-cell">
            <div class="company-avatar">${getInitials(app.company)}</div>
            <div>
              <div class="company-name">${escapeHtml(app.company)}</div>
              <div class="company-location">${escapeHtml(app.role)}${app.jobType ? ` · ${app.jobType}` : ''}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-${app.status.toLowerCase()}">${app.status}</span></td>
        <td style="color:var(--text-muted); font-size:0.85rem">${formatDate(app.dateApplied)}</td>
        <td>${deadlineText}</td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-ghost btn-sm edit-btn" data-id="${app._id || app.id}" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${app._id || app.id}" data-company="${escapeHtml(app.company)}" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Attach row click handlers (to open edit on row click)
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't open edit if clicking action buttons
      if (e.target.closest('.actions-cell')) return;
      const id = row.dataset.id;
      openEditModal(id);
    });
  });
}

function sortApplications(apps, sortBy) {
  return [...apps].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.dateApplied || b.createdAt) - new Date(a.dateApplied || a.createdAt);
    if (sortBy === 'date-asc')  return new Date(a.dateApplied || a.createdAt) - new Date(b.dateApplied || b.createdAt);
    if (sortBy === 'company')   return a.company.localeCompare(b.company);
    if (sortBy === 'deadline')  return new Date(a.deadline || '9999') - new Date(b.deadline || '9999');
    return 0;
  });
}

/* ── Event Listeners ─────────────────────────────────────── */

function setupEventListeners() {
  // Add Application button
  document.getElementById('addAppBtn')?.addEventListener('click', openAddModal);
  document.getElementById('emptyAddBtn')?.addEventListener('click', openAddModal);

  // Modal close buttons
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);

  // Close modal when clicking overlay background
  document.getElementById('appModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'appModal') closeModal();
  });

  // App form submission (Add/Edit)
  document.getElementById('appForm')?.addEventListener('submit', handleSaveApplication);

  // Search input
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    renderTable();
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.status;
      renderTable();
    });
  });

  // Sort dropdown
  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderTable();
  });

  // Edit buttons (delegated from table body)
  document.getElementById('appsTableBody')?.addEventListener('click', (e) => {
    const editBtn   = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn)   openEditModal(editBtn.dataset.id);
    if (deleteBtn) openDeleteModal(deleteBtn.dataset.id, deleteBtn.dataset.company);
  });

  // Delete modal buttons
  document.getElementById('deleteCancelBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleDeleteApplication);
  document.getElementById('deleteModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'deleteModal') closeDeleteModal();
  });
}

/* ── Modal: Add Application ──────────────────────────────── */

function openAddModal() {
  // Reset form
  document.getElementById('appForm').reset();
  document.getElementById('appId').value = '';
  document.getElementById('modalTitle').textContent = 'Add Application';
  document.getElementById('saveAppBtn').textContent = 'Save Application';

  // Set today's date as default
  document.getElementById('dateApplied').value = new Date().toISOString().split('T')[0];

  openModal('appModal');
}

/* ── Modal: Edit Application ─────────────────────────────── */

function openEditModal(id) {
  const app = allApplications.find(a => (a._id || a.id) === id);
  if (!app) return;

  // Populate form with existing data
  document.getElementById('appId').value          = id;
  document.getElementById('company').value         = app.company || '';
  document.getElementById('role').value            = app.role || '';
  document.getElementById('status').value          = app.status || 'Applied';
  document.getElementById('jobType').value         = app.jobType || 'Internship';
  document.getElementById('dateApplied').value     = app.dateApplied ? app.dateApplied.split('T')[0] : '';
  document.getElementById('deadline').value        = app.deadline ? app.deadline.split('T')[0] : '';
  document.getElementById('location').value        = app.location || '';
  document.getElementById('notes').value           = app.notes || '';

  document.getElementById('modalTitle').textContent = 'Edit Application';
  document.getElementById('saveAppBtn').textContent = 'Update Application';

  openModal('appModal');
}

/* ── Save Application (Add or Edit) ─────────────────────── */

async function handleSaveApplication(e) {
  e.preventDefault();

  const id      = document.getElementById('appId').value;
  const isEdit  = !!id;
  const saveBtn = document.getElementById('saveAppBtn');

  const payload = {
    company:     document.getElementById('company').value.trim(),
    role:        document.getElementById('role').value.trim(),
    status:      document.getElementById('status').value,
    jobType:     document.getElementById('jobType').value,
    dateApplied: document.getElementById('dateApplied').value,
    deadline:    document.getElementById('deadline').value || null,
    location:    document.getElementById('location').value.trim(),
    notes:       document.getElementById('notes').value.trim(),
  };

  if (!payload.company || !payload.role) {
    showToast('Company and Role are required', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span>';

  try {
    if (isEdit) {
      // Update existing
      await apiRequest(`/applications/${id}`, { method: 'PUT', body: payload });
      // Update local state
      const idx = allApplications.findIndex(a => (a._id || a.id) === id);
      if (idx > -1) allApplications[idx] = { ...allApplications[idx], ...payload };
      showToast('Application updated ✅', 'success');
    } else {
      // Create new
      const data = await apiRequest('/applications', { method: 'POST', body: payload });
      allApplications.unshift(data.application || { ...payload, _id: Date.now().toString() });
      showToast('Application added ✅', 'success');
    }

    closeModal();
    renderTable();

  } catch (err) {
    showToast(err.message || 'Failed to save', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = isEdit ? 'Update Application' : 'Save Application';
  }
}

/* ── Delete Application ──────────────────────────────────── */

function openDeleteModal(id, companyName) {
  deleteTargetId = id;
  document.getElementById('deleteCompanyName').textContent = companyName;
  openModal('deleteModal');
}

function closeDeleteModal() {
  deleteTargetId = null;
  closeModal('deleteModal');
}

async function handleDeleteApplication() {
  if (!deleteTargetId) return;

  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await apiRequest(`/applications/${deleteTargetId}`, { method: 'DELETE' });
    allApplications = allApplications.filter(a => (a._id || a.id) !== deleteTargetId);
    showToast('Application deleted', 'info');
    closeDeleteModal();
    renderTable();

  } catch (err) {
    showToast(err.message || 'Failed to delete', 'error');
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

/* ── Modal helpers ───────────────────────────────────────── */

function openModal(id = 'appModal') {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id = 'appModal') {
  document.getElementById(id)?.classList.remove('open');
}

/* ── Demo data ───────────────────────────────────────────── */

function getDemoApplications() {
  return [
    { id:'1', company:'Google',    role:'SWE Intern',      status:'Interview', jobType:'Internship', dateApplied:'2025-01-10', deadline:'2025-02-15', location:'Mountain View' },
    { id:'2', company:'Microsoft', role:'PM Intern',       status:'Applied',   jobType:'Internship', dateApplied:'2025-01-12', deadline:'2025-02-20', location:'Remote' },
    { id:'3', company:'Stripe',    role:'Backend Intern',  status:'Applied',   jobType:'Internship', dateApplied:'2025-01-14', deadline:null,         location:'San Francisco' },
    { id:'4', company:'Notion',    role:'Design Intern',   status:'Rejected',  jobType:'Internship', dateApplied:'2025-01-05', deadline:null,         location:'New York' },
    { id:'5', company:'Figma',     role:'Frontend Intern', status:'Offer',     jobType:'Internship', dateApplied:'2024-12-20', deadline:null,         location:'Remote' },
  ];
}

/* ── XSS protection ──────────────────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}