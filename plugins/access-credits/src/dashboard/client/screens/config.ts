export const CONFIG_SCREEN = String.raw`
  // ── SETTINGS SCREEN ────────────────────────────────────────────
  function renderSettings(main) {
    loadConfig().then(function(data) {
      state.config = data.config || {};
      main.innerHTML = buildSettingsHtml();
      bindSettingsEvents();
    }).catch(function(err) {
      main.innerHTML = '<p class="p-8 text-center font-body text-body-md text-error">' + esc(err.message) + '</p>';
    });
  }

  function buildSettingsHtml() {
    var c = state.config;
    return (
      '<div class="mb-8">' +
        '<h1 class="font-headline text-headline-lg text-on-surface">Settings</h1>' +
        '<p class="font-body text-body-md text-on-surface-variant mt-1">Configure the access credits system behavior</p>' +
      '</div>' +

      '<div class="space-y-5 max-w-3xl">' +

        // Operation Mode
        settingsCard('Operation Mode', 'tune',
          '<div class="flex items-center justify-between">' +
            '<div>' +
              '<div class="font-body text-body-md text-on-surface">Enforcement Mode</div>' +
              '<div class="font-body text-body-sm text-on-surface-variant">When enabled, users without credits are blocked. Otherwise, interactions are only logged.</div>' +
            '</div>' +
            '<div id="toggle-mode" class="toggle-track ' + (c.mode === 'enforce' ? 'active' : '') + '">' +
              '<div class="toggle-thumb"></div>' +
            '</div>' +
          '</div>' +
          '<div class="mt-3">' + badge(c.mode === 'enforce' ? 'Enforcing' : 'Observing',
            c.mode === 'enforce' ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-secondary-container text-on-secondary-container') + '</div>'
        ) +

        // Credits Economy
        settingsCard('Credits Economy', 'payments',
          settingsInput('initial-credits', 'Initial Credits', 'Credits granted to new users', c.initialCredits, 'number') +
          settingsInput('cost-per-message', 'Cost Per Message', 'Credits deducted per interaction', c.costPerMessage, 'number')
        ) +

        // Contributions
        settingsCard('Contributions', 'volunteer_activism',
          '<div class="flex items-center justify-between mb-4">' +
            '<div>' +
              '<div class="font-body text-body-md text-on-surface">Evaluate Contributions</div>' +
              '<div class="font-body text-body-sm text-on-surface-variant">Bot evaluates valuable messages and awards credits</div>' +
            '</div>' +
            '<div id="toggle-contributions" class="toggle-track ' + (c.evaluateContributions ? 'active' : '') + '">' +
              '<div class="toggle-thumb"></div>' +
            '</div>' +
          '</div>' +
          settingsInput('contribution-reward', 'Reward Amount', 'Credits per valuable contribution', c.contributionReward, 'number') +
          settingsInput('contribution-min-length', 'Minimum Length', 'Min characters to evaluate', c.contributionMinLength, 'number')
        ) +

        // Triggers
        settingsCard('Triggers', 'tag',
          '<div class="mb-4">' +
            '<label class="font-label text-label-md text-on-surface-variant block mb-2">Trigger Hashtags</label>' +
            '<div id="chips-hashtags" class="flex flex-wrap gap-2 mb-2">' +
              (c.triggerHashtags || []).map(function(h) { return chipHtml(h, 'hashtags'); }).join('') +
            '</div>' +
            '<div class="flex gap-2">' +
              '<input id="input-hashtag" type="text" placeholder="#newtag" class="flex-1 px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
              '<button onclick="addChip(\'hashtags\',\'input-hashtag\')" class="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-xl font-label text-label-md">Add</button>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label class="font-label text-label-md text-on-surface-variant block mb-2">Trigger Commands</label>' +
            '<div id="chips-commands" class="flex flex-wrap gap-2 mb-2">' +
              (c.triggerCommands || []).map(function(cmd) { return chipHtml(cmd, 'commands'); }).join('') +
            '</div>' +
            '<div class="flex gap-2">' +
              '<input id="input-command" type="text" placeholder="/newcommand" class="flex-1 px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
              '<button onclick="addChip(\'commands\',\'input-command\')" class="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-xl font-label text-label-md">Add</button>' +
            '</div>' +
          '</div>'
        ) +

        // Administration
        settingsCard('Administration', 'admin_panel_settings',
          '<div class="mb-4">' +
            '<label class="font-label text-label-md text-on-surface-variant block mb-2">Admin Users (bypass all checks)</label>' +
            '<div id="chips-admins" class="flex flex-wrap gap-2 mb-2">' +
              (c.adminUsers || []).map(function(a) { return chipHtml(a, 'admins'); }).join('') +
            '</div>' +
            '<div class="flex gap-2">' +
              '<input id="input-admin" type="text" placeholder="User ID" class="flex-1 px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
              '<button onclick="addChip(\'admins\',\'input-admin\')" class="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-xl font-label text-label-md">Add</button>' +
            '</div>' +
          '</div>' +
          settingsInput('cooldown-seconds', 'Cooldown (seconds)', 'Minimum wait between interactions', c.cooldownSeconds, 'number') +
          settingsInput('fallback-model', 'Fallback Model', 'Model used for denied users', c.fallbackModel, 'text')
        ) +

        // Save button
        '<div class="flex justify-end gap-3 pt-4">' +
          '<button onclick="renderScreen(\'settings\')" class="text-on-surface-variant px-5 py-2.5 font-label text-label-lg hover:text-on-surface">Discard</button>' +
          '<button id="save-config-btn" class="btn-primary-gradient px-8 py-3 rounded-xl font-label text-label-lg shadow-editorial-lg">Save Configuration</button>' +
        '</div>' +
      '</div>'
    );
  }

  function settingsCard(title, iconName, content) {
    return '<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-editorial">' +
      '<div class="flex items-center gap-3 mb-5">' +
        icon(iconName, 'text-on-surface-variant') +
        '<h2 class="font-headline text-title-lg text-on-surface">' + title + '</h2>' +
      '</div>' +
      content +
    '</div>';
  }

  function settingsInput(id, label, desc, value, type) {
    return '<div class="mb-4">' +
      '<label for="cfg-' + id + '" class="font-label text-label-md text-on-surface-variant block mb-1.5">' + label + '</label>' +
      (desc ? '<div class="font-body text-body-sm text-on-surface-variant/70 mb-2">' + desc + '</div>' : '') +
      '<input id="cfg-' + id + '" type="' + (type || 'text') + '" value="' + esc(String(value != null ? value : '')) + '" ' +
        'class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none transition-colors duration-200">' +
    '</div>';
  }

  function chipHtml(text, group) {
    return '<span class="chip bg-secondary-container text-on-secondary-container">' +
      esc(text) +
      '<span class="chip-remove" onclick="removeChip(\'' + group + '\',\'' + esc(text) + '\')">&times;</span>' +
    '</span>';
  }

  // Chip state (temporary, read on save)
  var chipState = {};

  function getChips(group) {
    if (chipState[group]) return chipState[group].slice();
    var c = state.config;
    if (group === 'hashtags') return (c.triggerHashtags || []).slice();
    if (group === 'commands') return (c.triggerCommands || []).slice();
    if (group === 'admins') return (c.adminUsers || []).slice();
    return [];
  }

  function setChips(group, arr) {
    chipState[group] = arr;
    var container = document.getElementById('chips-' + group);
    if (container) {
      container.innerHTML = arr.map(function(t) { return chipHtml(t, group); }).join('');
    }
  }

  function addChip(group, inputId) {
    var input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;
    var arr = getChips(group);
    var val = input.value.trim();
    if (arr.indexOf(val) >= 0) return;
    arr.push(val);
    setChips(group, arr);
    input.value = '';
  }

  function removeChip(group, value) {
    var arr = getChips(group);
    arr = arr.filter(function(v) { return v !== value; });
    setChips(group, arr);
  }

  function bindSettingsEvents() {
    chipState = {};

    // Toggle: mode
    var modeToggle = document.getElementById('toggle-mode');
    if (modeToggle) {
      modeToggle.addEventListener('click', function() {
        modeToggle.classList.toggle('active');
      });
    }

    // Toggle: contributions
    var contribToggle = document.getElementById('toggle-contributions');
    if (contribToggle) {
      contribToggle.addEventListener('click', function() {
        contribToggle.classList.toggle('active');
      });
    }

    // Save button
    var saveBtn = document.getElementById('save-config-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var patch = {};
        var modeEl = document.getElementById('toggle-mode');
        if (modeEl) patch.mode = modeEl.classList.contains('active') ? 'enforce' : 'observe';

        var contribEl = document.getElementById('toggle-contributions');
        if (contribEl) patch.evaluateContributions = contribEl.classList.contains('active');

        var ic = document.getElementById('cfg-initial-credits');
        if (ic) patch.initialCredits = parseInt(ic.value, 10) || 10;

        var cpm = document.getElementById('cfg-cost-per-message');
        if (cpm) patch.costPerMessage = parseInt(cpm.value, 10) || 1;

        var cr = document.getElementById('cfg-contribution-reward');
        if (cr) patch.contributionReward = parseInt(cr.value, 10) || 2;

        var cml = document.getElementById('cfg-contribution-min-length');
        if (cml) patch.contributionMinLength = parseInt(cml.value, 10) || 100;

        var cs = document.getElementById('cfg-cooldown-seconds');
        if (cs) patch.cooldownSeconds = parseInt(cs.value, 10) || 0;

        var fm = document.getElementById('cfg-fallback-model');
        if (fm) patch.fallbackModel = fm.value || 'cheapest';

        patch.triggerHashtags = getChips('hashtags');
        patch.triggerCommands = getChips('commands');
        patch.adminUsers = getChips('admins');

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        saveConfig(patch).then(function(res) {
          state.config = res.config;
          showToast('Configuration saved', 'success');
          renderScreen('settings');
        }).catch(function(err) {
          showToast(err.message, 'error');
          saveBtn.textContent = 'Save Configuration';
          saveBtn.disabled = false;
        });
      });
    }
  }
`;
