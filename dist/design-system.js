/* Shared, labelled iconography and hover / focus / touch explanations. */
function uiIcon(name) {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
    paperclip: '<path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2m-8 14 8-8"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 9 4-3v12l-4-3Z"/>',
    chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    filter: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="16" cy="17" r="2" fill="currentColor"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
    message: '<path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/>',
    repeat: '<path d="m16 2 4 4-4 4M4 11V9a3 3 0 0 1 3-3h13M8 22l-4-4 4-4m12-1v2a3 3 0 0 1-3 3H4"/>',
    link: '<path d="m10 13 4-4m-6 6-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m4 0 2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    archive: '<path d="M4 8h16v13H4zM2 3h20v5H2zM10 12h4"/>',
    arrowUp: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    arrowDown: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    panelClose: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-11-3 3 3 3"/>',
    panelOpen: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m4-11 3 3-3 3"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    play: '<path d="M8 5v14l11-7L8 5Z" fill="currentColor" stroke="none"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.info) + '</svg>';
}

(() => {
  const toggle = document.getElementById('sidebar-toggle');
  if (!toggle) return;
  const compactViewport = window.matchMedia('(max-width: 1180px)');
  const mobileViewport = window.matchMedia('(max-width: 680px)');
  const storageKey = 'elevate.sidebar';
  let preference = null;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'expanded' || saved === 'collapsed') preference = saved;
  } catch { /* Keep the toggle usable when browser storage is unavailable. */ }
  function renderSidebar() {
    const collapsed = (preference || (compactViewport.matches ? 'collapsed' : 'expanded')) === 'collapsed';
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    toggle.innerHTML = uiIcon(collapsed ? 'panelOpen' : 'panelClose');
    toggle.dataset.tooltip = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    toggle.dataset.tooltipSide = 'right';
    document.querySelectorAll('.sidebar .nav-item[data-view], #global-search-trigger').forEach(button => {
      button.removeAttribute('title');
      if (collapsed && !mobileViewport.matches) {
        button.dataset.tooltip = button.id === 'global-search-trigger' ? 'Search' : button.getAttribute('aria-label');
        button.dataset.tooltipSide = 'right';
      } else {
        delete button.dataset.tooltip;
        delete button.dataset.tooltipSide;
      }
    });
  }
  toggle.addEventListener('click', () => {
    preference = document.documentElement.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
    try { window.localStorage.setItem(storageKey, preference); } catch { /* Session-only preference. */ }
    renderSidebar();
  });
  compactViewport.addEventListener('change', renderSidebar);
  mobileViewport.addEventListener('change', renderSidebar);
  renderSidebar();
})();

(() => {
  const tip = document.createElement('div');
  tip.id = 'ui-tooltip';
  tip.className = 'ui-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  let target = null;
  let hideTimer;
  function hide() {
    clearTimeout(hideTimer);
    if (target) {
      const ids = (target.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== tip.id);
      if (ids.length) target.setAttribute('aria-describedby', ids.join(' '));
      else target.removeAttribute('aria-describedby');
    }
    target = null;
    tip.hidden = true;
  }
  function show(node) {
    clearTimeout(hideTimer);
    if (!node || !node.dataset.tooltip) return;
    if (target !== node) hide();
    target = node;
    tip.textContent = node.dataset.tooltip;
    tip.hidden = false;
    const ids = new Set((node.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    ids.add(tip.id);
    node.setAttribute('aria-describedby', [...ids].join(' '));
    const bounds = node.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const atRight = node.dataset.tooltipSide === 'right';
    tip.style.left = Math.max(10, Math.min(window.innerWidth - width - 10, atRight ? bounds.right + 12 : bounds.left + (bounds.width - width) / 2)) + 'px';
    tip.style.top = (atRight ? Math.max(10, Math.min(window.innerHeight - height - 10, bounds.top + (bounds.height - height) / 2)) : bounds.top > height + 16 ? bounds.top - height - 8 : Math.min(window.innerHeight - height - 10, bounds.bottom + 8)) + 'px';
  }
  document.addEventListener('pointerover', event => {
    const node = event.target.closest('[data-tooltip]');
    if (node) show(node);
    else if (event.target === tip) clearTimeout(hideTimer);
  });
  document.addEventListener('pointerout', event => {
    if (event.target.closest('[data-tooltip]') || event.target === tip) hideTimer = setTimeout(hide, 160);
  });
  document.addEventListener('focusin', event => {
    const node = event.target.closest('[data-tooltip]');
    if (node) show(node); else hide();
  });
  document.addEventListener('focusout', event => { if (event.target === target) hide(); });
  document.addEventListener('click', event => {
    const node = event.target.closest('[data-tooltip]');
    if (node?.matches('.sidebar-toggle')) hide();
    // Help and passive icon explanations can be tapped without opening a table row.
    if (node && (node.matches('.info-hint, .icon-hint') || node.matches('[tabindex="0"]:not(button)'))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      show(node);
    } else if (!node && event.target !== tip) hide();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !tip.hidden) {
      event.preventDefault();
      hide();
      event.stopImmediatePropagation();
    }
    const node = event.target.closest('[data-tooltip][tabindex="0"]:not(button)');
    if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); show(node); }
  }, true);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
  window.addEventListener('hashchange', hide);
})();
