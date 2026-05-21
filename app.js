// ============================================================
// Manage Easily QMS — single-file app with Firebase Auth
// 3 files only: index.html, styles.css, app.js
// ============================================================

// ---- Firebase config (public, safe in client code) ----
const firebaseConfig = {
  apiKey: "AIzaSyAohCS5bgcYbNdQd3vRjJteL8fNd3A0D1o",
  authDomain: "qms-v1-3a24d.firebaseapp.com",
  projectId: "qms-v1-3a24d",
  storageBucket: "qms-v1-3a24d.firebasestorage.app",
  messagingSenderId: "57116468212",
  appId: "1:57116468212:web:f1892395d1b0c906c34fa1",
  measurementId: "G-MQQ59ME2BP"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

(function () {
  const views = document.querySelectorAll('[data-view]');
  const VALID = ['login', 'signup', 'dashboard'];
  let currentUser = null;

  function isLoggedIn() { return !!currentUser; }

  function show(name) {
    if (!VALID.includes(name)) {
      name = isLoggedIn() ? 'dashboard' : 'login';
    }
    if (name === 'dashboard' && !isLoggedIn()) {
      location.hash = '#login';
      return;
    }
    if ((name === 'login' || name === 'signup') && isLoggedIn()) {
      location.hash = '#dashboard';
      return;
    }
    views.forEach(v => { v.hidden = v.dataset.view !== name; });
  }

  function route() {
    const raw = location.hash.slice(1);
    show(raw || (isLoggedIn() ? 'dashboard' : 'login'));
  }

  // React to Firebase auth state
  auth.onAuthStateChanged(function (user) {
    currentUser = user || null;
    route();
  });

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);

  // Make href="#" links no-ops
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
    // Sign out when sidebar "#login" nav-item is clicked
    if (a && a.getAttribute('href') === '#login' && a.classList.contains('nav-item')) {
      e.preventDefault();
      auth.signOut().then(() => { location.hash = '#login'; });
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
      auth.signInWithEmailAndPassword(email, password)
        .then(() => { location.hash = '#dashboard'; })
        .catch(err => alert('Sign in failed: ' + err.message));
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
      auth.createUserWithEmailAndPassword(email, password)
        .then(cred => cred.user.updateProfile({ displayName: name }))
        .then(() => { location.hash = '#dashboard'; })
        .catch(err => alert('Sign up failed: ' + err.message));
    });
  }
})();
