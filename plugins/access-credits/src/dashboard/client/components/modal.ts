export const MODAL_SCRIPT = String.raw`
  // ── MODAL ──────────────────────────────────────────────────────
  function showModal(title, bodyHtml, actions) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 modal-enter';
    overlay.style.background = 'rgba(216, 218, 220, 0.5)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.webkitBackdropFilter = 'blur(8px)';

    var actionsHtml = '';
    if (actions && actions.length) {
      actionsHtml = '<div class="flex items-center justify-end gap-3 mt-6 pt-4">';
      actions.forEach(function(a) {
        if (a.style === 'primary') {
          actionsHtml += '<button id="' + esc(a.id || '') + '" class="btn-primary-gradient px-5 py-2.5 rounded-xl font-label text-label-lg">' + esc(a.label) + '</button>';
        } else if (a.style === 'danger') {
          actionsHtml += '<button id="' + esc(a.id || '') + '" class="bg-error text-on-error px-5 py-2.5 rounded-xl font-label text-label-lg hover:opacity-90">' + esc(a.label) + '</button>';
        } else {
          actionsHtml += '<button id="' + esc(a.id || '') + '" class="text-on-surface-variant px-4 py-2.5 font-label text-label-lg hover:text-on-surface">' + esc(a.label) + '</button>';
        }
      });
      actionsHtml += '</div>';
    }

    overlay.innerHTML =
      '<div class="bg-surface-container-lowest rounded-2xl shadow-float p-6 w-full max-w-md modal-content-enter">' +
        '<h3 class="font-headline text-headline-sm text-on-surface mb-4">' + esc(title) + '</h3>' +
        '<div class="font-body text-body-md text-on-surface-variant">' + bodyHtml + '</div>' +
        actionsHtml +
      '</div>';

    // Bind action callbacks
    if (actions) {
      actions.forEach(function(a) {
        if (a.id && a.onClick) {
          var btn = document.getElementById(a.id);
          if (btn) btn.addEventListener('click', a.onClick);
        }
      });
    }

    // Close on overlay click (not modal content)
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });
  }

  function closeModal() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.className = 'hidden';
      overlay.innerHTML = '';
      overlay.style.background = '';
      overlay.style.backdropFilter = '';
      overlay.style.webkitBackdropFilter = '';
    }
  }
`;
