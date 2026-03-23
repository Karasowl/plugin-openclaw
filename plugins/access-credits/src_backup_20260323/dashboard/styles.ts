/**
 * Minimal CSS — only what Tailwind CDN cannot handle.
 * The stitch design system is primarily driven by Tailwind utility classes.
 */
export const CSS_STYLES: string = `
/* Material Symbols icon configuration */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-size: 24px;
  line-height: 1;
  vertical-align: middle;
}
.material-symbols-outlined.filled {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.material-symbols-outlined.sm {
  font-size: 20px;
}
.material-symbols-outlined.lg {
  font-size: 28px;
}

/* Scrollbar utilities */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #c6c6cd; border-radius: 9999px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #76777d; }

/* Glassmorphism */
.glass-panel {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* Editorial shadow utility */
.editorial-shadow {
  box-shadow: 0px 12px 32px rgba(25, 28, 30, 0.04);
}

/* Code editor */
.code-editor {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  tab-size: 2;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Ghost border — outline-variant at 20% opacity */
.ghost-border {
  border: 1px solid rgba(198, 198, 205, 0.2);
}
.ghost-border-focus:focus {
  border-color: rgba(198, 198, 205, 0.4);
  background: #ffffff;
}

/* Toggle switch */
.toggle-track {
  width: 44px;
  height: 24px;
  border-radius: 9999px;
  background: #e0e3e5;
  position: relative;
  cursor: pointer;
  transition: background 200ms ease-in-out;
}
.toggle-track.active {
  background: #008cc7;
}
.toggle-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #ffffff;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 200ms ease-in-out;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle-track.active .toggle-thumb {
  transform: translateX(20px);
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slide-out-right {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e0e3e5;
  border-top-color: #008cc7;
  border-radius: 9999px;
  animation: spin 0.8s linear infinite;
}

.toast-enter { animation: slide-in-right 300ms ease-out; }
.toast-exit { animation: slide-out-right 300ms ease-in forwards; }
.modal-enter { animation: fade-in 200ms ease-out; }
.modal-content-enter { animation: scale-in 200ms ease-out; }
.pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }

/* Chip input */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}
.chip-remove {
  cursor: pointer;
  opacity: 0.6;
  font-size: 14px;
  line-height: 1;
}
.chip-remove:hover { opacity: 1; }

/* Gradient primary button */
.btn-primary-gradient {
  background: linear-gradient(135deg, #000000, #00174b);
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: opacity 200ms ease-in-out, transform 100ms ease-in-out;
}
.btn-primary-gradient:hover { opacity: 0.9; }
.btn-primary-gradient:active { transform: scale(0.97); }

/* Base transitions */
* { transition-timing-function: ease-in-out; }
`;
