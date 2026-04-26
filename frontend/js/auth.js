/* ============================================================
   auth.js — Login & Signup page logic
   Handles form submission, validation, password strength, etc.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in (no need to see auth pages)
  redirectIfLoggedIn();

  // Determine which page we're on by checking for form IDs
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginForm)  setupLoginPage();
  if (signupForm) setupSignupPage();
});

/* ── LOGIN PAGE ─────────────────────────────────────────── */

function setupLoginPage() {
  const form     = document.getElementById('loginForm');
  const errorBox = document.getElementById('authError');
  const loginBtn = document.getElementById('loginBtn');

  // Password visibility toggle
  setupPasswordToggle('password', 'togglePw');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Basic validation
    if (!email || !password) {
      showError(errorBox, 'Please fill in all fields.');
      return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
      // Call the backend login endpoint (Phase 3+)
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      // Save token and user, then redirect to dashboard
      saveToken(data.token);
      saveUser(data.user);
      window.location.href = 'dashboard.html';

    } catch (err) {
      showError(errorBox, err.message || 'Invalid email or password.');
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Log in';
    }
  });
}

/* ── SIGNUP PAGE ────────────────────────────────────────── */

function setupSignupPage() {
  const form      = document.getElementById('signupForm');
  const errorBox  = document.getElementById('authError');
  const signupBtn = document.getElementById('signupBtn');
  const pwInput   = document.getElementById('password');

  // Password visibility toggle
  setupPasswordToggle('password', 'togglePw');

  // Password strength meter
  pwInput.addEventListener('input', () => {
    updatePasswordStrength(pwInput.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name       = document.getElementById('name').value.trim();
    const email      = document.getElementById('email').value.trim();
    const university = document.getElementById('university').value.trim();
    const password   = pwInput.value;

    // Validation
    if (!name || !email || !password) {
      showError(errorBox, 'Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      showError(errorBox, 'Password must be at least 8 characters.');
      return;
    }

    // Email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(errorBox, 'Please enter a valid email address.');
      return;
    }

    // Show loading state
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { name, email, university, password }
      });

      saveToken(data.token);
      saveUser(data.user);
      window.location.href = 'dashboard.html';

    } catch (err) {
      showError(errorBox, err.message || 'Could not create account. Please try again.');
      signupBtn.disabled = false;
      signupBtn.innerHTML = 'Create account';
    }
  });
}

/* ── Helpers ─────────────────────────────────────────────── */

/** Show error message in the auth error box */
function showError(errorBox, message) {
  errorBox.textContent = message;
  errorBox.classList.add('show');
  // Auto-hide after 5 seconds
  setTimeout(() => errorBox.classList.remove('show'), 5000);
}

/** Toggle password visibility */
function setupPasswordToggle(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (!input || !btn) return;

  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '🙈' : '👁️';
  });
}

/** Update the 4-bar password strength indicator */
function updatePasswordStrength(password) {
  const bars = ['bar1', 'bar2', 'bar3', 'bar4'];

  // Calculate strength score (0-4)
  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Update bar colors
  bars.forEach((barId, index) => {
    const bar = document.getElementById(barId);
    if (!bar) return;

    bar.className = 'pw-strength-bar'; // reset

    if (index < score) {
      if (score <= 1)      bar.classList.add('weak');
      else if (score <= 2) bar.classList.add('medium');
      else if (score <= 3) bar.classList.add('medium');
      else                 bar.classList.add('strong');
    }
  });
}