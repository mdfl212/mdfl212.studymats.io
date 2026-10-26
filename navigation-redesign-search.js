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
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#171315' : '#fbf8f5');
  }

  function openQuestionSearch() {
    // Use the real opener in question-search.js (listens to dashboardSearch click)
    const dashboardInput = document.getElementById('dashboardSearch');
    if (dashboardInput) {
      dashboardInput.click();
      return;
    }
    const modal = document.getElementById('questionSearchModal');
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('question-search-open');
    document.getElementById('questionSearchInput')?.focus();
  }

  function setup() {
    const actions = document.querySelector('.sm-nav-actions');
    if (!actions) return;

    document.querySelectorAll('.sm-nav-search').forEach(el => {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });

    // Dark mode: old topbar theme button is not wired by theme.js class selectors
    const themeBtn = document.getElementById('smThemeToggle');
    if (themeBtn && !themeBtn.dataset.smThemeBound) {
      themeBtn.dataset.smThemeBound = '1';
      themeBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
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
    // Right side order: search, theme, profile
    actions.insertBefore(trigger, actions.firstChild);

    trigger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openQuestionSearch();
    });

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
