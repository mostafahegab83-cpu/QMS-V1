(function(){
  var VIEWS = ['login','signup','dashboard'];
  var AUTH_KEY = 'qms_authed';

  function isAuthed(){ return localStorage.getItem(AUTH_KEY) === '1'; }
  function setAuthed(v){ v ? localStorage.setItem(AUTH_KEY,'1') : localStorage.removeItem(AUTH_KEY); }

  function currentView(){
    var h = (location.hash || '').replace('#','');
    if (VIEWS.indexOf(h) === -1) h = isAuthed() ? 'dashboard' : 'login';
    if (h === 'dashboard' && !isAuthed()) h = 'login';
    return h;
  }

  function showView(name){
    VIEWS.forEach(function(v){
      var el = document.getElementById('view-'+v);
      if (el) el.classList.toggle('hidden', v !== name);
    });
    if (location.hash.replace('#','') !== name) location.hash = name;
    window.scrollTo(0,0);
  }

  document.addEventListener('submit', function(e){
    var form = e.target;
    if (form.dataset.form === 'login' || form.dataset.form === 'signup'){
      e.preventDefault();
      setAuthed(true);
      showView('dashboard');
    }
  });

  document.addEventListener('click', function(e){
    var navLink = e.target.closest('[data-nav]');
    if (navLink){
      var target = (navLink.getAttribute('href')||'').replace('#','');
      if (VIEWS.indexOf(target) !== -1){
        e.preventDefault();
        if (target === 'dashboard') setAuthed(true);
        showView(target);
      }
    }
    var act = e.target.closest('[data-action="logout"]');
    if (act){ e.preventDefault(); setAuthed(false); showView('login'); }
  });

  window.addEventListener('hashchange', function(){ showView(currentView()); });
  showView(currentView());
})();
