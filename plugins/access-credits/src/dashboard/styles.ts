export const CSS_STYLES: string = `
/* ============================================================
   ACCESS CREDITS DASHBOARD — EMBEDDED STYLESHEET
   No external fonts, no CDN, fully self-contained.
   Supports light + dark mode via prefers-color-scheme.
   ============================================================ */

/* ── 1. CSS CUSTOM PROPERTIES ─────────────────────────────── */

:root {
  /* Light mode palette */
  --bg:           #f8f9fa;
  --surface:      #ffffff;
  --border:       #e2e8f0;
  --text-primary: #1a202c;
  --text-secondary: #718096;
  --accent:       #3b82f6;
  --accent-hover: #2563eb;
  --danger:       #ef4444;
  --danger-hover: #dc2626;
  --success:      #10b981;

  /* Badge colours */
  --badge-enforce-bg:   #fef2f2;
  --badge-enforce-text: #b91c1c;
  --badge-observe-bg:   #eff6ff;
  --badge-observe-text: #1d4ed8;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Radii */
  --radius-sm: 4px;
  --radius:    8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Typography */
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs:  11px;
  --font-size-sm:  13px;
  --font-size-base: 14px;
  --font-size-md:  15px;
  --font-size-lg:  18px;
  --font-size-xl:  24px;
  --font-size-2xl: 30px;
  --line-height:   1.5;

  /* Sidebar */
  --sidebar-width: 240px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow:    0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -1px rgba(0,0,0,.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,.08), 0 4px 6px -2px rgba(0,0,0,.04);

  /* Transitions */
  --transition: 0.15s ease;

  /* Modal overlay */
  --overlay: rgba(0,0,0,.45);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg:           #0f172a;
    --surface:      #1e293b;
    --border:       #334155;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --accent:       #60a5fa;
    --accent-hover: #3b82f6;
    --danger:       #f87171;
    --danger-hover: #ef4444;
    --success:      #34d399;

    --badge-enforce-bg:   #450a0a;
    --badge-enforce-text: #fca5a5;
    --badge-observe-bg:   #172554;
    --badge-observe-text: #93c5fd;

    --shadow-sm: 0 1px 3px rgba(0,0,0,.3),  0 1px 2px rgba(0,0,0,.2);
    --shadow:    0 4px 6px -1px rgba(0,0,0,.35), 0 2px 4px -1px rgba(0,0,0,.25);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,.45), 0 4px 6px -2px rgba(0,0,0,.25);

    --overlay: rgba(0,0,0,.65);
  }
}

/* ── 2. BASE RESET & TYPOGRAPHY ───────────────────────────── */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 100%;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  color: var(--text-primary);
  background: var(--bg);
  min-height: 100vh;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-primary);
}

p {
  color: var(--text-secondary);
  line-height: var(--line-height);
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

ul, ol {
  list-style: none;
}

img, svg {
  display: block;
  max-width: 100%;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

input, select, textarea {
  font-family: inherit;
  font-size: inherit;
}

/* ── 3. APP SHELL — SIDEBAR + MAIN ───────────────────────── */

#app {
  display: flex;
  min-height: 100vh;
}

/* ── 4. SIDEBAR ───────────────────────────────────────────── */

.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: var(--space-6) 0 var(--space-8);
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
}

/* Logo area */
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-4);
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--accent);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-icon svg {
  width: 20px;
  height: 20px;
  fill: #ffffff;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.logo-subtitle {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 1px;
}

/* Navigation */
.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0 var(--space-3);
  flex: 1;
}

.nav-section-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  padding: var(--space-4) var(--space-3) var(--space-2);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-secondary);
  transition: background var(--transition), color var(--transition);
  text-align: left;
  cursor: pointer;
  border: none;
  background: transparent;
}

.nav-item:hover {
  background: var(--bg);
  color: var(--text-primary);
}

.nav-item.active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}

.nav-item.active .nav-icon {
  color: var(--accent);
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.75;
}

.nav-item.active .nav-icon {
  opacity: 1;
}

/* Sidebar footer */
.sidebar-footer {
  padding: var(--space-4) var(--space-5) 0;
  border-top: 1px solid var(--border);
  margin-top: auto;
  padding-top: var(--space-4);
}

.sidebar-footer-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── 5. MAIN CONTENT AREA ─────────────────────────────────── */

.main {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: var(--space-5) var(--space-8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

.page-content {
  padding: var(--space-8);
  flex: 1;
}

/* View containers */
.view {
  display: none;
}

.view.active {
  display: block;
}

/* ── 6. STAT CARDS ────────────────────────────────────────── */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  margin-bottom: var(--space-8);
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition), transform var(--transition);
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.stat-card.danger::before  { background: var(--danger); }
.stat-card.success::before { background: var(--success); }

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.stat-card.danger  .stat-icon { background: color-mix(in srgb, var(--danger)  12%, transparent); }
.stat-card.success .stat-icon { background: color-mix(in srgb, var(--success) 12%, transparent); }

.stat-icon svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

.stat-card.danger  .stat-icon svg { color: var(--danger); }
.stat-card.success .stat-icon svg { color: var(--success); }

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
  font-weight: 500;
}

.stat-delta {
  font-size: var(--font-size-xs);
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-delta.up   { color: var(--success); }
.stat-delta.down { color: var(--danger); }

/* ── 7. SECTION CARD WRAPPER ──────────────────────────────── */

.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  margin-bottom: var(--space-6);
}

.section-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border);
  gap: var(--space-4);
  flex-wrap: wrap;
}

.section-card-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.section-card-body {
  padding: var(--space-6);
}

/* ── 8. SEARCH INPUT ──────────────────────────────────────── */

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 320px;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) calc(var(--space-3) * 2 + 15px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  transition: border-color var(--transition), box-shadow var(--transition);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}

/* ── 9. USERS TABLE ───────────────────────────────────────── */

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.users-table thead {
  background: var(--bg);
}

.users-table th {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.users-table th:last-child,
.users-table td:last-child {
  text-align: right;
}

.users-table td {
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.users-table tbody tr:last-child td {
  border-bottom: none;
}

/* Striped rows */
.users-table tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--bg) 60%, transparent);
}

.users-table tbody tr {
  transition: background var(--transition);
}

.users-table tbody tr:hover {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

/* User identity cell */
.user-identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  font-size: var(--font-size-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  text-transform: uppercase;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary);
}

.user-id {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 1px;
  font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', monospace;
}

/* Credits cell */
.credits-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.credits-value.low    { color: var(--danger); }
.credits-value.medium { color: #f59e0b; }
.credits-value.good   { color: var(--success); }

/* Table actions */
.table-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

/* ── 10. BADGES ───────────────────────────────────────────── */

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.badge-enforce {
  background: var(--badge-enforce-bg);
  color: var(--badge-enforce-text);
}

.badge-observe {
  background: var(--badge-observe-bg);
  color: var(--badge-observe-text);
}

.badge-neutral {
  background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
  color: var(--text-secondary);
}

.badge-success {
  background: color-mix(in srgb, var(--success) 14%, transparent);
  color: var(--success);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
  flex-shrink: 0;
}

/* ── 11. BUTTONS ──────────────────────────────────────────── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  transition:
    background var(--transition),
    border-color var(--transition),
    color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
  white-space: nowrap;
  text-decoration: none;
  user-select: none;
  -webkit-user-select: none;
}

.btn:hover {
  background: var(--bg);
  border-color: color-mix(in srgb, var(--border) 60%, var(--text-secondary));
}

.btn:active {
  transform: translateY(1px);
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* Primary */
.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: #ffffff;
}

/* Danger */
.btn-danger {
  background: transparent;
  border-color: var(--danger);
  color: var(--danger);
}

.btn-danger:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: #ffffff;
}

/* Ghost */
.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--bg);
  color: var(--text-primary);
}

/* Small size */
.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
}

.btn-sm svg {
  width: 13px;
  height: 13px;
}

/* Icon-only */
.btn-icon {
  padding: var(--space-2);
  width: 32px;
  height: 32px;
}

.btn-sm.btn-icon {
  width: 26px;
  height: 26px;
  padding: var(--space-1);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── 12. CONFIG FORM ──────────────────────────────────────── */

.config-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: -4px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  transition: border-color var(--transition), box-shadow var(--transition);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-secondary);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}

.form-input:invalid,
.form-select:invalid {
  border-color: var(--danger);
}

.form-input:invalid:focus,
.form-select:invalid:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 20%, transparent);
}

/* Select arrow */
.form-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23718096' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  padding-right: calc(var(--space-3) * 2 + 12px);
}

.form-textarea {
  resize: vertical;
  min-height: 96px;
}

/* Number input — hide spinners */
.form-input[type='number']::-webkit-inner-spin-button,
.form-input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-input[type='number'] {
  -moz-appearance: textfield;
}

/* Checkbox */
.form-checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition);
  position: relative;
}

.form-checkbox:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.form-checkbox:checked::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 4px;
  width: 4px;
  height: 8px;
  border: 2px solid #ffffff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.form-checkbox:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.form-checkbox-label {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.form-checkbox-label .form-hint {
  margin-top: 2px;
}

/* Toggle switch */
.form-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
}

.toggle-track {
  position: relative;
  width: 40px;
  height: 22px;
  background: var(--border);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  transition: background var(--transition);
}

.toggle-track input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);
}

.toggle-track input:checked ~ .toggle-thumb {
  transform: translateX(18px);
}

.toggle-track input:checked + .toggle-thumb {
  transform: translateX(18px);
}

.toggle-track:has(input:checked) {
  background: var(--accent);
}

.form-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: var(--space-2) 0;
}

.form-section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-1);
}

/* ── 13. MODAL ────────────────────────────────────────────── */

#modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

#modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(8px) scale(0.98);
  transition: transform var(--transition);
}

#modal-overlay.open .modal {
  transform: translateY(0) scale(1);
}

.modal-sm { max-width: 360px; }
.modal-lg { max-width: 640px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: var(--space-4);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.modal-close {
  width: 30px;
  height: 30px;
  border-radius: var(--radius);
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), color var(--transition);
  flex-shrink: 0;
}

.modal-close:hover {
  background: var(--bg);
  color: var(--text-primary);
}

.modal-close svg {
  width: 16px;
  height: 16px;
}

.modal-body {
  padding: var(--space-6);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-footer-left {
  margin-right: auto;
}

/* ── 14. TOAST NOTIFICATIONS ──────────────────────────────── */

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(calc(100% + var(--space-6)));
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
    max-height: 100px;
    margin-bottom: var(--space-3);
  }
  to {
    opacity: 0;
    transform: translateX(calc(100% + var(--space-6)));
    max-height: 0;
    margin-bottom: 0;
  }
}

#toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  max-width: 360px;
  min-width: 280px;
  pointer-events: auto;
  animation: slideIn 0.25s ease forwards;
  position: relative;
  overflow: hidden;
}

.toast.dismissing {
  animation: slideOut 0.3s ease forwards;
}

/* Coloured left accent bar */
.toast::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.toast-success::before { background: var(--success); }
.toast-error::before   { background: var(--danger); }
.toast-info::before    { background: var(--accent); }

.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-success .toast-icon { color: var(--success); }
.toast-error   .toast-icon { color: var(--danger); }
.toast-info    .toast-icon { color: var(--accent); }

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.toast-message {
  color: var(--text-secondary);
  line-height: 1.4;
}

.toast-dismiss {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background var(--transition);
  padding: 0;
}

.toast-dismiss:hover {
  background: var(--bg);
}

.toast-dismiss svg {
  width: 12px;
  height: 12px;
}

/* Progress bar for auto-dismiss */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 4px;
  right: 0;
  height: 2px;
  background: color-mix(in srgb, var(--border) 80%, transparent);
  transform-origin: left;
}

.toast-progress-bar {
  height: 100%;
  background: currentColor;
  animation: shrink linear forwards;
}

@keyframes shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* ── 15. LOADING SPINNER ──────────────────────────────────── */

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: var(--radius-full);
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.spinner-lg {
  width: 40px;
  height: 40px;
  border-width: 4px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-6);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.loading-state .spinner {
  width: 36px;
  height: 36px;
  border-width: 3px;
}

/* Inline spinner (inside buttons) */
.btn .spinner {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-color: rgba(255,255,255,.3);
  border-top-color: #ffffff;
}

.btn.loading {
  pointer-events: none;
  opacity: 0.75;
}

/* ── 16. ERROR STATE ──────────────────────────────────────── */

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-6);
  text-align: center;
}

.error-state-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-state-icon svg {
  width: 26px;
  height: 26px;
}

.error-state-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.error-state-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  max-width: 320px;
  line-height: 1.6;
}

.error-state-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

/* ── 17. EMPTY STATE ──────────────────────────────────────── */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-6);
  text-align: center;
}

.empty-state-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.empty-state-icon svg {
  width: 24px;
  height: 24px;
}

.empty-state-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  max-width: 300px;
  line-height: 1.6;
}

.empty-state-actions {
  margin-top: var(--space-3);
  display: flex;
  gap: var(--space-3);
}

/* ── 18. PAGINATION ───────────────────────────────────────── */

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 var(--space-2);
  border-radius: var(--radius);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
  user-select: none;
  -webkit-user-select: none;
}

.page-btn:hover {
  background: var(--bg);
  color: var(--text-primary);
  border-color: var(--border);
}

.page-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.page-btn svg {
  width: 14px;
  height: 14px;
}

/* ── 19. SUMMARY / OVERVIEW PANELS ───────────────────────── */

.overview-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border);
  gap: var(--space-4);
}

.info-list-item:last-child {
  border-bottom: none;
}

.info-list-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info-list-value {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── 20. TABS ─────────────────────────────────────────────── */

.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  border-bottom: 1px solid var(--border);
  padding: 0 var(--space-6);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition);
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  border-radius: 1px 1px 0 0;
  transform: scaleX(0);
  transition: transform var(--transition);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
}

.tab-btn.active::after {
  transform: scaleX(1);
}

.tab-count {
  font-size: var(--font-size-xs);
  background: var(--bg);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  padding: 1px 6px;
  font-weight: 600;
}

.tab-btn.active .tab-count {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}

/* ── 21. ALERT / CALLOUT BANNERS ──────────────────────────── */

.alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
}

.alert svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.alert-info {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
  color: var(--accent);
}

.alert-danger {
  background: color-mix(in srgb, var(--danger) 8%, transparent);
  border-color: color-mix(in srgb, var(--danger) 25%, transparent);
  color: var(--danger);
}

.alert-success {
  background: color-mix(in srgb, var(--success) 8%, transparent);
  border-color: color-mix(in srgb, var(--success) 25%, transparent);
  color: var(--success);
}

.alert-warning {
  background: color-mix(in srgb, #f59e0b 8%, transparent);
  border-color: color-mix(in srgb, #f59e0b 25%, transparent);
  color: #b45309;
}

@media (prefers-color-scheme: dark) {
  .alert-warning {
    color: #fbbf24;
  }
}

.alert-body {
  flex: 1;
  color: inherit;
}

.alert-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.alert-description {
  opacity: 0.85;
  line-height: 1.5;
}

/* ── 22. CODE / MONOSPACE DISPLAY ─────────────────────────── */

.code-block {
  font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', 'Courier New', monospace;
  font-size: var(--font-size-xs);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  overflow-x: auto;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre;
}

code {
  font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', monospace;
  font-size: 0.9em;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  color: var(--accent);
}

/* ── 23. SKELETON LOADERS ─────────────────────────────────── */

@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    color-mix(in srgb, var(--border) 60%, var(--bg)) 50%,
    var(--border) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: var(--radius);
}

.skeleton-text {
  height: 14px;
  border-radius: var(--radius-sm);
}

.skeleton-text.sm { height: 12px; }
.skeleton-text.lg { height: 18px; }

/* ── 24. UTILITY CLASSES ──────────────────────────────────── */

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border-width: 0;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flex         { display: flex; }
.flex-col     { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }

.text-sm      { font-size: var(--font-size-sm); }
.text-xs      { font-size: var(--font-size-xs); }
.text-secondary { color: var(--text-secondary); }
.text-danger    { color: var(--danger); }
.text-success   { color: var(--success); }
.text-accent    { color: var(--accent); }
.font-mono {
  font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', monospace;
}

.mt-2 { margin-top: var(--space-2); }
.mt-4 { margin-top: var(--space-4); }
.mt-6 { margin-top: var(--space-6); }
.mb-4 { margin-bottom: var(--space-4); }
.mb-6 { margin-bottom: var(--space-6); }

.w-full { width: 100%; }

/* ── 25. RESPONSIVE — MOBILE (< 768px) ───────────────────── */

@media (max-width: 767px) {
  /* Sidebar collapses to top horizontal nav bar */
  .sidebar {
    width: 100%;
    height: auto;
    position: sticky;
    top: 0;
    flex-direction: row;
    align-items: center;
    padding: 0;
    border-right: none;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
  }

  .logo {
    padding: var(--space-3) var(--space-4);
    border-bottom: none;
    border-right: 1px solid var(--border);
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .logo-subtitle {
    display: none;
  }

  .nav {
    flex-direction: row;
    flex-wrap: nowrap;
    padding: var(--space-2) var(--space-2);
    gap: var(--space-1);
    overflow-x: auto;
  }

  .nav-section-label {
    display: none;
  }

  .nav-item {
    flex-shrink: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
  }

  .sidebar-footer {
    display: none;
  }

  /* Main content fills full width */
  .main {
    margin-left: 0;
  }

  .page-header {
    padding: var(--space-4) var(--space-4);
    flex-wrap: wrap;
  }

  .page-title {
    font-size: var(--font-size-lg);
  }

  .page-content {
    padding: var(--space-4);
  }

  /* Stats grid: 1 column on small screens */
  .stats-grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  /* Form rows: single column */
  .form-row {
    grid-template-columns: 1fr;
  }

  /* Overview grid: single column */
  .overview-row {
    grid-template-columns: 1fr;
  }

  /* Modal: full-width from bottom */
  .modal {
    max-width: 100%;
    max-height: 85vh;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    align-self: flex-end;
  }

  #modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  /* Toast: full width at bottom */
  #toast-container {
    bottom: var(--space-4);
    right: var(--space-4);
    left: var(--space-4);
    align-items: stretch;
  }

  .toast {
    max-width: 100%;
    min-width: 0;
    width: 100%;
  }
}

/* Stats: 2 columns on medium screens */
@media (min-width: 768px) and (max-width: 1023px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── 26. PRINT RESET ──────────────────────────────────────── */

@media print {
  .sidebar,
  .page-header,
  #toast-container,
  #modal-overlay,
  .btn,
  .pagination {
    display: none !important;
  }

  .main {
    margin-left: 0;
  }

  .page-content {
    padding: 0;
  }
}
`;
