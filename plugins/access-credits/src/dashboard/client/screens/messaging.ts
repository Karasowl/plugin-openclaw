export const MESSAGING_SCREEN = String.raw`
  // ── LANGUAGE SCREEN ────────────────────────────────────────────
  function renderMessaging(main) {
    loadMessaging().then(function(data) {
      state.messaging = data.messaging || data;
      main.innerHTML = buildLanguageHtml();
      bindLanguageEvents();
    }).catch(function() {
      state.messaging = { locale: 'en', autoDetect: false, templates: {}, translateApiUrl: '' };
      main.innerHTML = buildLanguageHtml();
      bindLanguageEvents();
    });
  }

  function buildLanguageHtml() {
    var m = state.messaging;
    var locales = [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' },
      { value: 'pt', label: 'Portuguese' },
      { value: 'ja', label: 'Japanese' },
      { value: 'ko', label: 'Korean' },
      { value: 'zh', label: 'Chinese' },
      { value: 'ar', label: 'Arabic' },
      { value: 'ru', label: 'Russian' },
    ];

    return (
      '<div class="mb-8">' +
        '<h1 class="font-headline text-headline-lg text-on-surface">Language Settings</h1>' +
        '<p class="font-body text-body-md text-on-surface-variant mt-1">Configure the language used for response messages sent to users</p>' +
      '</div>' +

      '<div class="max-w-2xl space-y-5">' +
        // Default language
        '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-6">' +
          '<div class="flex items-center gap-3 mb-5">' +
            icon('language', 'text-on-surface-variant') +
            '<h2 class="font-headline text-title-lg text-on-surface">Default Response Language</h2>' +
          '</div>' +
          '<p class="font-body text-body-sm text-on-surface-variant mb-4">The language used for response templates (denial messages, cooldown messages, etc.) when auto-detect is disabled.</p>' +
          '<select id="msg-locale" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border outline-none">' +
            locales.map(function(l) {
              return '<option value="' + l.value + '"' + (m.locale === l.value ? ' selected' : '') + '>' + l.label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +

        // Auto-detect
        '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-6">' +
          '<div class="flex items-center gap-3 mb-5">' +
            icon('translate', 'text-on-surface-variant') +
            '<h2 class="font-headline text-title-lg text-on-surface">Automatic Translation</h2>' +
          '</div>' +
          '<div class="flex items-center justify-between mb-5">' +
            '<div>' +
              '<div class="font-body text-body-md text-on-surface">Auto-detect Language</div>' +
              '<div class="font-body text-body-sm text-on-surface-variant">Detect language from the user\'s message text and automatically translate responses to match</div>' +
            '</div>' +
            '<div id="toggle-autodetect" class="toggle-track ' + (m.autoDetect ? 'active' : '') + '">' +
              '<div class="toggle-thumb"></div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label class="font-label text-label-md text-on-surface-variant block mb-2">Translation API URL</label>' +
            '<p class="font-body text-body-sm text-on-surface-variant/70 mb-2">LibreTranslate API endpoint. Leave empty to use the public instance (libretranslate.com). You can self-host for better reliability.</p>' +
            '<input id="msg-translate-url" type="text" placeholder="https://libretranslate.com" value="' + esc(m.translateApiUrl || '') + '" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
          '</div>' +
        '</div>' +

        // Info card
        '<div class="bg-surface-container-low rounded-2xl p-5">' +
          '<div class="flex items-start gap-3">' +
            icon('info', 'sm text-on-surface-variant mt-0.5') +
            '<div class="font-body text-body-sm text-on-surface-variant">' +
              '<p class="mb-2">Response templates (what users actually see) are configured in the <button onclick="navigateTo(\'prompts\')" class="text-on-tertiary-container underline font-medium">Responses</button> screen.</p>' +
              '<p>When auto-detect is enabled, the plugin detects the language of the user\'s incoming message and translates the configured response template before sending it.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Save
        '<div class="flex justify-end gap-3 pt-4">' +
          '<button onclick="renderScreen(\'messaging\')" class="text-on-surface-variant px-5 py-2.5 font-label text-label-lg hover:text-on-surface">Discard</button>' +
          '<button id="save-lang-btn" class="btn-primary-gradient px-8 py-3 rounded-xl font-label text-label-lg shadow-editorial-lg">Save Language Settings</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bindLanguageEvents() {
    var toggleAd = document.getElementById('toggle-autodetect');
    if (toggleAd) {
      toggleAd.addEventListener('click', function() { toggleAd.classList.toggle('active'); });
    }

    var saveBtn = document.getElementById('save-lang-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var patch = {};
        var localeEl = document.getElementById('msg-locale');
        if (localeEl) patch.locale = localeEl.value;
        var adEl = document.getElementById('toggle-autodetect');
        if (adEl) patch.autoDetect = adEl.classList.contains('active');
        var urlEl = document.getElementById('msg-translate-url');
        if (urlEl) patch.translateApiUrl = urlEl.value.trim();

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        saveMessaging(patch).then(function(data) {
          state.messaging = data.messaging || data;
          showToast('Language settings saved', 'success');
          renderScreen('messaging');
        }).catch(function(err) {
          showToast(err.message, 'error');
          saveBtn.textContent = 'Save Language Settings';
          saveBtn.disabled = false;
        });
      });
    }
  }
`;
