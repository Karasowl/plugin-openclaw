export const CLIENT_SCRIPT = String.raw`
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. STATE
  // ---------------------------------------------------------------------------

  var state = {
    currentTab: 'overview',
    users: [],
    stats: null,
    config: window.__INITIAL_CONFIG__ || {},
    pagination: { offset: 0, limit: 50, total: 0 },
    expandedRows: {},
    searchQuery: '',
    loading: { overview: false, users: false, config: false },
    health: null,
  };

  var API_BASE = window.__API_BASE__ || '/plugins/access-credits';

  // ---------------------------------------------------------------------------
  // 2. API
  // ---------------------------------------------------------------------------

  function apiFetch(path, options) {
    var url = API_BASE + path;
    var opts = Object.assign(
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (window.__AUTH_TOKEN__ || '')
        },
      },
      options || {}
    );
    if (opts.body && typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () {
          return { error: 'HTTP ' + res.status };
        }).then(function (data) {
          throw new Error(data.error || 'HTTP ' + res.status);
        });
      }
      return res.json();
    });
  }

  // ---------------------------------------------------------------------------
  // 3. UTILITIES
  // ---------------------------------------------------------------------------

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es');
  }

  function relativeTime(isoString) {
    if (!isoString) return 'Nunca';
    var now = Date.now();
    var then = new Date(isoString).getTime();
    var diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'hace ' + diff + ' seg';
    if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + ' min';
    if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + ' h';
    return 'hace ' + Math.floor(diff / 86400) + ' d';
  }

  function setTextContent(el, text) {
    if (el) el.textContent = text;
  }

  // ---------------------------------------------------------------------------
  // 4. TOAST
  // ---------------------------------------------------------------------------

  function showToast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'success');

    var icon = type === 'error' ? '&#x2716;' : '&#x2714;';
    toast.innerHTML =
      '<span class="toast-icon">' + icon + '</span>' +
      '<span class="toast-message"></span>';

    toast.querySelector('.toast-message').textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('dismissing');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // ---------------------------------------------------------------------------
  // 5. MODAL
  // ---------------------------------------------------------------------------

  var modalConfirmCallback = null;

  function showModal(title, bodyHtml, onConfirm) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    modalConfirmCallback = onConfirm || null;

    var titleEl = overlay.querySelector('.modal-title');
    var bodyEl = overlay.querySelector('.modal-body');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    overlay.classList.remove('hidden');
    overlay.classList.add('open');

    // Focus first input
    var firstInput = overlay.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }

  function hideModal() {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.classList.remove('open');
    modalConfirmCallback = null;
  }

  function initModal() {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    // Build modal structure if not present
    if (!overlay.querySelector('.modal')) {
      overlay.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
          '<div class="modal-header">' +
            '<h2 class="modal-title" id="modal-title"></h2>' +
            '<button class="modal-close" aria-label="Cerrar">&times;</button>' +
          '</div>' +
          '<div class="modal-body"></div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary modal-cancel">Cancelar</button>' +
            '<button class="btn btn-primary modal-confirm">Confirmar</button>' +
          '</div>' +
        '</div>';
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideModal();
    });

    var closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', hideModal);

    var cancelBtn = overlay.querySelector('.modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

    var confirmBtn = overlay.querySelector('.modal-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if (typeof modalConfirmCallback === 'function') {
          modalConfirmCallback();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideModal();
    });
  }

  // ---------------------------------------------------------------------------
  // 6. CREDIT ADJUSTMENT MODAL
  // ---------------------------------------------------------------------------

  function openCreditModal(user) {
    var bodyHtml =
      '<div class="credit-modal">' +
        '<div class="credit-modal-info">' +
          '<span class="credit-modal-label">Usuario:</span>' +
          '<span class="credit-modal-value credit-modal-userid"></span>' +
        '</div>' +
        '<div class="credit-modal-info">' +
          '<span class="credit-modal-label">Balance actual:</span>' +
          '<span class="credit-modal-value credit-modal-balance"></span>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Accion</label>' +
          '<div class="radio-group">' +
            '<label class="radio-label">' +
              '<input type="radio" name="credit-action" value="add" checked> Agregar' +
            '</label>' +
            '<label class="radio-label">' +
              '<input type="radio" name="credit-action" value="remove"> Remover' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="credit-amount">Cantidad</label>' +
          '<input type="number" id="credit-amount" class="form-input" min="1" value="1" placeholder="1">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="credit-reason">Motivo</label>' +
          '<input type="text" id="credit-reason" class="form-input" placeholder="Ajuste manual" value="Ajuste manual">' +
        '</div>' +
      '</div>';

    showModal('Ajustar creditos', bodyHtml, function () {
      var overlay = document.getElementById('modal-overlay');
      if (!overlay) return;

      var actionEl = overlay.querySelector('input[name="credit-action"]:checked');
      var amountEl = document.getElementById('credit-amount');
      var reasonEl = document.getElementById('credit-reason');

      var action = actionEl ? actionEl.value : 'add';
      var amount = amountEl ? parseInt(amountEl.value, 10) : 0;
      var reason = reasonEl ? reasonEl.value.trim() : 'Ajuste manual';

      if (!amount || amount < 1) {
        showToast('La cantidad debe ser mayor a 0', 'error');
        return;
      }
      if (!reason) {
        reason = 'Ajuste manual';
      }

      var confirmBtn = overlay.querySelector('.modal-confirm');
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Procesando...';
      }

      apiFetch('/user/' + encodeURIComponent(user.userId), {
        method: 'POST',
        body: { action: action, amount: amount, reason: reason },
      })
        .then(function (data) {
          hideModal();
          var verb = action === 'add' ? 'agregaron' : 'removieron';
          showToast(
            'Se ' + verb + ' ' + formatNumber(amount) + ' creditos. Nuevo balance: ' + formatNumber(data.balance),
            'success'
          );
          return loadUsers();
        })
        .catch(function (err) {
          showToast(err.message || 'Error al ajustar creditos', 'error');
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar';
          }
        });
    });

    // Set user info after modal is shown (safe textContent assignment)
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      var useridEl = overlay.querySelector('.credit-modal-userid');
      var balanceEl = overlay.querySelector('.credit-modal-balance');
      setTextContent(useridEl, user.displayName || user.userId);
      setTextContent(balanceEl, formatNumber(user.credits) + ' creditos');
    }
  }

  // ---------------------------------------------------------------------------
  // 7. LOADING STATE HELPERS
  // ---------------------------------------------------------------------------

  function loadingHtml(message) {
    return (
      '<div class="loading-state" role="status" aria-live="polite">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<span>' + escapeHtml(message || 'Cargando...') + '</span>' +
      '</div>'
    );
  }

  function errorHtml(message, retryFn) {
    var id = 'retry-btn-' + Date.now();
    return (
      '<div class="error-state">' +
        '<p class="error-state-description"></p>' +
        '<button class="btn btn-secondary" id="' + escapeHtml(id) + '">Reintentar</button>' +
      '</div>'
    );
  }

  function attachRetry(containerId, message, retryFn) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var msgEl = container.querySelector('.error-state-description');
    if (msgEl) msgEl.textContent = message;

    var btn = container.querySelector('.btn-secondary');
    if (btn) btn.addEventListener('click', retryFn);
  }

  // ---------------------------------------------------------------------------
  // 8. RENDER: OVERVIEW
  // ---------------------------------------------------------------------------

  function renderOverview() {
    var main = document.getElementById('main-content');
    if (!main) return;

    var s = state.stats || {};
    var cfg = state.config || {};
    var h = state.health || {};

    main.innerHTML =
      '<section class="tab-panel" id="tab-overview">' +
        '<div class="stats-grid">' +
          '<div class="stat-card">' +
            '<div class="stat-label">Usuarios totales</div>' +
            '<div class="stat-value" id="stat-total-users">' + formatNumber(s.totalUsers) + '</div>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div class="stat-label">Creditos en circulacion</div>' +
            '<div class="stat-value" id="stat-credits">' + formatNumber(s.totalCreditsInCirculation) + '</div>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div class="stat-label">Transacciones totales</div>' +
            '<div class="stat-value" id="stat-transactions">' + formatNumber(s.totalTransactions) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="info-list">' +
          '<div class="info-list-item">' +
            '<span class="info-list-label">Modo actual:</span>' +
            '<span class="badge badge-' + escapeHtml(cfg.mode === 'enforce' ? 'enforce' : 'observe') + '">' +
              escapeHtml(cfg.mode || 'observe') +
            '</span>' +
          '</div>' +
          '<div class="info-list-item">' +
            '<span class="info-list-label">Estado del sistema:</span>' +
            '<span class="health-status" id="health-status">' +
              (state.loading.overview
                ? '<span class="health-dot health-dot-loading"></span>Verificando...'
                : renderHealthStatus(h)) +
            '</span>' +
          '</div>' +
          (h.version
            ? '<div class="info-list-item"><span class="info-list-label">Version:</span><span class="info-list-value" id="health-version"></span></div>'
            : '') +
          (h.lastTransaction
            ? '<div class="info-list-item"><span class="info-list-label">Ultima transaccion:</span><span class="info-list-value">' + relativeTime(h.lastTransaction) + '</span></div>'
            : '') +
        '</div>' +
      '</section>';

    // Safe textContent for version (user-controlled data)
    if (h.version) {
      var versionEl = document.getElementById('health-version');
      setTextContent(versionEl, h.version);
    }
  }

  function renderHealthStatus(h) {
    if (!h || !h.storeStatus) {
      return '<span class="health-dot health-dot-unknown"></span>Desconocido';
    }
    if (h.storeStatus === 'ok') {
      return '<span class="health-dot health-dot-ok"></span>Operativo';
    }
    return '<span class="health-dot health-dot-error"></span>Error';
  }

  // ---------------------------------------------------------------------------
  // 9. RENDER: USERS
  // ---------------------------------------------------------------------------

  var searchDebounceTimer = null;

  function renderUsers() {
    var main = document.getElementById('main-content');
    if (!main) return;

    if (state.loading.users) {
      main.innerHTML =
        '<section class="tab-panel" id="tab-users">' +
          loadingHtml('Cargando usuarios...') +
        '</section>';
      return;
    }

    var html =
      '<section class="tab-panel" id="tab-users">' +
        '<div class="users-toolbar">' +
          '<input' +
            ' type="search"' +
            ' id="user-search"' +
            ' class="search-input"' +
            ' placeholder="Buscar por usuario o nombre..."' +
            ' aria-label="Buscar usuarios"' +
            ' value=""' +
          '>' +
        '</div>' +
        '<div id="users-table-container">' +
          buildUsersTableHtml() +
        '</div>' +
        buildPaginationHtml() +
      '</section>';

    main.innerHTML = html;

    // Restore search query
    var searchEl = document.getElementById('user-search');
    if (searchEl) {
      searchEl.value = state.searchQuery;
      searchEl.addEventListener('input', function (e) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
          state.searchQuery = e.target.value;
          state.pagination.offset = 0;
          loadUsers();
        }, 300);
      });
    }

    attachUsersTableEvents();
    attachPaginationEvents();
  }

  function buildUsersTableHtml() {
    var users = state.users;

    if (!users || users.length === 0) {
      return (
        '<div class="empty-state">' +
          '<p class="empty-state-description">No hay usuarios registrados aun</p>' +
        '</div>'
      );
    }

    var rows = users.map(function (u) {
      var expandedContent = '';
      if (state.expandedRows[u.userId]) {
        expandedContent = buildTransactionRowHtml(u.userId);
      }
      return (
        '<tr class="user-row" data-userid="' + escapeHtml(u.userId) + '" tabindex="0" role="button" aria-expanded="' + (state.expandedRows[u.userId] ? 'true' : 'false') + '">' +
          '<td class="td-user">' +
            '<span class="user-name"></span>' +
            '<span class="user-id"></span>' +
          '</td>' +
          '<td class="td-balance td-number">' + formatNumber(u.credits) + '</td>' +
          '<td class="td-earned td-number">' + formatNumber(u.totalEarned) + '</td>' +
          '<td class="td-spent td-number">' + formatNumber(u.totalSpent) + '</td>' +
          '<td class="td-activity">' + relativeTime(u.lastActivity) + '</td>' +
          '<td class="td-actions">' +
            '<button class="btn btn-sm btn-primary adjust-btn" data-userid="' + escapeHtml(u.userId) + '" aria-label="Ajustar creditos de usuario">Ajustar</button>' +
          '</td>' +
        '</tr>' +
        (state.expandedRows[u.userId]
          ? '<tr class="transaction-row" data-for="' + escapeHtml(u.userId) + '"><td colspan="6">' + expandedContent + '</td></tr>'
          : '')
      );
    });

    var tableHtml =
      '<div class="table-wrapper" role="region" aria-label="Tabla de usuarios" tabindex="0">' +
        '<table class="users-table">' +
          '<thead>' +
            '<tr>' +
              '<th scope="col">Usuario</th>' +
              '<th scope="col" class="th-number">Balance</th>' +
              '<th scope="col" class="th-number">Ganado</th>' +
              '<th scope="col" class="th-number">Gastado</th>' +
              '<th scope="col">Ultima Actividad</th>' +
              '<th scope="col">Acciones</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + rows.join('') + '</tbody>' +
        '</table>' +
      '</div>';

    return tableHtml;
  }

  function buildTransactionRowHtml(userId) {
    var txData = state.expandedRows[userId];
    if (txData === true || txData === 'loading') {
      return loadingHtml('Cargando transacciones...');
    }
    if (txData && txData.error) {
      return '<div class="error-state"><p class="error-state-description"></p></div>';
    }
    var transactions = txData && txData.transactions ? txData.transactions : [];
    if (transactions.length === 0) {
      return '<div class="empty-state"><p>No hay transacciones para este usuario.</p></div>';
    }

    var txRows = transactions.map(function (tx) {
      var amountClass = tx.amount >= 0 ? 'tx-positive' : 'tx-negative';
      var amountStr = (tx.amount >= 0 ? '+' : '') + formatNumber(tx.amount);
      return (
        '<tr>' +
          '<td class="td-tx-type">' + escapeHtml(tx.type) + '</td>' +
          '<td class="td-tx-amount ' + amountClass + '">' + amountStr + '</td>' +
          '<td class="td-tx-balance">' + formatNumber(tx.balance) + '</td>' +
          '<td class="td-tx-reason"></td>' +
          '<td class="td-tx-time">' + relativeTime(tx.timestamp) + '</td>' +
        '</tr>'
      );
    });

    return (
      '<div class="transaction-panel">' +
        '<h3 class="transaction-panel-title">Ultimas transacciones</h3>' +
        '<table class="tx-table">' +
          '<thead>' +
            '<tr>' +
              '<th>Tipo</th><th>Cantidad</th><th>Balance</th><th>Motivo</th><th>Tiempo</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + txRows.join('') + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function refreshUsersTable() {
    var container = document.getElementById('users-table-container');
    if (!container) return;
    container.innerHTML = buildUsersTableHtml();
    attachUsersTableEvents();
    populateUserNames();
  }

  function populateUserNames() {
    var rows = document.querySelectorAll('.user-row');
    rows.forEach(function (row) {
      var userId = row.getAttribute('data-userid');
      var user = state.users.find(function (u) { return u.userId === userId; });
      if (!user) return;
      var nameEl = row.querySelector('.user-name');
      var idEl = row.querySelector('.user-id');
      setTextContent(nameEl, user.displayName || user.userId);
      if (user.displayName) setTextContent(idEl, user.userId);
    });

    // Populate transaction reason cells (textContent for safety)
    var reasonCells = document.querySelectorAll('.td-tx-reason');
    reasonCells.forEach(function (cell) {
      // reason will be set by the transaction data after fetch
    });

    // Populate error messages in expanded transaction rows
    var errorMsgs = document.querySelectorAll('.transaction-row .error-state-description');
    errorMsgs.forEach(function (el) {
      var parentRow = el.closest('.transaction-row');
      if (!parentRow) return;
      var userId = parentRow.getAttribute('data-for');
      var txData = state.expandedRows[userId];
      if (txData && txData.error) setTextContent(el, txData.error);
    });
  }

  function attachUsersTableEvents() {
    populateUserNames();

    // Row click -> toggle transactions
    var rows = document.querySelectorAll('.user-row');
    rows.forEach(function (row) {
      row.addEventListener('click', function (e) {
        // Don't toggle if clicking the adjust button
        if (e.target.closest('.adjust-btn')) return;
        var userId = row.getAttribute('data-userid');
        toggleTransactions(userId);
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (e.target.closest('.adjust-btn')) return;
          var userId = row.getAttribute('data-userid');
          toggleTransactions(userId);
        }
      });
    });

    // Adjust buttons
    var adjustBtns = document.querySelectorAll('.adjust-btn');
    adjustBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var userId = btn.getAttribute('data-userid');
        var user = state.users.find(function (u) { return u.userId === userId; });
        if (user) openCreditModal(user);
      });
    });
  }

  function toggleTransactions(userId) {
    if (state.expandedRows[userId] && state.expandedRows[userId] !== 'loading') {
      // Collapse
      delete state.expandedRows[userId];
      refreshUsersTable();
      return;
    }

    // Expand: mark loading then fetch
    state.expandedRows[userId] = 'loading';
    refreshUsersTable();

    apiFetch('/user/' + encodeURIComponent(userId) + '/transactions?limit=10')
      .then(function (data) {
        state.expandedRows[userId] = data;
        refreshUsersTable();
        // Populate reason cells after refresh
        populateTransactionReasons(userId);
      })
      .catch(function (err) {
        state.expandedRows[userId] = { error: err.message || 'Error al cargar transacciones' };
        refreshUsersTable();
      });
  }

  function populateTransactionReasons(userId) {
    var txData = state.expandedRows[userId];
    if (!txData || !txData.transactions) return;
    var txRow = document.querySelector('.transaction-row[data-for="' + CSS.escape(userId) + '"]');
    if (!txRow) return;
    var reasonCells = txRow.querySelectorAll('.td-tx-reason');
    txData.transactions.forEach(function (tx, i) {
      if (reasonCells[i]) setTextContent(reasonCells[i], tx.reason || '');
    });
  }

  function buildPaginationHtml() {
    var p = state.pagination;
    var total = p.total || state.users.length;
    if (total <= p.limit) return '';

    var currentPage = Math.floor(p.offset / p.limit) + 1;
    var totalPages = Math.ceil(total / p.limit);

    return (
      '<div class="pagination" role="navigation" aria-label="Paginacion">' +
        '<button class="btn btn-secondary pagination-prev" ' + (p.offset === 0 ? 'disabled' : '') + ' aria-label="Pagina anterior">Anterior</button>' +
        '<span class="pagination-info">Pagina ' + currentPage + ' de ' + totalPages + '</span>' +
        '<button class="btn btn-secondary pagination-next" ' + (p.offset + p.limit >= total ? 'disabled' : '') + ' aria-label="Pagina siguiente">Siguiente</button>' +
      '</div>'
    );
  }

  function attachPaginationEvents() {
    var prevBtn = document.querySelector('.pagination-prev');
    var nextBtn = document.querySelector('.pagination-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (state.pagination.offset > 0) {
          state.pagination.offset = Math.max(0, state.pagination.offset - state.pagination.limit);
          loadUsers();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        var p = state.pagination;
        var total = p.total || state.users.length;
        if (p.offset + p.limit < total) {
          state.pagination.offset += state.pagination.limit;
          loadUsers();
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 10. RENDER: CONFIG
  // ---------------------------------------------------------------------------

  function renderConfig() {
    var main = document.getElementById('main-content');
    if (!main) return;

    if (state.loading.config) {
      main.innerHTML =
        '<section class="tab-panel" id="tab-config">' +
          loadingHtml('Cargando configuracion...') +
        '</section>';
      return;
    }

    var cfg = state.config || {};

    var html =
      '<section class="tab-panel" id="tab-config">' +
        '<form class="config-form" id="config-form" novalidate>' +
          '<div class="config-section">' +
            '<h2 class="form-section-title">Modo de operacion</h2>' +
            '<div class="form-group">' +
              '<label class="form-label" for="cfg-mode">Modo</label>' +
              '<select id="cfg-mode" name="mode" class="form-select">' +
                '<option value="observe" ' + (cfg.mode === 'observe' ? 'selected' : '') + '>observe - Solo registra, no bloquea</option>' +
                '<option value="enforce" ' + (cfg.mode === 'enforce' ? 'selected' : '') + '>enforce - Bloquea si no hay creditos</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          '<div class="config-section">' +
            '<h2 class="form-section-title">Creditos</h2>' +
            '<div class="form-row">' +
              '<div class="form-group">' +
                '<label class="form-label" for="cfg-initial">Creditos iniciales</label>' +
                '<input type="number" id="cfg-initial" name="initialCredits" class="form-input" min="0" value="' + escapeHtml(String(cfg.initialCredits ?? 10)) + '">' +
              '</div>' +
              '<div class="form-group">' +
                '<label class="form-label" for="cfg-cost">Costo por mensaje</label>' +
                '<input type="number" id="cfg-cost" name="costPerMessage" class="form-input" min="0" value="' + escapeHtml(String(cfg.costPerMessage ?? 1)) + '">' +
              '</div>' +
              '<div class="form-group">' +
                '<label class="form-label" for="cfg-cooldown">Cooldown (segundos)</label>' +
                '<input type="number" id="cfg-cooldown" name="cooldownSeconds" class="form-input" min="0" value="' + escapeHtml(String(cfg.cooldownSeconds ?? 0)) + '">' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="config-section">' +
            '<h2 class="form-section-title">Contribuciones</h2>' +
            '<div class="form-group form-checkbox-group">' +
              '<label class="form-checkbox-label">' +
                '<input type="checkbox" id="cfg-eval" name="evaluateContributions" ' + (cfg.evaluateContributions ? 'checked' : '') + '>' +
                '<span>Evaluar contribuciones</span>' +
              '</label>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group">' +
                '<label class="form-label" for="cfg-reward">Recompensa por contribucion</label>' +
                '<input type="number" id="cfg-reward" name="contributionReward" class="form-input" min="0" value="' + escapeHtml(String(cfg.contributionReward ?? 2)) + '">' +
              '</div>' +
              '<div class="form-group">' +
                '<label class="form-label" for="cfg-minlen">Longitud minima de contribucion</label>' +
                '<input type="number" id="cfg-minlen" name="contributionMinLength" class="form-input" min="0" value="' + escapeHtml(String(cfg.contributionMinLength ?? 100)) + '">' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="config-section">' +
            '<h2 class="form-section-title">Activacion</h2>' +
            '<div class="form-group">' +
              '<label class="form-label" for="cfg-hashtags">Hashtags de activacion <span class="form-hint">(separados por coma)</span></label>' +
              '<input type="text" id="cfg-hashtags" name="triggerHashtags" class="form-input" placeholder="#ask, #bot" value="' + escapeHtml((cfg.triggerHashtags || []).join(', ')) + '">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="cfg-commands">Comandos de activacion <span class="form-hint">(separados por coma)</span></label>' +
              '<input type="text" id="cfg-commands" name="triggerCommands" class="form-input" placeholder="/ask, /bot" value="' + escapeHtml((cfg.triggerCommands || []).join(', ')) + '">' +
            '</div>' +
          '</div>' +

          '<div class="config-section">' +
            '<h2 class="form-section-title">Administracion</h2>' +
            '<div class="form-group">' +
              '<label class="form-label" for="cfg-admins">Usuarios administradores <span class="form-hint">(uno por linea)</span></label>' +
              '<textarea id="cfg-admins" name="adminUsers" class="form-textarea" rows="4" placeholder="user123, user456"></textarea>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="cfg-fallback">Modelo de fallback</label>' +
              '<input type="text" id="cfg-fallback" name="fallbackModel" class="form-input" placeholder="cheapest" value="' + escapeHtml(cfg.fallbackModel || '') + '">' +
            '</div>' +
          '</div>' +

          '<div class="form-actions">' +
            '<p class="form-note">Los cambios aplican al proximo mensaje</p>' +
            '<button type="submit" class="btn btn-primary btn-lg" id="save-config-btn">Guardar</button>' +
          '</div>' +
        '</form>' +
      '</section>';

    main.innerHTML = html;

    // Set admin users textarea safely
    var adminsEl = document.getElementById('cfg-admins');
    if (adminsEl) adminsEl.value = (cfg.adminUsers || []).join('\n');

    attachConfigFormEvents();
  }

  function attachConfigFormEvents() {
    var form = document.getElementById('config-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      saveConfig();
    });
  }

  function saveConfig() {
    var form = document.getElementById('config-form');
    if (!form) return;

    var saveBtn = document.getElementById('save-config-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';
    }

    function getVal(id) {
      var el = document.getElementById(id);
      return el ? el.value : '';
    }

    function getNum(id) {
      var val = parseInt(getVal(id), 10);
      return isNaN(val) ? 0 : Math.max(0, val);
    }

    function getChecked(id) {
      var el = document.getElementById(id);
      return el ? el.checked : false;
    }

    function splitComma(str) {
      return str.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function splitLines(str) {
      return str.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    var payload = {
      mode: getVal('cfg-mode'),
      initialCredits: getNum('cfg-initial'),
      costPerMessage: getNum('cfg-cost'),
      cooldownSeconds: getNum('cfg-cooldown'),
      evaluateContributions: getChecked('cfg-eval'),
      contributionReward: getNum('cfg-reward'),
      contributionMinLength: getNum('cfg-minlen'),
      triggerHashtags: splitComma(getVal('cfg-hashtags')),
      triggerCommands: splitComma(getVal('cfg-commands')),
      adminUsers: splitLines(getVal('cfg-admins')),
      fallbackModel: getVal('cfg-fallback').trim(),
    };

    apiFetch('/config', { method: 'PATCH', body: payload })
      .then(function (data) {
        if (data.errors && data.errors.length > 0) {
          showToast('Errores: ' + data.errors.join(', '), 'error');
        } else {
          state.config = data.config || payload;
          showToast('Configuracion guardada correctamente', 'success');
        }
      })
      .catch(function (err) {
        showToast(err.message || 'Error al guardar la configuracion', 'error');
      })
      .finally(function () {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Guardar';
        }
      });
  }

  // ---------------------------------------------------------------------------
  // 11. ROUTER
  // ---------------------------------------------------------------------------

  function showTab(tab) {
    state.currentTab = tab;

    // Update nav
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      var isActive = item.getAttribute('data-tab') === tab;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });

    // Render tab
    switch (tab) {
      case 'overview':
        renderOverview();
        break;
      case 'users':
        if (state.users.length === 0 && !state.loading.users) {
          loadUsers().then(renderUsers);
        } else {
          renderUsers();
        }
        break;
      case 'config':
        renderConfig();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // 12. DATA LOADING
  // ---------------------------------------------------------------------------

  function loadStats() {
    return apiFetch('/stats')
      .then(function (data) {
        state.stats = data;
      })
      .catch(function (err) {
        console.error('[access-credits] loadStats error:', err.message);
      });
  }

  function loadUsers() {
    state.loading.users = true;
    var p = state.pagination;
    var path = '/users?offset=' + p.offset + '&limit=' + p.limit;
    if (state.searchQuery) {
      path += '&q=' + encodeURIComponent(state.searchQuery);
    }
    return apiFetch(path)
      .then(function (data) {
        state.users = data.users || [];
        state.pagination.total = data.total || state.users.length;
        state.loading.users = false;
        if (state.currentTab === 'users') renderUsers();
      })
      .catch(function (err) {
        state.loading.users = false;
        console.error('[access-credits] loadUsers error:', err.message);
        if (state.currentTab === 'users') {
          var main = document.getElementById('main-content');
          if (main) {
            main.innerHTML =
              '<section class="tab-panel" id="tab-users">' +
                '<div class="error-state" id="users-error">' +
                  '<p class="error-state-description"></p>' +
                  '<button class="btn btn-secondary" id="users-retry">Reintentar</button>' +
                '</div>' +
              '</section>';
            setTextContent(document.querySelector('#users-error .error-state-description'), err.message || 'Error al cargar usuarios');
            var retryBtn = document.getElementById('users-retry');
            if (retryBtn) retryBtn.addEventListener('click', loadUsers);
          }
        }
      });
  }

  function loadConfig() {
    state.loading.config = true;
    return apiFetch('/config')
      .then(function (data) {
        state.config = data.config || data;
        state.loading.config = false;
        if (state.currentTab === 'config') renderConfig();
      })
      .catch(function (err) {
        state.loading.config = false;
        console.error('[access-credits] loadConfig error:', err.message);
        if (state.currentTab === 'config') {
          var main = document.getElementById('main-content');
          if (main) {
            main.innerHTML =
              '<section class="tab-panel" id="tab-config">' +
                '<div class="error-state" id="config-error">' +
                  '<p class="error-state-description"></p>' +
                  '<button class="btn btn-secondary" id="config-retry">Reintentar</button>' +
                '</div>' +
              '</section>';
            setTextContent(document.querySelector('#config-error .error-state-description'), err.message || 'Error al cargar configuracion');
            var retryBtn = document.getElementById('config-retry');
            if (retryBtn) retryBtn.addEventListener('click', function () { loadConfig().then(renderConfig); });
          }
        }
      });
  }

  function loadHealth() {
    return apiFetch('/health')
      .then(function (data) {
        state.health = data;
        if (state.currentTab === 'overview') {
          var healthEl = document.getElementById('health-status');
          if (healthEl) healthEl.innerHTML = renderHealthStatus(data);
          var versionEl = document.getElementById('health-version');
          if (versionEl) setTextContent(versionEl, data.version || '');
        }
      })
      .catch(function (err) {
        console.error('[access-credits] loadHealth error:', err.message);
      });
  }

  // ---------------------------------------------------------------------------
  // 13. NAV SETUP
  // ---------------------------------------------------------------------------

  function setupNav() {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      item.setAttribute('role', 'tab');
      item.addEventListener('click', function () {
        var tab = item.getAttribute('data-tab');
        if (tab) showTab(tab);
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var tab = item.getAttribute('data-tab');
          if (tab) showTab(tab);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 14. INIT
  // ---------------------------------------------------------------------------

  function init() {
    initModal();
    setupNav();

    // Load all data in parallel
    Promise.all([
      loadStats(),
      loadUsers(),
      loadConfig(),
      loadHealth(),
    ]).then(function () {
      showTab('overview');
    }).catch(function (err) {
      console.error('[access-credits] init error:', err.message);
      showTab('overview');
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
