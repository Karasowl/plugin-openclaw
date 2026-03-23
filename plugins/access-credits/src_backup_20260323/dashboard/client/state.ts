export const STATE_SCRIPT = String.raw`
  // ── STATE ──────────────────────────────────────────────────────
  var state = {
    currentScreen: 'dashboard',
    users: [],
    stats: null,
    config: window.__INITIAL_CONFIG__ || {},
    health: null,
    prompts: [],
    groups: [],
    events: [],
    messaging: null,
    pagination: { offset: 0, limit: 50, total: 0 },
    expandedRows: {},
    searchQuery: '',
    loading: {},
    isMobile: window.matchMedia('(max-width: 1023px)').matches,
  };

  window.matchMedia('(max-width: 1023px)').addEventListener('change', function(e) {
    state.isMobile = e.matches;
  });
`;
