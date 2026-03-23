export const API_SCRIPT = String.raw`
  // ── API ────────────────────────────────────────────────────────
  var API_BASE = window.__API_BASE__ || '/plugins/access-credits';

  function apiFetch(path, options) {
    var url = API_BASE + path;
    var opts = Object.assign({
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (window.__AUTH_TOKEN__ || '')
      },
    }, options || {});
    if (opts.body && typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(url, opts).then(function(res) {
      if (!res.ok) {
        return res.json().catch(function() {
          return { error: 'HTTP ' + res.status };
        }).then(function(data) {
          throw new Error(data.error || 'HTTP ' + res.status);
        });
      }
      return res.json();
    });
  }

  function loadStats() {
    return apiFetch('/stats');
  }
  function loadHealth() {
    return apiFetch('/health');
  }
  function loadUsers(offset, limit, q) {
    var params = '?offset=' + (offset || 0) + '&limit=' + (limit || 50);
    if (q) params += '&q=' + encodeURIComponent(q);
    return apiFetch('/users' + params);
  }
  function loadConfig() {
    return apiFetch('/config');
  }
  function loadUserTransactions(userId, limit) {
    return apiFetch('/user/' + encodeURIComponent(userId) + '/transactions?limit=' + (limit || 20));
  }
  function adjustCredits(userId, action, amount, reason) {
    return apiFetch('/user/' + encodeURIComponent(userId), {
      method: 'POST',
      body: { action: action, amount: amount, reason: reason }
    });
  }
  function saveConfig(patch) {
    return apiFetch('/config', { method: 'PATCH', body: patch });
  }
  function loadTemplates() {
    return apiFetch('/prompts');
  }
  function saveTemplates(patch) {
    return apiFetch('/prompts', { method: 'PATCH', body: patch });
  }
  function loadGroups() {
    return apiFetch('/groups');
  }
  function loadTelegramGroups() {
    return apiFetch('/telegram/groups');
  }
  function loadTelegramMe() {
    return apiFetch('/telegram/me');
  }
  function toggleGroup(chatId, enabled) {
    return apiFetch('/groups/toggle', { method: 'POST', body: { chatId: chatId, enabled: enabled } });
  }
  function loadAgents() {
    return apiFetch('/agents');
  }
  function loadEvents() {
    return apiFetch('/events');
  }
  function loadMessaging() {
    return apiFetch('/messaging');
  }
  function saveMessaging(patch) {
    return apiFetch('/messaging', { method: 'PATCH', body: patch });
  }
`;
