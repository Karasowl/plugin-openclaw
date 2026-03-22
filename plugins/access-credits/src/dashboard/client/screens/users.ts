export const USERS_SCREEN = String.raw`
  // ── USERS SCREEN ───────────────────────────────────────────────
  var usersSearchTimer = null;

  function renderUsers(main) {
    Promise.all([loadStats(), loadGroups(), loadEvents()]).then(function(results) {
      state.stats = results[0];
      state.groups = results[1].groups || [];
      state.events = results[1].events || results[2].events || [];

      main.innerHTML = buildUsersShell();
      bindUsersEvents();
      fetchUsersPage();
    }).catch(function(err) {
      main.innerHTML = '<div class="p-8 text-center font-body text-body-md text-on-surface-variant">Failed to load: ' + esc(err.message) + '</div>';
    });
  }

  function buildUsersShell() {
    var stats = state.stats || {};
    return (
      '<div class="mb-8">' +
        '<h1 class="font-headline text-headline-lg text-on-surface">Groups & Users</h1>' +
        '<p class="font-body text-body-md text-on-surface-variant mt-1">Manage individual contributor access and credit assignments</p>' +
      '</div>' +

      // Global metrics
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        metricMini('Monitored Users', formatNumber(stats.totalUsers), 'person') +
        metricMini('Total Credits', formatNumber(stats.totalCreditsInCirculation), 'account_balance_wallet') +
        metricMini('Groups', formatNumber(state.groups.length), 'workspaces') +
        metricMini('Transactions', formatNumber(stats.totalTransactions), 'receipt_long') +
      '</div>' +

      '<div class="grid grid-cols-1 lg:grid-cols-12 gap-5">' +
        // Main user table
        '<div class="lg:col-span-8">' +
          // Search bar
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial mb-5">' +
            '<div class="flex items-center gap-3 px-5 py-3">' +
              icon('search', 'sm text-on-surface-variant') +
              '<input id="user-search" type="text" placeholder="Search users by name or ID..." ' +
                'class="flex-1 bg-transparent font-body text-body-md text-on-surface placeholder:text-outline border-none outline-none" value="' + esc(state.searchQuery) + '">' +
            '</div>' +
          '</div>' +
          // User list
          '<div id="users-list" class="space-y-3"></div>' +
          // Pagination
          '<div id="users-pagination" class="mt-5 flex items-center justify-between"></div>' +
        '</div>' +

        // Events sidebar
        '<div class="lg:col-span-4">' +
          '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5">' +
            '<div class="flex items-center justify-between mb-4">' +
              '<div class="flex items-center gap-2">' +
                '<span class="w-2 h-2 rounded-full bg-green-500 pulse-dot"></span>' +
                '<h3 class="font-headline text-title-md text-on-surface">Live Events</h3>' +
              '</div>' +
            '</div>' +
            '<div id="events-feed" class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar"></div>' +
          '</div>' +

          // Groups section
          (state.groups.length > 0 ?
            '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial p-5 mt-5">' +
              '<h3 class="font-headline text-title-md text-on-surface mb-4">Detected Groups</h3>' +
              '<div class="space-y-3">' +
                state.groups.map(function(g) {
                  return '<div class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors">' +
                    avatar(g.chatTitle, 'w-9 h-9 text-body-sm') +
                    '<div class="flex-1 min-w-0">' +
                      '<div class="font-body text-body-md font-medium text-on-surface truncate">' + esc(g.chatTitle) + '</div>' +
                      '<div class="font-label text-label-sm text-on-surface-variant">' + formatNumber(g.memberCount) + ' members</div>' +
                    '</div>' +
                    badge(g.status, g.status === 'active' ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-surface-container-high text-on-surface-variant') +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function metricMini(label, value, iconName) {
    return '<div class="bg-surface-container-lowest rounded-xl p-4 shadow-editorial">' +
      '<div class="flex items-center gap-2 mb-2">' +
        icon(iconName, 'sm text-on-surface-variant') +
        '<span class="font-label text-label-sm text-on-surface-variant">' + label + '</span>' +
      '</div>' +
      '<div class="font-headline text-headline-sm text-on-surface">' + value + '</div>' +
    '</div>';
  }

  function bindUsersEvents() {
    var searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        state.searchQuery = searchInput.value;
        clearTimeout(usersSearchTimer);
        usersSearchTimer = setTimeout(function() {
          state.pagination.offset = 0;
          fetchUsersPage();
        }, 300);
      });
    }
    renderEventsFeed();
  }

  function renderEventsFeed() {
    var feed = document.getElementById('events-feed');
    if (!feed) return;
    var events = state.events || [];
    if (events.length === 0) {
      feed.innerHTML = '<p class="font-body text-body-sm text-on-surface-variant text-center py-4">No events yet</p>';
      return;
    }
    var eventIcons = {
      user_joined: 'person_add', credits_added: 'add_circle', credits_deducted: 'remove_circle',
      config_changed: 'settings', prompt_deployed: 'rocket_launch', group_detected: 'workspaces',
      contribution_rewarded: 'star'
    };
    var eventColors = {
      user_joined: 'text-on-tertiary-container', credits_added: 'text-green-600', credits_deducted: 'text-error',
      config_changed: 'text-on-surface-variant', prompt_deployed: 'text-on-primary-container',
      group_detected: 'text-secondary', contribution_rewarded: 'text-amber-600'
    };
    feed.innerHTML = events.slice(0, 20).map(function(ev) {
      return '<div class="flex items-start gap-3 p-2">' +
        icon(eventIcons[ev.type] || 'info', 'sm ' + (eventColors[ev.type] || 'text-on-surface-variant')) +
        '<div class="flex-1 min-w-0">' +
          '<div class="font-body text-body-sm text-on-surface">' + esc(ev.description) + '</div>' +
          '<div class="font-label text-label-sm text-on-surface-variant">' + relativeTime(ev.timestamp) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function fetchUsersPage() {
    var list = document.getElementById('users-list');
    if (list) list.innerHTML = '<div class="flex justify-center py-8"><div class="spinner"></div></div>';
    loadUsers(state.pagination.offset, state.pagination.limit, state.searchQuery).then(function(data) {
      state.users = data.users || [];
      state.pagination.total = data.total || 0;
      renderUsersList();
      renderUsersPagination();
    }).catch(function(err) {
      if (list) list.innerHTML = '<p class="text-center py-8 font-body text-body-md text-error">' + esc(err.message) + '</p>';
    });
  }

  function renderUsersList() {
    var list = document.getElementById('users-list');
    if (!list) return;
    if (state.users.length === 0) {
      list.innerHTML = '<div class="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-editorial"><p class="font-body text-body-md text-on-surface-variant">No users found</p></div>';
      return;
    }
    list.innerHTML = state.users.map(function(u) {
      var expanded = state.expandedRows[u.userId];
      return '<div class="bg-surface-container-lowest rounded-2xl shadow-editorial overflow-hidden">' +
        '<div class="flex items-center gap-4 p-4 hover:bg-surface-container-low/50 transition-colors cursor-pointer" onclick="toggleUserRow(\'' + esc(u.userId) + '\')">' +
          avatar(u.displayName || u.userId) +
          '<div class="flex-1 min-w-0">' +
            '<div class="font-body text-body-md font-medium text-on-surface truncate">' + esc(u.displayName || u.userId) + '</div>' +
            '<div class="font-label text-label-sm text-on-surface-variant">ID: ' + esc(u.userId) + '</div>' +
          '</div>' +
          '<div class="hidden sm:flex items-center gap-6 text-right">' +
            '<div><div class="font-headline text-title-md font-bold text-on-surface">' + formatNumber(u.credits) + '</div><div class="font-label text-label-sm text-on-surface-variant">balance</div></div>' +
            '<div><div class="font-body text-body-sm text-on-surface">' + formatNumber(u.totalEarned) + '</div><div class="font-label text-label-sm text-on-surface-variant">earned</div></div>' +
            '<div><div class="font-body text-body-sm text-on-surface">' + formatNumber(u.totalSpent) + '</div><div class="font-label text-label-sm text-on-surface-variant">spent</div></div>' +
          '</div>' +
          '<div class="sm:hidden text-right">' +
            '<div class="font-headline text-title-md font-bold text-on-surface">' + formatNumber(u.credits) + '</div>' +
          '</div>' +
          '<button onclick="event.stopPropagation();showCreditModal(\'' + esc(u.userId) + '\',\'' + esc(u.displayName || u.userId) + '\')" class="ml-2 bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-xl font-label text-label-md hover:opacity-80 transition-opacity">Adjust</button>' +
          '<span class="material-symbols-outlined sm text-on-surface-variant transition-transform ' + (expanded ? 'rotate-180' : '') + '">expand_more</span>' +
        '</div>' +
        (expanded ?
          '<div id="txn-' + esc(u.userId) + '" class="border-t border-outline-variant/20 p-4 bg-surface-container-low/30">' +
            '<div class="flex justify-center py-4"><div class="spinner"></div></div>' +
          '</div>' : '') +
      '</div>';
    }).join('');

    // Load transactions for expanded rows
    Object.keys(state.expandedRows).forEach(function(uid) {
      if (state.expandedRows[uid]) loadTransactionsForUser(uid);
    });
  }

  function toggleUserRow(userId) {
    state.expandedRows[userId] = !state.expandedRows[userId];
    renderUsersList();
  }

  function loadTransactionsForUser(userId) {
    var container = document.getElementById('txn-' + userId);
    if (!container) return;
    loadUserTransactions(userId, 10).then(function(data) {
      var txns = data.transactions || [];
      if (txns.length === 0) {
        container.innerHTML = '<p class="font-body text-body-sm text-on-surface-variant text-center py-2">No transactions</p>';
        return;
      }
      container.innerHTML =
        '<div class="font-label text-label-md text-on-surface-variant mb-2">Recent Transactions</div>' +
        '<div class="space-y-2">' +
          txns.map(function(tx) {
            var isPositive = tx.amount >= 0;
            return '<div class="flex items-center gap-3 py-2">' +
              icon(isPositive ? 'arrow_upward' : 'arrow_downward', 'sm ' + (isPositive ? 'text-green-600' : 'text-error')) +
              '<div class="flex-1 min-w-0">' +
                '<div class="font-body text-body-sm text-on-surface">' + esc(tx.reason) + '</div>' +
                '<div class="font-label text-label-sm text-on-surface-variant">' + relativeTime(tx.timestamp) + ' &middot; ' + esc(tx.type) + '</div>' +
              '</div>' +
              '<div class="font-mono text-body-sm ' + (isPositive ? 'text-green-600' : 'text-error') + '">' +
                (isPositive ? '+' : '') + tx.amount +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
    });
  }

  function showCreditModal(userId, displayName) {
    var bodyHtml =
      '<div class="space-y-4">' +
        '<p class="font-body text-body-md">Adjust credits for <strong>' + esc(displayName) + '</strong></p>' +
        '<div class="flex gap-2">' +
          '<button id="modal-action-add" class="flex-1 py-2 rounded-xl font-label text-label-lg bg-on-tertiary-container text-on-tertiary">Add</button>' +
          '<button id="modal-action-remove" class="flex-1 py-2 rounded-xl font-label text-label-lg bg-surface-container-high text-on-surface">Remove</button>' +
        '</div>' +
        '<input id="modal-amount" type="number" min="1" placeholder="Amount" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
        '<input id="modal-reason" type="text" placeholder="Reason (optional)" class="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-body text-body-md ghost-border ghost-border-focus outline-none">' +
      '</div>';

    showModal('Adjust Credits', bodyHtml, [
      { id: 'modal-cancel', label: 'Cancel', style: 'text', onClick: closeModal },
      { id: 'modal-confirm', label: 'Confirm', style: 'primary', onClick: function() {
        var amount = parseInt(document.getElementById('modal-amount').value, 10);
        var reason = document.getElementById('modal-reason').value || 'Admin adjustment';
        var action = document.getElementById('modal-action-add').classList.contains('bg-on-tertiary-container') ? 'add' : 'remove';
        if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
        adjustCredits(userId, action, amount, reason).then(function(res) {
          showToast('Credits adjusted. New balance: ' + res.balance, 'success');
          closeModal();
          fetchUsersPage();
        }).catch(function(err) { showToast(err.message, 'error'); });
      }},
    ]);

    // Toggle add/remove
    setTimeout(function() {
      var addBtn = document.getElementById('modal-action-add');
      var removeBtn = document.getElementById('modal-action-remove');
      if (addBtn && removeBtn) {
        addBtn.addEventListener('click', function() {
          addBtn.className = 'flex-1 py-2 rounded-xl font-label text-label-lg bg-on-tertiary-container text-on-tertiary';
          removeBtn.className = 'flex-1 py-2 rounded-xl font-label text-label-lg bg-surface-container-high text-on-surface';
        });
        removeBtn.addEventListener('click', function() {
          removeBtn.className = 'flex-1 py-2 rounded-xl font-label text-label-lg bg-error text-on-error';
          addBtn.className = 'flex-1 py-2 rounded-xl font-label text-label-lg bg-surface-container-high text-on-surface';
        });
      }
    }, 50);
  }

  function renderUsersPagination() {
    var container = document.getElementById('users-pagination');
    if (!container) return;
    var total = state.pagination.total;
    var offset = state.pagination.offset;
    var limit = state.pagination.limit;
    var page = Math.floor(offset / limit) + 1;
    var totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    container.innerHTML =
      '<span class="font-label text-label-md text-on-surface-variant">' + total + ' users · Page ' + page + ' of ' + totalPages + '</span>' +
      '<div class="flex gap-2">' +
        '<button ' + (page <= 1 ? 'disabled' : '') + ' onclick="paginateUsers(' + (offset - limit) + ')" class="px-3 py-1.5 rounded-xl font-label text-label-md bg-secondary-container text-on-secondary-container disabled:opacity-40 hover:opacity-80">' + icon('chevron_left', 'sm') + '</button>' +
        '<button ' + (page >= totalPages ? 'disabled' : '') + ' onclick="paginateUsers(' + (offset + limit) + ')" class="px-3 py-1.5 rounded-xl font-label text-label-md bg-secondary-container text-on-secondary-container disabled:opacity-40 hover:opacity-80">' + icon('chevron_right', 'sm') + '</button>' +
      '</div>';
  }

  function paginateUsers(newOffset) {
    state.pagination.offset = Math.max(0, newOffset);
    fetchUsersPage();
  }
`;
