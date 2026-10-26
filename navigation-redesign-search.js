/* Search circle (right) opens full Find-a-question modal; dark mode toggle fixed. */
(() => {
  'use strict';

  const GLASS = '\u2315'; // Unicode search-like symbol (not emoji)

  function toggleThemeDirect() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if (document.body) document.body.setAttribute('data-theme', next);
    try { localStorage.setItem('studymats-theme', next); } catch (_) {}
    // Prefer theme.js storage key if present
    try {
      const keys = Object.keys(localStorage);
      // common keys used by theme.js variants
      ['studymats-theme', 'theme', 'sm-theme', 'data-theme'].forEach(k => {
        try { if (localStorage.getItem(k) != null) localStorage.setItem(k, next); } catch (_) {}
      });
    } catch (_) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#171315' : '#fbf8f5');
    document.querySelectorAll('[data-theme-icon]').forEach(icon => {
      icon.textContent = next === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    });
  }

  function openQuestionSearch() {
    const modal = document.getElementById('questionSearchModal');
    if (!modal) return;
    modal.hidden = false;
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    const input = document.getElementById('questionSearchInput');
    const closeBtn = document.getElementById('questionSearchClose');
    setTimeout(() => (input || closeBtn)?.focus?.(), 60);
    // Nudge existing search script if it listens for open
    document.getElementById('dashboardSearch')?.click();
  }

  function setup() {
    const actions = document.querySelector('.sm-nav-actions');
    if (!actions) return;

    document.querySelectorAll('.sm-nav-search').forEach(el => {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });

    // Dark mode: bind real toggle (old topbar button is not wired by theme.js)
    const themeBtn = document.getElementById('smThemeToggle');
    if (themeBtn && !themeBtn.dataset.smThemeBound) {
      themeBtn.dataset.smThemeBound = '1';
      themeBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        // Prefer clicking a real theme.js control if present
        const wired = document.querySelector('.theme-toggle, .dark-toggle, .site-theme-toggle');
        if (wired) wired.click();
        else toggleThemeDirect();
      });
    }

    if (document.getElementById('smSearchTrigger')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'smSearchTrigger';
    trigger.className = 'sm-search-trigger';
    trigger.setAttribute('aria-label', 'Search');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.textContent = GLASS;
    // Order on the right: search, theme, profile
    actions.insertBefore(trigger, actions.firstChild);

    trigger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openQuestionSearch();
    });

    // Also hide intermediate popup if an older script created it
    const mini = document.getElementById('smSearchPopup');
    if (mini) mini.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 500));
  } else {
    setTimeout(setup, 500);
  }
  setTimeout(setup, 1200);
})();
