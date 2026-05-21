// Single-page view router for Manage Easily App
(function () {
  const VIEWS = ['login', 'signup', 'dashboard'];

  function showView(name) {
    if (!VIEWS.includes(name)) name = 'login';
    VIEWS.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.hidden = (v !== name);
    });
    // Toggle body class so view-specific body styles apply
    document.body.className = (name === 'dashboard') ? 'app-body' : 'login-body';
    if (location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
  }

  function currentView() {
    return (location.hash || '#login').replace('#', '');
  }

  // Nav link delegation
  document.addEventListener('click', function (e) {
    const link = e.target.closest('[data-nav]');
    if (!link) return;
    e.preventDefault();
    showView(link.getAttribute('data-nav'));
  });

  // Login submit
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'login-form') {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { alert('Please enter both email and password.'); return; }
      console.log('Login attempt:', email);
      showView('dashboard');
    }
    if (e.target.id === 'signup-form') {
      e.preventDefault();
      showView('dashboard');
    }
  });

  // Handle browser back/forward
  window.addEventListener('hashchange', () => showView(currentView()));

  // Initial render
  showView(currentView());
})();
