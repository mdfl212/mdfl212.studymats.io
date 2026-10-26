/* Compact search: circle trigger + animated popup (wires to existing dashboard search). */
(() => {
  'use strict';

  const GLASS = '\u2315'; // ⌕ telephone recorder / search-like unicode (not emoji)

  function setup() {
    if (document.getElementById('smSearchTrigger')) return;

    const topbar = document.querySelector('.sm-topbar');
    const actions = document.querySelector('.sm-nav-actions');
    if (!topbar || !actions) return;

    // Hide legacy full-width search if present
    document.querySelectorAll('.sm-nav-search').forEach(el => {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });

    // Circular trigger
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'smSearchTrigger';
    trigger.className = 'sm-search-trigger';
    trigger.setAttribute('aria-label', 'Search');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.textContent = GLASS;
    actions.insertBefore(trigger, actions.firstChild);

    // Popup
    const popup = document.createElement('div');
    popup.className = 'sm-search-popup';
    popup.id = 'smSearchPopup';
    popup.hidden = true;
    popup.innerHTML =
      '<div class="sm-search-popup-panel" role="dialog" aria-modal="true" aria-label="Search">' +
        '<div class="sm-search-popup-row">' +
          '<span aria-hidden="true">' + GLASS + '</span>' +
          '<input id="smSearchPopupInput" type="search" placeholder="Search questions or topics\u2026" enterkeyhint="search" autocomplete="off">' +
          '<button type="button" class="sm-search-popup-close" id="smSearchPopupClose" aria-label="Close">\u00d7</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(popup);

    const input = document.getElementById('smSearchPopupInput');
    const closeBtn = document.getElementById('smSearchPopupClose');
    const oldSearch = document.getElementById('dashboardSearch');
    const smSearch = document.getElementById('smSearchInput');

    const syncFromPopup = () => {
      const val = input.value;
      if (oldSearch) {
        oldSearch.value = val;
        oldSearch.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (smSearch) smSearch.value = val;
    };

    const open = () => {
      popup.hidden = false;
      // force reflow then animate
      void popup.offsetWidth;
      popup.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      if (oldSearch) input.value = oldSearch.value || '';
      setTimeout(() => input.focus(), 50);
    };

    const close = () => {
      popup.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      setTimeout(() => {
        if (!popup.classList.contains('is-open')) popup.hidden = true;
      }, 240);
    };

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (popup.classList.contains('is-open')) close();
      else open();
    });
    closeBtn.addEventListener('click', close);
    popup.addEventListener('click', e => {
      if (e.target === popup) close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && popup.classList.contains('is-open')) {
        e.preventDefault();
        close();
      }
    });

    input.addEventListener('input', syncFromPopup);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        syncFromPopup();
        if (oldSearch) {
          oldSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
        // Existing question search modal may open from dashboardSearch handlers
        close();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 500));
  } else {
    setTimeout(setup, 500);
  }
  // Retry once in case redesign mounts late
  setTimeout(setup, 1200);
})();
