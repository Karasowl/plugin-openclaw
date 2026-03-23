export const SIDEBAR_SCRIPT = String.raw`
  // ── SIDEBAR ────────────────────────────────────────────────────
  function renderSidebar() {
    var sb = document.getElementById('sidebar');
    if (!sb) return;
    var items = [
      { screen: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { screen: 'users', icon: 'group', label: 'Groups & Users' },
      { screen: 'prompts', icon: 'chat_bubble', label: 'Responses' },
      { screen: 'messaging', icon: 'language', label: 'Language' },
      { screen: 'settings', icon: 'settings', label: 'Settings' },
    ];

    var navHtml = items.map(function(item) {
      return '<button data-screen="' + item.screen + '" ' +
        'class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-body-md font-body text-on-surface-variant ' +
        'hover:bg-surface-container-lowest hover:shadow-editorial transition-all duration-200 text-left">' +
        icon(item.icon, 'sm') + '<span>' + item.label + '</span></button>';
    }).join('');

    sb.innerHTML =
      '<div class="flex flex-col h-full">' +
        '<div class="px-5 pt-6 pb-4">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">' +
              '<span class="text-on-primary text-lg font-bold">AC</span>' +
            '</div>' +
            '<div>' +
              '<div class="font-headline text-title-md text-on-surface">Access Credit</div>' +
              '<div class="font-label text-label-sm text-on-surface-variant tracking-wider uppercase">Admin Atelier</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<nav class="flex-1 px-3 space-y-1">' + navHtml + '</nav>' +
        '<div class="px-3 pb-4 space-y-1">' +
          '<a href="https://github.com/openclaw" target="_blank" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-body-sm font-body text-on-surface-variant hover:text-on-surface transition-colors">' +
            icon('help', 'sm') + '<span>Support</span></a>' +
        '</div>' +
      '</div>';

    // Bind nav clicks
    sb.querySelectorAll('[data-screen]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        navigateTo(btn.getAttribute('data-screen'));
      });
    });
  }
`;
