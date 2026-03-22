export const MESSAGING_SCREEN = String.raw`
  // ── MESSAGING SCREEN ───────────────────────────────────────────
  function renderMessaging(main) {
    loadMessaging().then(function(data) {
      state.messaging = data.messaging || data;
      main.innerHTML = buildMessagingHtml();
      bindMessagingEvents();
    }).catch(function() {
      // If endpoint doesn't exist yet, use defaults
      state.messaging = {
        locale: 'en-US', autoDetect: false,
        templates: {
          insufficient_credits: "You don't have enough credits. Your balance: {credit_balance}. You need {cost} to interact, {user_name}.",
          cooldown: 'Please wait a moment before sending another query, {user_name}.',
          welcome: 'Welcome {user_name}! You have been granted {credit_balance} credits to get started.',
        },
        regions: [
          { name: 'North America', locale: 'en-US', active: true },
          { name: 'Europe', locale: 'en-GB', active: false },
          { name: 'Latin America', locale: 'es-ES', active: false },
          { name: 'Asia Pacific', locale: 'en-US', active: false },
        ]
      };
      main.innerHTML = buildMessagingHtml();
      bindMessagingEvents();
    });
  }

  function buildMessagingHtml() {
    var m = state.messaging;
    var locales = [
      { value: 'en-US', label: 'English (US)' },
      { value: 'en-GB', label: 'English (UK)' },
      { value: 'es-ES', label: 'Spanish (Spain)' },
      { value: 'es-MX', label: 'Spanish (Mexico)' },
      { value: 'fr-FR', label: 'French' },
      { value: 'de-DE', label: 'German' },
      { value: 'pt-BR', label: 'Portuguese (Brazil)' },
      { value: 'ja-JP', label: 'Japanese' },
      { value: 'ko-KR', label: 'Korean' },
      { value: 'zh-CN', label: 'Chinese (Simplified)' },
    ];

    var variables = [
      { key: '{user_name}', desc: 'Display name' },
      { key: '{credit_balance}', desc: 'Current balance' },
      { key: '{cost}', desc: 'Interaction cost' },
      { key: '{cooldown}', desc: 'Seconds remaining' },
    ];

    var templateKeys = Object.keys(m.templates || {});

    return (
      '<div class="mb-8">' +
        '<h1 class="font-headline text-headline-lg text-on-surface">Messaging & Language</h1>' +
        '<p class="font-body text-body-md text-on-surface-variant mt-1">Configure system communications and response templates</p>' +
      '</div>' +

      '<div class="grid grid-cols-1 lg:grid-cols-12 gap-5">' +
        // Left column
        '<div class="lg:col-span-5 space-y-5">' +
          // Language card
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-6">' +
            '<div class="flex items-center gap-3 mb-5">' +
              icon('language', 'text-on-surface-variant') +
              '<h2 class="font-headline text-title-lg text-on-surface">Language</h2>' +
            '</div>' +
            '<div class="mb-4">' +
              '<label class="font-label text-label-md text-on-surface-variant block mb-2">Primary Locale</label>' +
              '<select id="msg-locale" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border outline-none">' +
                locales.map(function(l) {
                  return '<option value="' + l.value + '"' + (m.locale === l.value ? ' selected' : '') + '>' + l.label + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            '<div class="flex items-center justify-between">' +
              '<div>' +
                '<div class="font-body text-body-md text-on-surface">Auto-detect Location</div>' +
                '<div class="font-body text-body-sm text-on-surface-variant">Set locale based on user region</div>' +
              '</div>' +
              '<div id="toggle-autodetect" class="toggle-track ' + (m.autoDetect ? 'active' : '') + '">' +
                '<div class="toggle-thumb"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // Active regions card
          '<div class="bg-primary-container rounded-2xl p-6 relative overflow-hidden">' +
            '<div class="absolute top-0 right-0 w-40 h-40 bg-on-primary-container/10 rounded-full blur-3xl"></div>' +
            '<div class="relative">' +
              '<h3 class="font-headline text-title-lg text-on-primary mb-1">Active Regions</h3>' +
              '<p class="font-body text-body-sm text-on-primary/70 mb-4">Configure regional overrides</p>' +
              '<div class="flex flex-wrap gap-2">' +
                (m.regions || []).map(function(r, i) {
                  return '<button data-region="' + i + '" class="flex items-center gap-2 px-3 py-1.5 rounded-full text-label-md font-label transition-colors ' +
                    (r.active ? 'bg-on-primary text-primary-container' : 'bg-on-primary/20 text-on-primary/70 hover:bg-on-primary/30') + '">' +
                    '<span class="w-1.5 h-1.5 rounded-full ' + (r.active ? 'bg-green-400' : 'bg-on-primary/40') + '"></span>' +
                    esc(r.name) +
                  '</button>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Right column — templates
        '<div class="lg:col-span-7 space-y-5">' +
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial">' +
            '<div class="flex items-center justify-between px-6 py-4">' +
              '<div class="flex items-center gap-3">' +
                icon('edit_note', 'text-on-surface-variant') +
                '<h2 class="font-headline text-title-lg text-on-surface">Response Templates</h2>' +
              '</div>' +
            '</div>' +

            '<div class="px-6 pb-6 space-y-5">' +
              templateKeys.map(function(key) {
                var label = key.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                return '<div>' +
                  '<label class="font-label text-label-md text-on-surface-variant block mb-2">' + esc(label) + '</label>' +
                  '<textarea id="tpl-' + esc(key) + '" rows="3" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none resize-y">' + esc(m.templates[key]) + '</textarea>' +
                '</div>';
              }).join('') +

              // Variables reference
              '<div class="bg-surface-container-low rounded-xl p-4">' +
                '<div class="font-label text-label-sm text-on-surface-variant uppercase tracking-wider mb-3">Available Variables</div>' +
                '<div class="flex flex-wrap gap-2">' +
                  variables.map(function(v) {
                    return '<button class="variable-btn px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface font-mono text-body-sm hover:bg-secondary-container transition-colors" data-var="' + esc(v.key) + '" title="' + esc(v.desc) + '">' + esc(v.key) + '</button>';
                  }).join('') +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // Save/Discard
          '<div class="flex justify-end gap-3">' +
            '<button onclick="renderScreen(\'messaging\')" class="text-on-surface-variant px-5 py-2.5 font-label text-label-lg hover:text-on-surface">Discard</button>' +
            '<button id="save-messaging-btn" class="btn-primary-gradient px-8 py-3 rounded-xl font-label text-label-lg shadow-editorial-lg">Save Changes</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function bindMessagingEvents() {
    // Toggle auto-detect
    var toggleAd = document.getElementById('toggle-autodetect');
    if (toggleAd) {
      toggleAd.addEventListener('click', function() { toggleAd.classList.toggle('active'); });
    }

    // Region toggles
    $$('[data-region]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.getAttribute('data-region'), 10);
        if (state.messaging && state.messaging.regions && state.messaging.regions[idx]) {
          state.messaging.regions[idx].active = !state.messaging.regions[idx].active;
          renderScreen('messaging');
        }
      });
    });

    // Variable insert buttons
    $$('.variable-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var v = btn.getAttribute('data-var');
        // Find the last focused textarea
        var textareas = $$('textarea[id^="tpl-"]');
        var target = textareas.length > 0 ? textareas[0] : null;
        if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
          target = document.activeElement;
        }
        if (target && v) {
          var start = target.selectionStart;
          var end = target.selectionEnd;
          target.value = target.value.substring(0, start) + v + target.value.substring(end);
          target.selectionStart = target.selectionEnd = start + v.length;
          target.focus();
        }
      });
    });

    // Save
    var saveBtn = document.getElementById('save-messaging-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var patch = {};
        var localeEl = document.getElementById('msg-locale');
        if (localeEl) patch.locale = localeEl.value;

        var adEl = document.getElementById('toggle-autodetect');
        if (adEl) patch.autoDetect = adEl.classList.contains('active');

        var templates = {};
        $$('textarea[id^="tpl-"]').forEach(function(ta) {
          var key = ta.id.replace('tpl-', '');
          templates[key] = ta.value;
        });
        patch.templates = templates;
        patch.regions = state.messaging.regions;

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        saveMessaging(patch).then(function(data) {
          state.messaging = data.messaging || data;
          showToast('Messaging configuration saved', 'success');
          renderScreen('messaging');
        }).catch(function(err) {
          showToast(err.message, 'error');
          saveBtn.textContent = 'Save Changes';
          saveBtn.disabled = false;
        });
      });
    }
  }
`;
