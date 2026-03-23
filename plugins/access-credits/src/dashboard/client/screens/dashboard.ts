export const DASHBOARD_SCREEN = String.raw`
  // ── DASHBOARD SCREEN ───────────────────────────────────────────
  function renderDashboard(main) {
    Promise.all([loadStats(), loadHealth(), loadUsers(0, 5, '')]).then(function(results) {
      var stats = results[0];
      var health = results[1];
      var usersData = results[2];
      state.stats = stats;
      state.health = health;

      var topUsers = (usersData.users || []).sort(function(a, b) { return b.credits - a.credits; });

      main.innerHTML =
        // Header
        '<div class="mb-8">' +
          '<div class="flex items-center justify-between flex-wrap gap-4">' +
            '<div>' +
              '<h1 class="font-headline text-headline-lg text-on-surface">Orchestration Overview</h1>' +
              '<p class="font-body text-body-md text-on-surface-variant mt-1">Real-time performance metrics and system health</p>' +
            '</div>' +
            '<div class="flex items-center gap-3">' +
              '<div class="flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-container-lowest shadow-editorial">' +
                '<span class="w-2 h-2 rounded-full bg-green-500 pulse-dot"></span>' +
                '<span class="font-label text-label-md text-on-surface-variant">System Live</span>' +
              '</div>' +
              '<button onclick="toggleGlobalMode()" class="flex items-center gap-2 px-4 py-2 rounded-full shadow-editorial transition-colors ' +
                (health.mode === 'enforce' ? 'bg-on-tertiary-container text-on-tertiary' : 'bg-surface-container-highest text-on-surface-variant') + '">' +
                icon(health.mode === 'enforce' ? 'shield' : 'visibility', 'sm') +
                '<span class="font-label text-label-md">' + (health.mode === 'enforce' ? 'Enforcing' : 'Observing') + '</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Bento metrics grid
        '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">' +
          // Credits card
          '<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-editorial">' +
            '<div class="flex items-center justify-between mb-4">' +
              '<span class="font-label text-label-md text-on-surface-variant uppercase tracking-wider">Total Credits</span>' +
              icon('account_balance_wallet', 'sm text-on-tertiary-container') +
            '</div>' +
            '<div class="font-headline text-5xl font-extrabold text-on-surface mb-2">' + formatNumber(stats.totalCreditsInCirculation) + '</div>' +
            '<div class="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">' +
              '<div class="h-full bg-on-tertiary-container rounded-full" style="width:' + Math.min(100, (stats.totalCreditsInCirculation || 0) / 100) + '%"></div>' +
            '</div>' +
          '</div>' +

          // Users card
          '<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-editorial">' +
            '<div class="flex items-center justify-between mb-4">' +
              '<span class="font-label text-label-md text-on-surface-variant uppercase tracking-wider">Active Users</span>' +
              icon('group', 'sm text-on-tertiary-container') +
            '</div>' +
            '<div class="font-headline text-5xl font-extrabold text-on-surface mb-2">' + formatNumber(stats.totalUsers) + '</div>' +
            '<div class="flex items-center gap-2">' +
              '<div class="flex -space-x-2">' +
                topUsers.slice(0, 3).map(function(u) {
                  return '<div class="w-6 h-6 rounded-full bg-secondary-container border-2 border-surface-container-lowest flex items-center justify-center text-label-sm font-bold text-on-secondary-container">' +
                    (u.displayName || u.userId).charAt(0).toUpperCase() + '</div>';
                }).join('') +
              '</div>' +
              '<span class="font-label text-label-sm text-on-surface-variant">Monitored</span>' +
            '</div>' +
          '</div>' +

          // Transactions card
          '<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-editorial">' +
            '<div class="flex items-center justify-between mb-4">' +
              '<span class="font-label text-label-md text-on-surface-variant uppercase tracking-wider">Transactions</span>' +
              icon('receipt_long', 'sm text-on-tertiary-container') +
            '</div>' +
            '<div class="font-headline text-5xl font-extrabold text-on-surface mb-2">' + formatNumber(stats.totalTransactions) + '</div>' +
            '<div class="flex items-center gap-2">' +
              badge(health.mode === 'enforce' ? 'Enforcing' : 'Observing',
                health.mode === 'enforce' ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-secondary-container text-on-secondary-container') +
            '</div>' +
          '</div>' +
        '</div>' +

        // Asymmetric grid
        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-5">' +
          // Left: Top users
          '<div class="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-editorial">' +
            '<div class="flex items-center justify-between mb-5">' +
              '<h2 class="font-headline text-headline-sm text-on-surface">Top Contributors</h2>' +
              '<button onclick="navigateTo(\'users\')" class="font-label text-label-md text-on-tertiary-container hover:underline">View All</button>' +
            '</div>' +
            '<div class="space-y-3">' +
              topUsers.map(function(u, i) {
                return '<div class="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors duration-200">' +
                  '<div class="font-mono text-label-sm text-on-surface-variant w-5 text-center">' + (i + 1) + '</div>' +
                  avatar(u.displayName || u.userId, 'w-10 h-10 text-body-md') +
                  '<div class="flex-1 min-w-0">' +
                    '<div class="font-body text-body-md font-medium text-on-surface truncate">' + esc(u.displayName || u.userId) + '</div>' +
                    '<div class="font-label text-label-sm text-on-surface-variant">' + relativeTime(u.lastActivity) + '</div>' +
                  '</div>' +
                  '<div class="text-right">' +
                    '<div class="font-headline text-title-md font-bold text-on-surface">' + formatNumber(u.credits) + '</div>' +
                    '<div class="font-label text-label-sm text-on-surface-variant">credits</div>' +
                  '</div>' +
                '</div>';
              }).join('') +
              (topUsers.length === 0 ? '<p class="text-center py-8 font-body text-body-md text-on-surface-variant">No users yet</p>' : '') +
            '</div>' +
          '</div>' +

          // Right: Quick info
          '<div class="lg:col-span-5 space-y-5">' +
            // Config card
            '<div class="bg-primary-container rounded-2xl p-6 relative overflow-hidden">' +
              '<div class="absolute top-0 right-0 w-32 h-32 bg-on-primary-container/10 rounded-full blur-3xl"></div>' +
              '<div class="relative">' +
                '<span class="font-label text-label-sm text-on-primary-container/70 uppercase tracking-wider">Quick Actions</span>' +
                '<h3 class="font-headline text-headline-sm text-on-primary mt-2 mb-4">System Configuration</h3>' +
                '<div class="space-y-2 mb-5">' +
                  '<div class="flex justify-between font-body text-body-sm text-on-primary/80">' +
                    '<span>Mode</span><span class="font-medium text-on-primary">' + esc(health.mode || 'enforce') + '</span></div>' +
                  '<div class="flex justify-between font-body text-body-sm text-on-primary/80">' +
                    '<span>Cost per message</span><span class="font-medium text-on-primary">' + (state.config.costPerMessage || 1) + ' credit</span></div>' +
                  '<div class="flex justify-between font-body text-body-sm text-on-primary/80">' +
                    '<span>Contributions</span><span class="font-medium text-on-primary">' + (state.config.evaluateContributions ? 'Enabled' : 'Disabled') + '</span></div>' +
                '</div>' +
                '<button onclick="navigateTo(\'settings\')" class="w-full bg-on-primary text-primary-container py-2.5 rounded-xl font-label text-label-lg hover:bg-on-primary/90 transition-colors">Manage Settings</button>' +
              '</div>' +
            '</div>' +

            // System health card
            '<div class="bg-surface-container-low rounded-2xl p-6">' +
              '<div class="flex items-start gap-3 mb-3">' +
                icon('auto_awesome', 'text-on-tertiary-container') +
                '<div>' +
                  '<h3 class="font-headline text-title-md text-on-surface">System Insight</h3>' +
                  '<p class="font-body text-body-sm text-on-surface-variant italic mt-1">' +
                    '"The credit economy is ' + (stats.totalUsers > 0 ? 'active with ' + stats.totalUsers + ' participant' + (stats.totalUsers > 1 ? 's' : '') : 'awaiting its first participants') + '. ' +
                    (stats.totalCreditsInCirculation > 0 ? formatNumber(stats.totalCreditsInCirculation) + ' credits are in circulation.' : 'Configure triggers to start.') + '"' +
                  '</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).catch(function(err) {
      main.innerHTML =
        '<div class="flex flex-col items-center justify-center h-64 gap-4">' +
          '<span class="material-symbols-outlined lg text-error">error</span>' +
          '<p class="font-body text-body-md text-on-surface-variant">Failed to load dashboard: ' + esc(err.message) + '</p>' +
          '<button onclick="renderScreen(\'dashboard\')" class="btn-primary-gradient px-5 py-2 rounded-xl font-label text-label-lg">Retry</button>' +
        '</div>';
    });
  }

  function toggleGlobalMode() {
    var newMode = (state.health && state.health.mode === 'enforce') ? 'observe' : 'enforce';
    saveConfig({ mode: newMode }).then(function(res) {
      state.config = res.config;
      showToast('Mode changed to ' + newMode, 'success');
      renderScreen('dashboard');
    }).catch(function(err) {
      showToast(err.message, 'error');
    });
  }
`;
