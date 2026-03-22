export const UTILS_SCRIPT = String.raw`
  // ── UTILS ──────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function formatNumber(n) {
    if (n == null) return '—';
    return Number(n).toLocaleString('en-US');
  }
  function relativeTime(iso) {
    if (!iso) return '—';
    var diff = Date.now() - new Date(iso).getTime();
    var s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    var m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24);
    if (d < 30) return d + 'd ago';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var html = '<' + tag;
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] != null) html += ' ' + k + '="' + esc(String(attrs[k])) + '"';
      }
    }
    html += '>';
    if (children != null) html += children;
    html += '</' + tag + '>';
    return html;
  }
  function icon(name, cls) {
    return '<span class="material-symbols-outlined ' + (cls || '') + '">' + name + '</span>';
  }
  function badge(text, bgClass, textClass) {
    return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-label ' +
      (bgClass || 'bg-secondary-container') + ' ' + (textClass || 'text-on-secondary-container') + '">' + esc(text) + '</span>';
  }
  function avatar(name, size) {
    var sz = size || 'w-10 h-10 text-body-md';
    var letter = (name || '?').charAt(0).toUpperCase();
    var colors = ['bg-primary-container text-on-primary','bg-secondary-container text-on-secondary-container','bg-on-tertiary-container text-on-tertiary'];
    var ci = letter.charCodeAt(0) % colors.length;
    return '<div class="' + sz + ' rounded-full flex items-center justify-center font-headline font-bold ' + colors[ci] + '">' + letter + '</div>';
  }
  function setContent(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
`;
