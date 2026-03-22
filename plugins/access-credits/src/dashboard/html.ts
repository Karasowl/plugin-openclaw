import { CSS_STYLES } from "./styles.js";
import { CLIENT_SCRIPT } from "./client.js";
import type { AccessCreditsConfig } from "../config.js";

export function buildDashboardHtml(config: AccessCreditsConfig, authToken?: string): string {
  const configJson = JSON.stringify(config).replace(/</g, "\\u003c");
  const tokenJson = authToken ? JSON.stringify(authToken).replace(/</g, "\\u003c") : '""';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access Credits — Dashboard</title>
  <style>${CSS_STYLES}</style>
</head>
<body>
  <div id="app">
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">&#x1F4B3;</span>
        <span class="logo-text">Access Credits</span>
      </div>
      <nav class="nav">
        <button class="nav-item active" data-tab="overview">Resumen</button>
        <button class="nav-item" data-tab="users">Usuarios</button>
        <button class="nav-item" data-tab="config">Configuraci\u00F3n</button>
      </nav>
    </aside>
    <main class="main" id="main-content">
      <div class="loading-state"><div class="spinner"></div><p>Cargando dashboard...</p></div>
    </main>
  </div>
  <div id="toast-container"></div>
  <div id="modal-overlay" class="hidden"></div>
  <script>
    window.__INITIAL_CONFIG__ = ${configJson};
    window.__API_BASE__ = '/plugins/access-credits';
    window.__AUTH_TOKEN__ = ${tokenJson};
  </script>
  <script>${CLIENT_SCRIPT}</script>
</body>
</html>`;
}
