import { STATE_SCRIPT } from "./state.js";
import { API_SCRIPT } from "./api.js";
import { UTILS_SCRIPT } from "./utils.js";
import { TOAST_SCRIPT } from "./components/toast.js";
import { MODAL_SCRIPT } from "./components/modal.js";
import { SIDEBAR_SCRIPT } from "./components/sidebar.js";
import { BOTTOM_NAV_SCRIPT } from "./components/bottom-nav.js";
import { ROUTER_SCRIPT } from "./router.js";
import { DASHBOARD_SCREEN } from "./screens/dashboard.js";
import { USERS_SCREEN } from "./screens/users.js";
import { CONFIG_SCREEN } from "./screens/config.js";
import { PROMPTS_SCREEN } from "./screens/prompts.js";
import { MESSAGING_SCREEN } from "./screens/messaging.js";

export const CLIENT_SCRIPT = `(function(){
  'use strict';
${STATE_SCRIPT}
${API_SCRIPT}
${UTILS_SCRIPT}
${TOAST_SCRIPT}
${MODAL_SCRIPT}
${SIDEBAR_SCRIPT}
${BOTTOM_NAV_SCRIPT}
${ROUTER_SCRIPT}
${DASHBOARD_SCREEN}
${USERS_SCREEN}
${CONFIG_SCREEN}
${PROMPTS_SCREEN}
${MESSAGING_SCREEN}

  // ── EXPOSE FUNCTIONS FOR INLINE ONCLICK HANDLERS ────────────────
  window.navigateTo = navigateTo;
  window.renderScreen = renderScreen;
  window.toggleUserRow = toggleUserRow;
  window.showCreditModal = showCreditModal;
  window.paginateUsers = paginateUsers;
  window.addChip = addChip;
  window.removeChip = removeChip;
  window.closeModal = closeModal;
  window.refreshTelegramGroups = refreshTelegramGroups;
  window.toggleGroupEnabled = toggleGroupEnabled;
  window.toggleAgentId = toggleAgentId;
  window.toggleGlobalMode = toggleGlobalMode;

  // ── BOOT ───────────────────────────────────────────────────────
  function init() {
    renderSidebar();
    renderBottomNav();
    var screen = getScreenFromHash();
    renderScreen(screen);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
