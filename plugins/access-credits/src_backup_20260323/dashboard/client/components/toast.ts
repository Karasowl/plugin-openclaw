export const TOAST_SCRIPT = String.raw`
  // ── TOAST ──────────────────────────────────────────────────────
  function showToast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var bgClass = type === 'error'
      ? 'bg-error text-on-error'
      : type === 'warning'
        ? 'bg-surface-container-highest text-on-surface'
        : 'bg-on-tertiary-container text-on-tertiary';
    var iconName = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'check_circle';
    var toast = document.createElement('div');
    toast.className = 'flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-float ' + bgClass + ' toast-enter mb-3 max-w-sm';
    toast.innerHTML = icon(iconName, 'sm') + '<span class="font-body text-body-md">' + esc(message) + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3500);
  }
`;
