export const BOTTOM_NAV_SCRIPT = String.raw`
  // ── BOTTOM NAV ─────────────────────────────────────────────────
  function renderBottomNav() {
    var nav = document.getElementById('bottom-nav');
    if (!nav) return;
    var items = [
      { screen: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { screen: 'users', icon: 'group', label: 'Groups' },
      { screen: 'prompts', icon: 'chat_bubble', label: 'Responses' },
      { screen: 'messaging', icon: 'language', label: 'Language' },
      { screen: 'settings', icon: 'settings', label: 'Config' },
    ];

    nav.innerHTML = items.map(function(item) {
      return '<button data-bnav="' + item.screen + '" ' +
        'class="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-on-surface-variant transition-colors">' +
        '<span class="material-symbols-outlined sm">' + item.icon + '</span>' +
        '<span class="text-label-sm font-label">' + item.label + '</span>' +
      '</button>';
    }).join('');

    nav.querySelectorAll('[data-bnav]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        navigateTo(btn.getAttribute('data-bnav'));
      });
    });
  }
`;
