export const ROUTER_SCRIPT = String.raw`
  // ── ROUTER ─────────────────────────────────────────────────────
  var SCREENS = ['dashboard', 'users', 'prompts', 'messaging', 'settings'];

  function getScreenFromHash() {
    var hash = (location.hash || '').replace('#', '');
    return SCREENS.indexOf(hash) >= 0 ? hash : 'dashboard';
  }

  function navigateTo(screen) {
    if (SCREENS.indexOf(screen) < 0) screen = 'dashboard';
    location.hash = '#' + screen;
  }

  function updateActiveNav(screen) {
    // Desktop sidebar
    $$('[data-screen]').forEach(function(el) {
      var isActive = el.getAttribute('data-screen') === screen;
      el.classList.toggle('bg-surface-container-lowest', isActive);
      el.classList.toggle('shadow-editorial', isActive);
      el.classList.toggle('font-semibold', isActive);
      el.classList.toggle('text-on-surface', isActive);
      el.classList.toggle('text-on-surface-variant', !isActive);
    });
    // Mobile bottom nav
    $$('[data-bnav]').forEach(function(el) {
      var isActive = el.getAttribute('data-bnav') === screen;
      el.classList.toggle('text-primary', isActive);
      el.classList.toggle('text-on-surface-variant', !isActive);
      var iconEl = el.querySelector('.material-symbols-outlined');
      if (iconEl) {
        iconEl.classList.toggle('filled', isActive);
      }
    });
  }

  function renderScreen(screen) {
    state.currentScreen = screen;
    updateActiveNav(screen);
    var main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = '<div class="flex items-center justify-center h-64"><div class="spinner"></div></div>';
    switch (screen) {
      case 'dashboard': renderDashboard(main); break;
      case 'users': renderUsers(main); break;
      case 'prompts': renderPrompts(main); break;
      case 'messaging': renderMessaging(main); break;
      case 'settings': renderSettings(main); break;
      default: renderDashboard(main);
    }
  }

  window.addEventListener('hashchange', function() {
    renderScreen(getScreenFromHash());
  });
`;
