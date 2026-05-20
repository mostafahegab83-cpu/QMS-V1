// Single-file QMS app — hash-based view router.
(function () {
  const views = document.querySelectorAll('[data-view]');
  const VALID = ['login', 'signup', 'dashboard'];

  function isLoggedIn() {
    return sessionStorage.getItem('qms_logged_in') === '1';
  }

  function show(name) {
    if (!VALID.includes(name)) {
      // Unknown view: go to dashboard if logged in, otherwise login
      name = isLoggedIn() ? 'dashboard' : 'login';
      if (location.hash.slice(1) !== name) {
        location.hash = '#' + name;
        return; // hashchange will re-run route()
      }
    }
    // Auth gate: dashboard requires login
    if (name === 'dashboard' && !isLoggedIn()) {
      location.hash = '#login';
      return;
    }
    views.forEach(v => { v.hidden = v.dataset.view !== name; });
  }

  function route() {
    const raw = location.hash.slice(1);
    show(raw || (isLoggedIn() ? 'dashboard' : 'login'));
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);

  // Make any href="#" link a no-op so it doesn't reset the route
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href === '#') {
      e.preventDefault();
      const label = (a.textContent || '').trim();
      if (label && !a.classList.contains('nav-item')) {
        alert(label + ' — module coming soon.');
      }
    }
  });

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { alert('Please enter both email and password.'); return; }
      sessionStorage.setItem('qms_logged_in', '1');
      sessionStorage.setItem('qms_email', email);
      location.hash = '#dashboard';
    });
  }

  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      if (!name || !email || !password) { alert('Please fill in all fields.'); return; }
      sessionStorage.setItem('qms_logged_in', '1');
      sessionStorage.setItem('qms_email', email);
      location.hash = '#dashboard';
    });
  }

  // Sign out (sidebar link points to #login)
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a');
    if (a && a.getAttribute('href') === '#login' && a.classList.contains('nav-item')) {
      sessionStorage.removeItem('qms_logged_in');
      sessionStorage.removeItem('qms_email');
    }
  });
})();
