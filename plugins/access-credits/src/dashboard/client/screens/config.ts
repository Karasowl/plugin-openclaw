export const CONFIG_SCREEN = String.raw`
  // ── SETTINGS SCREEN ────────────────────────────────────────────
  function renderSettings(main) {
    Promise.all([loadConfig(), loadAgents()]).then(function(results) {
      state.config = results[0].config || {};
      state.seenAgents = results[1].agents || [];
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
              '<div class="font-body text-body-sm text-on-surface-variant"><strong>Enforce</strong>: Users without credits are blocked from using the bot. <strong>Observe</strong>: All interactions are logged but never blocked — useful for testing.</div>' +
            '</div>' +
            '<div id="toggle-mode" class="toggle-track ' + (c.mode === 'enforce' ? 'active' : '') + '">' +
              '<div class="toggle-thumb"></div>' +
            '</div>' +
          '</div>' +
          '<div class="mt-3">' + badge(c.mode === 'enforce' ? 'Enforcing' : 'Observing',
            c.mode === 'enforce' ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-secondary-container text-on-secondary-container') + '</div>'
        ) +

        // Agent Selection
        (function() {
          // Merge configured agents + auto-detected agents (deduplicated)
          var allAgents = (c.agentIds || []).slice();
          (state.seenAgents || []).forEach(function(a) {
            if (allAgents.indexOf(a) < 0) allAgents.push(a);
          });
          var currentAgentIds = getAgentIds();

          return settingsCard('Agent Selection', 'smart_toy',
            '<p class="font-body text-body-sm text-on-surface-variant mb-4">Select which OpenClaw agents use the credit system. When none are selected, the credit system is active for ALL agents. Agents appear here automatically as they process messages.</p>' +
            (allAgents.length > 0 ?
              '<div class="space-y-2 mb-4">' +
                allAgents.map(function(agentId) {
                  var isActive = currentAgentIds.indexOf(agentId) >= 0;
                  var isDetected = (state.seenAgents || []).indexOf(agentId) >= 0;
                  var isConfigured = (c.agentIds || []).indexOf(agentId) >= 0;
                  var sourceLabel = isDetected && isConfigured ? 'Configured + Detected' : isDetected ? 'Auto-detected' : 'Configured';
                  return '<div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">' +
                    '<div class="flex items-center gap-3">' +
                      '<span class="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">' +
                        '<span class="text-on-primary font-mono text-label-sm">' + esc(agentId.slice(0, 2).toUpperCase()) + '</span>' +
                      '</span>' +
                      '<div>' +
                        '<div class="font-body text-body-md font-medium text-on-surface">' + esc(agentId) + '</div>' +
                        '<div class="font-label text-label-sm text-on-surface-variant">' + sourceLabel + '</div>' +
                      '</div>' +
                    '</div>' +
                    '<div onclick="toggleAgentId(\'' + esc(agentId) + '\')" class="toggle-track ' + (isActive ? 'active' : '') + '" title="' + (isActive ? 'Credit system active' : 'Credit system disabled') + '">' +
                      '<div class="toggle-thumb"></div>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>' +
              '<div class="font-label text-label-sm text-on-surface-variant">' +
                (currentAgentIds.length > 0 ?
                  'Credit system active for: ' + currentAgentIds.join(', ') :
                  'No agents selected — credit system active for ALL agents') +
              '</div>'
            :
              '<div class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low mb-4">' +
                icon('info', 'sm text-on-surface-variant') +
                '<span class="font-body text-body-sm text-on-surface-variant">No agents detected yet. Agents will appear here after they process their first message.</span>' +
              '</div>'
            )
          );
        })() +

        // Credits Economy
        settingsCard('Credits Economy', 'payments',
          settingsInput('initial-credits', 'Initial Credits', 'Credits granted to new users on their first interaction with the bot', c.initialCredits, 'number') +
          settingsInput('cost-per-message', 'Cost Per Message', 'Credits deducted each time a user sends a triggered message (e.g. #ask)', c.costPerMessage, 'number')
        ) +

        // Contributions
        settingsCard('Contributions', 'volunteer_activism',
          '<div class="flex items-center justify-between mb-4">' +
            '<div>' +
              '<div class="font-body text-body-md text-on-surface">Evaluate Contributions</div>' +
          '<div class="font-body text-body-sm text-on-surface-variant">When enabled, the AI evaluates each message for valuable content (insights, resources, creative ideas) and automatically awards credits</div>' +
            '</div>' +
            '<div id="toggle-contributions" class="toggle-track ' + (c.evaluateContributions ? 'active' : '') + '">' +
              '<div class="toggle-thumb"></div>' +
            '</div>' +
          '</div>' +
          settingsInput('contribution-reward', 'Reward Amount', 'Credits awarded when the AI determines a message is a valuable contribution', c.contributionReward, 'number') +
          settingsInput('contribution-min-length', 'Minimum Length', 'Messages shorter than this are never evaluated for contributions (saves AI tokens)', c.contributionMinLength, 'number')
        ) +

        // Triggers
        settingsCard('Activation Triggers', 'tag',
          '<p class="font-body text-body-sm text-on-surface-variant mb-4">The credit system only activates when a message contains one of these hashtags or commands. Messages without triggers pass through normally without deducting credits. <em>Example: User sends <span class="font-mono">#ask what is AI?</span> → 1 credit deducted</em></p>' +
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
            '<label class="font-label text-label-md text-on-surface-variant block mb-2">Admin Users</label>' +
            '<p class="font-body text-body-sm text-on-surface-variant/70 mb-2">Admin users bypass all credit checks. They can use the bot without spending credits. Add Telegram user IDs.</p>' +
            '<div id="chips-admins" class="flex flex-wrap gap-2 mb-2">' +
              (c.adminUsers || []).map(function(a) { return chipHtml(a, 'admins'); }).join('') +
            '</div>' +
            '<div class="flex gap-2">' +
              '<input id="input-admin" type="text" placeholder="Telegram User ID" class="flex-1 px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
              '<button onclick="addChip(\'admins\',\'input-admin\')" class="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-xl font-label text-label-md">Add</button>' +
            '</div>' +
          '</div>' +
          settingsInput('cooldown-seconds', 'Cooldown (seconds)', 'Minimum seconds between bot interactions per user. Prevents rapid-fire usage. Set to 0 to disable.', c.cooldownSeconds, 'number') +
          settingsInput('fallback-model', 'Fallback Model', 'When a user is blocked, OpenClaw uses this cheaper model to minimize token costs. The response gets replaced with a denial message anyway. Value "cheapest" auto-selects the least expensive model. This IS connected to OpenClaw via the before_model_resolve hook.', c.fallbackModel, 'text')
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

  // Agent toggle state
  var agentIdsState = null;
  function getAgentIds() {
    if (agentIdsState !== null) return agentIdsState.slice();
    return (state.config.agentIds || []).slice();
  }
  function toggleAgentId(agentId) {
    var ids = getAgentIds();
    var idx = ids.indexOf(agentId);
    if (idx >= 0) {
      ids.splice(idx, 1);
    } else {
      ids.push(agentId);
    }
    agentIdsState = ids;
    renderScreen('settings');
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
    if (agentIdsState === null) agentIdsState = (state.config.agentIds || []).slice();

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
        patch.agentIds = getAgentIds();

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
