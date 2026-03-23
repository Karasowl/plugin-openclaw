export const PROMPTS_SCREEN = String.raw`
  // ── RESPONSE CONFIGURATION SCREEN ──────────────────────────────

  function renderPrompts(main) {
    Promise.all([loadTemplates(), loadMessaging()]).then(function(results) {
      state.templates = results[0].templates || {};
      state.messaging = results[1].messaging || results[1] || {};
      main.innerHTML = buildResponseConfigHtml();
      bindResponseConfigEvents();
    }).catch(function() {
      state.templates = {};
      state.messaging = state.messaging || { locale: 'en', autoDetect: false, templates: {}, translateApiUrl: '' };
      main.innerHTML = buildResponseConfigHtml();
      bindResponseConfigEvents();
    });
  }

  function buildResponseConfigHtml() {
    var t = state.templates || {};
    var m = state.messaging || {};
    var msgTemplates = m.templates || {};

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
        '<h1 class="font-headline text-headline-lg text-on-surface">Response Configuration</h1>' +
        '<p class="font-body text-body-md text-on-surface-variant mt-1">Configure what users see when they interact with the bot, and fallback instructions for the AI</p>' +
      '</div>' +

      // ── SECTION 1: USER MESSAGES (the important part) ──
      '<div class="mb-8">' +
        '<div class="flex items-center gap-3 mb-4">' +
          icon('chat_bubble', 'text-on-tertiary-container') +
          '<h2 class="font-headline text-headline-sm text-on-surface">User Messages</h2>' +
        '</div>' +
        '<p class="font-body text-body-sm text-on-surface-variant mb-5">These are the actual messages users see in Telegram when they are blocked or rate-limited. Variables are replaced with real values.</p>' +

        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">' +
          // Insufficient credits message
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5">' +
            '<div class="flex items-center gap-2 mb-3">' +
              icon('block', 'sm text-error') +
              '<span class="font-label text-label-lg text-on-surface">No Credits</span>' +
            '</div>' +
            '<p class="font-body text-body-sm text-on-surface-variant mb-3">Sent when user tries to use the bot without enough credits</p>' +
            '<textarea id="msg-tpl-insufficient_credits" rows="3" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none resize-y">' + esc(msgTemplates.insufficient_credits || '') + '</textarea>' +
            '<div class="flex gap-1.5 mt-2 flex-wrap">' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{user_name}</span>' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{credit_balance}</span>' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{cost}</span>' +
            '</div>' +
          '</div>' +

          // Cooldown message
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5">' +
            '<div class="flex items-center gap-2 mb-3">' +
              icon('hourglass_top', 'sm text-amber-600') +
              '<span class="font-label text-label-lg text-on-surface">Cooldown</span>' +
            '</div>' +
            '<p class="font-body text-body-sm text-on-surface-variant mb-3">Sent when user sends messages too quickly</p>' +
            '<textarea id="msg-tpl-cooldown" rows="3" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none resize-y">' + esc(msgTemplates.cooldown || '') + '</textarea>' +
            '<div class="flex gap-1.5 mt-2 flex-wrap">' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{user_name}</span>' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{cooldown}</span>' +
            '</div>' +
          '</div>' +

          // Welcome message
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5">' +
            '<div class="flex items-center gap-2 mb-3">' +
              icon('waving_hand', 'sm text-green-600') +
              '<span class="font-label text-label-lg text-on-surface">Welcome</span>' +
            '</div>' +
            '<p class="font-body text-body-sm text-on-surface-variant mb-3">Sent when a new user first interacts (optional)</p>' +
            '<textarea id="msg-tpl-welcome" rows="3" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none resize-y">' + esc(msgTemplates.welcome || '') + '</textarea>' +
            '<div class="flex gap-1.5 mt-2 flex-wrap">' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{user_name}</span>' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{credit_balance}</span>' +
            '</div>' +
          '</div>' +

          // Promotion / earn credits
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5">' +
            '<div class="flex items-center gap-2 mb-3">' +
              icon('campaign', 'sm text-on-primary-container') +
              '<span class="font-label text-label-lg text-on-surface">Promotion / Ads</span>' +
            '</div>' +
            '<p class="font-body text-body-sm text-on-surface-variant mb-3">Appended to AI context for active users. Use to promote ways to earn credits. Leave empty to disable.</p>' +
            '<textarea id="tpl-promotion" rows="3" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none resize-y">' + esc(t.promotion || '') + '</textarea>' +
            '<div class="flex gap-1.5 mt-2 flex-wrap">' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{senderId}</span>' +
              '<span class="font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{balance}</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Language settings (inline)
        '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5 mb-5">' +
          '<div class="flex items-center gap-3 mb-4">' +
            icon('language', 'text-on-surface-variant') +
            '<h3 class="font-headline text-title-md text-on-surface">Language</h3>' +
          '</div>' +
          '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
            '<div>' +
              '<label class="font-label text-label-md text-on-surface-variant block mb-2">Default Language</label>' +
              '<select id="msg-locale" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border outline-none">' +
                locales.map(function(l) {
                  return '<option value="' + l.value + '"' + (m.locale === l.value ? ' selected' : '') + '>' + l.label + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            '<div class="flex items-center justify-between md:col-span-2 p-3 bg-surface-container-low rounded-xl">' +
              '<div>' +
                '<div class="font-body text-body-md text-on-surface">Auto-detect Language</div>' +
                '<div class="font-body text-body-sm text-on-surface-variant">Detect language from user\'s message and translate responses</div>' +
              '</div>' +
              '<div id="toggle-autodetect" class="toggle-track ' + (m.autoDetect ? 'active' : '') + '">' +
                '<div class="toggle-thumb"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // ── SECTION 2: AI FALLBACK INSTRUCTIONS (collapsible, advanced) ──
      '<div class="mb-6">' +
        '<button id="toggle-ai-fallback" class="flex items-center gap-3 w-full text-left mb-4">' +
          '<div class="flex items-center gap-2">' +
            icon('psychology', 'text-on-surface-variant') +
            '<h2 class="font-headline text-headline-sm text-on-surface">AI Fallback Instructions</h2>' +
          '</div>' +
          '<span class="material-symbols-outlined sm text-on-surface-variant ml-auto" id="ai-fallback-chevron">expand_more</span>' +
        '</button>' +
        '<div id="ai-fallback-section" class="hidden">' +
          '<div class="bg-surface-container-low rounded-2xl p-4 mb-5">' +
            '<div class="flex items-start gap-2">' +
              icon('info', 'sm text-on-surface-variant mt-0.5') +
              '<p class="font-body text-body-sm text-on-surface-variant">OpenClaw cannot fully cancel a session from plugins. If the message reaches the LLM despite blocking, these instructions tell the AI not to process it. A cheap fallback model is used to minimize token costs. In most cases, the user message in Layer 3 is sent instead and these never matter.</p>' +
            '</div>' +
          '</div>' +
          '<div class="space-y-4">' +
            aiTemplateEditor('denial', 'Denial Fallback', 'block', 'text-error', t.denial || '', ['{senderId}', '{balance}', '{cost}']) +
            aiTemplateEditor('cooldown', 'Cooldown Fallback', 'hourglass_top', 'text-amber-600', t.cooldown || '', ['{senderId}']) +
            aiTemplateEditor('activeUser', 'Active User Context', 'check_circle', 'text-green-600', t.activeUser || '', ['{senderId}', '{balance}', '{cost}']) +
            aiTemplateEditor('contribution', 'Contribution Evaluation', 'star', 'text-amber-500', t.contribution || '', ['{senderId}', '{reward}', '{minLength}', '{contentLength}']) +
          '</div>' +
        '</div>' +
      '</div>' +

      // Save
      '<div class="flex justify-end gap-3 pt-4">' +
        '<button onclick="renderScreen(\'prompts\')" class="text-on-surface-variant px-5 py-2.5 font-label text-label-lg hover:text-on-surface">Discard</button>' +
        '<button id="save-all-responses-btn" class="btn-primary-gradient px-8 py-3 rounded-xl font-label text-label-lg shadow-editorial-lg">Save All</button>' +
      '</div>'
    );
  }

  function aiTemplateEditor(key, title, iconName, color, value, vars) {
    return '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5">' +
      '<div class="flex items-center gap-2 mb-2">' +
        icon(iconName, 'sm ' + color) +
        '<span class="font-label text-label-lg text-on-surface">' + title + '</span>' +
      '</div>' +
      '<textarea id="tpl-' + key + '" rows="3" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface code-editor ghost-border ghost-border-focus outline-none resize-y text-body-sm">' + esc(value) + '</textarea>' +
      '<div class="flex gap-1.5 mt-2 flex-wrap">' +
        vars.map(function(v) {
          return '<span class="font-mono text-label-sm bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">' + v + '</span>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function bindResponseConfigEvents() {
    // Toggle AI fallback section
    var toggleBtn = document.getElementById('toggle-ai-fallback');
    var section = document.getElementById('ai-fallback-section');
    var chevron = document.getElementById('ai-fallback-chevron');
    if (toggleBtn && section) {
      toggleBtn.addEventListener('click', function() {
        section.classList.toggle('hidden');
        if (chevron) chevron.textContent = section.classList.contains('hidden') ? 'expand_more' : 'expand_less';
      });
    }

    // Toggle autodetect
    var toggleAd = document.getElementById('toggle-autodetect');
    if (toggleAd) {
      toggleAd.addEventListener('click', function() { toggleAd.classList.toggle('active'); });
    }

    // Save all
    var saveBtn = document.getElementById('save-all-responses-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        // Collect AI templates
        var templatesPatch = {};
        ['denial', 'cooldown', 'activeUser', 'contribution', 'promotion'].forEach(function(key) {
          var ta = document.getElementById('tpl-' + key);
          if (ta) templatesPatch[key] = ta.value;
        });

        // Collect messaging config
        var msgPatch = {};
        var localeEl = document.getElementById('msg-locale');
        if (localeEl) msgPatch.locale = localeEl.value;
        var adEl = document.getElementById('toggle-autodetect');
        if (adEl) msgPatch.autoDetect = adEl.classList.contains('active');

        var msgTemplates = {};
        $$('textarea[id^="msg-tpl-"]').forEach(function(ta) {
          var key = ta.id.replace('msg-tpl-', '');
          msgTemplates[key] = ta.value;
        });
        msgPatch.templates = msgTemplates;

        // Save both in parallel
        Promise.all([
          saveTemplates(templatesPatch),
          saveMessaging(msgPatch)
        ]).then(function(results) {
          state.templates = results[0].templates;
          state.messaging = results[1].messaging || results[1];
          showToast('All response configuration saved', 'success');
          renderScreen('prompts');
        }).catch(function(err) {
          showToast(err.message, 'error');
          saveBtn.textContent = 'Save All';
          saveBtn.disabled = false;
        });
      });
    }
  }
`;
