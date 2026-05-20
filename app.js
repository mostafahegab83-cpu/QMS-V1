// Single-file QMS app — hash-based view router.
(function () {
  const views = document.querySelectorAll('[data-view]');

  function show(name) {
    let found = false;
    views.forEach(v => {
      const match = v.dataset.view === name;
      v.hidden = !match;
      if (match) found = true;
    });
    if (!found) show('login');
  }

  function route() {
    const name = (location.hash || '#login').slice(1);
    show(name);
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { alert('Please enter both email and password.'); return; }
      console.log('Login attempt:', email);
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
      console.log('Signup:', email);
      location.hash = '#dashboard';
    });
  }
})();
