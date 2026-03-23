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
    var c = state.config || {};
    var groups = c.groups || {};
    var dm = c.directMessages || {};
    return (
      '<div class="mb-8">' +
        '<h1 class="font-headline text-headline-lg text-on-surface">Settings</h1>' +
        '<p class="font-body text-body-md text-on-surface-variant mt-1">Configure the access credits system behavior</p>' +
      '</div>' +

      '<div class="space-y-5 max-w-4xl">' +

        settingsCard('Operation Mode', 'tune',
          settingsToggle(
            'toggle-mode',
            'Enforcement Mode',
            '<strong>Enforce</strong>: users without credits are blocked. <strong>Observe</strong>: interactions are tracked but never blocked.',
            c.mode === 'enforce',
            c.mode === 'enforce' ? 'Enforcing' : 'Observing'
          )
        ) +

        (function() {
          var allAgents = (c.agentIds || []).slice();
          (state.seenAgents || []).forEach(function(a) {
            if (allAgents.indexOf(a) < 0) allAgents.push(a);
          });
          var currentAgentIds = getAgentIds();

          return settingsCard('Agent Selection', 'smart_toy',
            '<p class="font-body text-body-sm text-on-surface-variant mb-4">Select which OpenClaw agents use the credit system. When none are selected, the credit system is active for all agents.</p>' +
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
                    '<div onclick="toggleAgentId(\'' + esc(agentId) + '\')" class="toggle-track ' + (isActive ? 'active' : '') + '">' +
                      '<div class="toggle-thumb"></div>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>' +
              '<div class="font-label text-label-sm text-on-surface-variant">' +
                (currentAgentIds.length > 0 ? 'Credit system active for: ' + currentAgentIds.join(', ') : 'No agents selected: credit system active for all agents') +
              '</div>'
            :
              '<div class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low mb-4">' +
                icon('info', 'sm text-on-surface-variant') +
                '<span class="font-body text-body-sm text-on-surface-variant">No agents detected yet. Agents will appear here after they process their first message.</span>' +
              '</div>'
            )
          );
        })() +

        settingsCard('Shared Economy', 'payments',
          settingsInput('initial-credits', 'Initial Credits', 'Credits granted to new users on their first interaction with the bot.', c.initialCredits, 'number') +
          settingsInput('contribution-reward', 'Contribution Reward', 'Credits awarded when the AI determines a message is a valuable contribution.', c.contributionReward, 'number') +
          settingsInput('contribution-min-length', 'Contribution Minimum Length', 'Messages shorter than this are never evaluated for contribution rewards.', c.contributionMinLength, 'number')
        ) +

        settingsCard('Group Chats', 'groups',
          settingsToggle(
            'toggle-groups-enabled',
            'Enable Group Credit Gate',
            'When disabled, group conversations bypass credit checks entirely.',
            groups.enabled !== false,
            groups.enabled !== false ? 'Enabled' : 'Disabled'
          ) +
          settingsInput('groups-cost-per-message', 'Cost Per Message', 'Credits deducted for each triggered bot interaction in group chats.', groups.costPerMessage, 'number') +
          settingsSelect('groups-evaluate-contributions', 'Contribution Evaluation', 'How contribution rewards should behave in group chats.', [
            { value: 'always', label: 'Always auto-award' },
            { value: 'groups-only', label: 'Groups-only compatibility mode' },
            { value: 'admin-only', label: 'Admin-only manual awards' },
            { value: 'off', label: 'Off' }
          ], groups.evaluateContributions || 'always') +
          settingsInput('groups-cooldown-seconds', 'Cooldown (seconds)', 'Minimum time between group interactions for the same user. Set to 0 to disable.', groups.cooldownSeconds, 'number')
        ) +

        settingsCard('Direct Messages', 'chat',
          settingsToggle(
            'toggle-dm-enabled',
            'Enable Direct Message Credit Gate',
            'When disabled, direct messages bypass credit checks entirely.',
            dm.enabled !== false,
            dm.enabled !== false ? 'Enabled' : 'Disabled'
          ) +
          settingsToggle(
            'toggle-dm-model-choice',
            'Allow /model Selection',
            'Users can switch DM response models with /model and each model can have its own credit cost.',
            dm.allowModelChoice === true,
            dm.allowModelChoice ? 'Enabled' : 'Disabled'
          ) +
          settingsInput('dm-cost-per-message', 'Base Cost Per Message', 'Fallback credit cost for DMs when model choice is disabled.', dm.costPerMessage, 'number') +
          settingsSelect('dm-evaluate-contributions', 'Contribution Evaluation', 'How contribution rewards should behave in direct messages.', [
            { value: 'always', label: 'Always auto-award' },
            { value: 'groups-only', label: 'Groups-only compatibility mode' },
            { value: 'admin-only', label: 'Admin-only manual awards' },
            { value: 'off', label: 'Off' }
          ], dm.evaluateContributions || 'admin-only') +
          settingsInput('dm-cooldown-seconds', 'Cooldown (seconds)', 'Minimum time between direct-message interactions for the same user. Set to 0 to disable.', dm.cooldownSeconds, 'number') +
          settingsInput('dm-default-model', 'Default Model Alias', 'Alias used when a DM user has not selected a model explicitly.', dm.defaultModel, 'text') +
          settingsTextarea('dm-models-json', 'Available Models (JSON)', 'Map aliases to { label, model, costPerMessage }. This powers /model in direct messages.', stringifyModels(dm.models))
        ) +

        settingsCard('Activation Triggers', 'tag',
          '<p class="font-body text-body-sm text-on-surface-variant mb-4">The credit system only activates when a message contains one of these hashtags or commands. Messages without triggers pass through normally without deducting credits.</p>' +
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

        settingsCard('Administration', 'admin_panel_settings',
          '<div class="mb-4">' +
            '<label class="font-label text-label-md text-on-surface-variant block mb-2">Admin Users</label>' +
            '<p class="font-body text-body-sm text-on-surface-variant/70 mb-2">Admin users bypass all credit checks. They can use the bot without spending credits.</p>' +
            '<div id="chips-admins" class="flex flex-wrap gap-2 mb-2">' +
              (c.adminUsers || []).map(function(a) { return chipHtml(a, 'admins'); }).join('') +
            '</div>' +
            '<div class="flex gap-2">' +
              '<input id="input-admin" type="text" placeholder="Telegram User ID" class="flex-1 px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
              '<button onclick="addChip(\'admins\',\'input-admin\')" class="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-xl font-label text-label-md">Add</button>' +
            '</div>' +
          '</div>' +
          settingsInput('fallback-model', 'Fallback Model', 'Model used when a user is blocked, to minimize wasted token cost.', c.fallbackModel, 'text')
        ) +

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

  function settingsToggle(id, title, desc, isActive, badgeText) {
    return '<div class="flex items-center justify-between mb-4">' +
      '<div class="pr-4">' +
        '<div class="font-body text-body-md text-on-surface">' + title + '</div>' +
        '<div class="font-body text-body-sm text-on-surface-variant">' + desc + '</div>' +
        '<div class="mt-2">' + badge(esc(badgeText), isActive ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-secondary-container text-on-secondary-container') + '</div>' +
      '</div>' +
      '<div id="' + id + '" class="toggle-track ' + (isActive ? 'active' : '') + '">' +
        '<div class="toggle-thumb"></div>' +
      '</div>' +
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

  function settingsTextarea(id, label, desc, value) {
    return '<div class="mb-4">' +
      '<label for="cfg-' + id + '" class="font-label text-label-md text-on-surface-variant block mb-1.5">' + label + '</label>' +
      (desc ? '<div class="font-body text-body-sm text-on-surface-variant/70 mb-2">' + desc + '</div>' : '') +
      '<textarea id="cfg-' + id + '" rows="10" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-mono text-body-sm ghost-border ghost-border-focus outline-none transition-colors duration-200">' + esc(value || '') + '</textarea>' +
    '</div>';
  }

  function settingsSelect(id, label, desc, options, selectedValue) {
    return '<div class="mb-4">' +
      '<label for="cfg-' + id + '" class="font-label text-label-md text-on-surface-variant block mb-1.5">' + label + '</label>' +
      (desc ? '<div class="font-body text-body-sm text-on-surface-variant/70 mb-2">' + desc + '</div>' : '') +
      '<select id="cfg-' + id + '" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none transition-colors duration-200">' +
        options.map(function(option) {
          return '<option value="' + esc(option.value) + '"' + (option.value === selectedValue ? ' selected' : '') + '>' + esc(option.label) + '</option>';
        }).join('') +
      '</select>' +
    '</div>';
  }

  function stringifyModels(models) {
    try {
      return JSON.stringify(models || {}, null, 2);
    } catch (_err) {
      return '{}';
    }
  }

  function chipHtml(text, group) {
    return '<span class="chip bg-secondary-container text-on-secondary-container">' +
      esc(text) +
      '<span class="chip-remove" onclick="removeChip(\'' + group + '\',\'' + esc(text) + '\')">&times;</span>' +
    '</span>';
  }

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

  var chipState = {};

  function getChips(group) {
    if (chipState[group]) return chipState[group].slice();
    var c = state.config || {};
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

  function bindToggle(id) {
    var toggle = document.getElementById(id);
    if (!toggle) return;
    toggle.addEventListener('click', function() {
      toggle.classList.toggle('active');
    });
  }

  function readToggle(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.classList.contains('active') : fallback;
  }

  function readNumber(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    var value = parseInt(el.value, 10);
    return isNaN(value) ? fallback : value;
  }

  function readString(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    return el.value ? el.value.trim() : fallback;
  }

  function readSelect(id, fallback) {
    var el = document.getElementById(id);
    return el && el.value ? el.value : fallback;
  }

  function bindSettingsEvents() {
    chipState = {};
    if (agentIdsState === null) agentIdsState = (state.config.agentIds || []).slice();

    bindToggle('toggle-mode');
    bindToggle('toggle-groups-enabled');
    bindToggle('toggle-dm-enabled');
    bindToggle('toggle-dm-model-choice');

    var saveBtn = document.getElementById('save-config-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var dmModelsText = readString('dm-models-json', '{}');
        var parsedDmModels;
        try {
          parsedDmModels = JSON.parse(dmModelsText || '{}');
        } catch (_err) {
          showToast('Direct-message models JSON is invalid.', 'error');
          return;
        }

        var patch = {
          mode: readToggle('toggle-mode', state.config.mode === 'enforce') ? 'enforce' : 'observe',
          initialCredits: readNumber('initial-credits', 10),
          contributionReward: readNumber('contribution-reward', 2),
          contributionMinLength: readNumber('contribution-min-length', 100),
          fallbackModel: readString('fallback-model', 'cheapest'),
          triggerHashtags: getChips('hashtags'),
          triggerCommands: getChips('commands'),
          adminUsers: getChips('admins'),
          agentIds: getAgentIds(),
          groups: {
            enabled: readToggle('toggle-groups-enabled', true),
            costPerMessage: readNumber('groups-cost-per-message', 1),
            evaluateContributions: readSelect('groups-evaluate-contributions', 'always'),
            cooldownSeconds: readNumber('groups-cooldown-seconds', 0)
          },
          directMessages: {
            enabled: readToggle('toggle-dm-enabled', true),
            allowModelChoice: readToggle('toggle-dm-model-choice', false),
            costPerMessage: readNumber('dm-cost-per-message', 1),
            evaluateContributions: readSelect('dm-evaluate-contributions', 'admin-only'),
            cooldownSeconds: readNumber('dm-cooldown-seconds', 0),
            defaultModel: readString('dm-default-model', 'sonnet'),
            models: parsedDmModels
          }
        };

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
