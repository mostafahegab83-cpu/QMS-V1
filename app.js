// Minimal client-side handler. Replace the body of handleLogin() with a real
// API call (fetch to your auth endpoint) when you're ready.
(function () {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }
    handleLogin({ email, password });
  });

  function handleLogin(credentials) {
    // TODO: replace with a real auth request, e.g.:
    // fetch('/api/login', { method: 'POST', body: JSON.stringify(credentials) })
    console.log('Login attempt:', credentials.email);
    window.location.href = 'dashboard.html';
  }
})();
