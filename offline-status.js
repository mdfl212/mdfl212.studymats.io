(() => {
  'use strict';
  const id = 'studymats-connection-status';
  let hideTimer = null;

  function ensureStatus() {
    let bar = document.getElementById(id);
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = id;
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.style.cssText = [
      'position:fixed','z-index:99999','left:50%','bottom:calc(14px + env(safe-area-inset-bottom))',
      'transform:translateX(-50%)','max-width:calc(100vw - 24px)','padding:9px 14px',
      'border:1px solid rgba(255,255,255,.16)','border-radius:999px',
      'background:#211d30','color:#fff','box-shadow:0 8px 28px rgba(0,0,0,.24)',
      'font:600 12px/1.35 system-ui,-apple-system,sans-serif','text-align:center',
      'pointer-events:none','opacity:0','transition:opacity .18s ease'
    ].join(';');
    document.body.appendChild(bar);
    return bar;
  }

  function show(message, persistent) {
    const bar = ensureStatus();
    bar.textContent = message;
    bar.style.opacity = '1';
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = null;
    if (!persistent) hideTimer = window.setTimeout(() => { bar.style.opacity = '0'; }, 3200);
  }

  function updateConnection() {
    if (!navigator.onLine) {
      show('Offline mode · cached StudyMats content only', true);
      document.documentElement.dataset.connection = 'offline';
    } else {
      document.documentElement.dataset.connection = 'online';
      const bar = document.getElementById(id);
      if (bar && bar.style.opacity === '1') show('Back online · StudyMats is connected', false);
    }
  }

  window.addEventListener('offline', updateConnection);
  window.addEventListener('online', updateConnection);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' })
        .catch(error => console.warn('StudyMats offline support could not be registered:', error));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateConnection, { once: true });
  else updateConnection();
})();