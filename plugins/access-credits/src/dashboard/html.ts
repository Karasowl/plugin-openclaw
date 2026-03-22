import { CSS_STYLES } from "./styles.js";
import { CLIENT_SCRIPT } from "./client/index.js";
import { TAILWIND_CONFIG } from "./design-tokens.js";
import type { AccessCreditsConfig } from "../config.js";

export function buildDashboardHtml(config: AccessCreditsConfig, authToken?: string): string {
  const configJson = JSON.stringify(config).replace(/</g, "\\u003c");
  const tokenJson = authToken ? JSON.stringify(authToken).replace(/</g, "\\u003c") : '""';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access Credits — Admin Atelier</title>

  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script>tailwind.config = ${TAILWIND_CONFIG}</script>

  <!-- Google Fonts: Manrope (headlines), Inter (body), JetBrains Mono (code) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">

  <!-- Material Symbols -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <style>${CSS_STYLES}</style>
</head>
<body class="bg-background font-body text-on-surface min-h-screen">
  <div class="flex min-h-screen">

    <!-- Desktop Sidebar -->
    <aside id="sidebar" class="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-surface-container-low z-30">
    </aside>

    <!-- Main Content Area -->
    <main id="main-content" class="flex-1 ml-0 lg:ml-64 px-4 lg:px-8 py-6 pb-24 lg:pb-6">
      <div class="flex items-center justify-center h-64">
        <div class="spinner"></div>
      </div>
    </main>

  </div>

  <!-- Mobile Bottom Nav -->
  <nav id="bottom-nav" class="fixed bottom-0 left-0 right-0 lg:hidden bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline-variant/10 flex items-center h-16 z-30">
  </nav>

  <!-- Toast Container -->
  <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>

  <!-- Modal Overlay -->
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
