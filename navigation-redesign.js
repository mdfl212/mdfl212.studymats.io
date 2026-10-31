/* StudyMats dashboard/navigation reorganization. Existing quiz, search, progress and backup logic is reused. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const greetings = [
    'What would you like to study today?',
    'Ready to make progress? Where shall we start?',
    'What would you like to focus on today?',
    "Let's make today's study session count. What's first?",
    'Welcome back. What shall we work on today?'
  ];
  const PROFILE_KEY = 'studymats-profile-v1';
  const ACTIVITY_KEY = 'studymats-activity-v1';
  const PROGRESS_PREFIX = 'studymats-progress-v1:';
  const safeParse = (raw, fallback) => { try { return JSON.parse(raw) || fallback; } catch { return fallback; } };
  const profile = () => safeParse(localStorage.getItem(PROFILE_KEY), {});

  function init() {
    if (!$('studyDashboard') || document.querySelector('.sm-topbar')) return;
    const body = document.body;
    const wrapper = document.querySelector('main.wrapper');
    const oldTop = document.querySelector('.app-topbar');
    if (!wrapper || !oldTop) return;

    body.classList.add('sm-redesign-active');
    /* Content-aware shell sizing: respond to the usable app container, not device labels. */
    const shellRoot = document.documentElement;
    const shellWrapper = document.querySelector('main.wrapper');
    const updateShellLayout = () => {
      const rootWidth = shellRoot.clientWidth || window.innerWidth;
      const wrapperWidth = shellWrapper?.getBoundingClientRect().width || rootWidth;
      const available = Math.min(rootWidth, wrapperWidth);
      const layout = available < 720 ? 'compact' : available < 1040 ? 'balanced' : 'wide';
      if (shellRoot.dataset.smLayout !== layout) {
        shellRoot.dataset.smLayout = layout;
        body.dataset.smLayout = layout;
      }
    };
    if ('ResizeObserver' in window && shellWrapper) {
      const shellResizeObserver = new ResizeObserver(updateShellLayout);
      shellResizeObserver.observe(shellWrapper);
    }
    window.addEventListener('resize', updateShellLayout, { passive: true });
    window.addEventListener('orientationchange', updateShellLayout, { passive: true });
    updateShellLayout();


    const topbar = document.createElement('header');
    topbar.className = 'sm-topbar';
    topbar.innerHTML =
      '<a class="sm-nav-brand" href="#home" aria-label="StudyMats home">' +
        '<img src="assets/studymats-mark.svg" alt=""><span>StudyMats</span>' +
      '</a>' +
      '<label class="sm-nav-search">' +
        '<input id="smSearchInput" type="search" placeholder="Search questions or topics…" aria-label="Search questions or topics" enterkeyhint="search">' +
      '</label>' +
      '<div class="sm-nav-actions">' +
        '<button type="button" class="sm-icon-btn" id="smThemeToggle" aria-label="Toggle theme" title="Toggle theme">◐</button>' +
        '<button type="button" class="sm-nav-profile" id="smProfileButton" aria-expanded="false" aria-haspopup="true">' +
          '<span class="sm-nav-avatar" id="smProfileAvatar">S</span>' +
          '<span class="sm-profile-name" id="smProfileName">Profile</span>' +
        '</button>' +
        '<section class="sm-profile-menu" id="smProfileMenu" hidden aria-label="Profile menu">' +
          '<h3>Profile</h3>' +
          '<button type="button" class="sm-menu-action" id="smEditName">Edit name</button>' +
          '<button type="button" class="sm-menu-action" data-sm-changelog>What\'s Changed</button>' +
          '<div class="sm-menu-divider"></div>' +
          '<button type="button" class="sm-menu-action" id="smOpenBackup">Backup & portability…</button>' +
        '</section>' +
      '</div>';
    document.body.insertBefore(topbar, wrapper);

    const bottom = document.createElement('nav');
    bottom.className = 'sm-bottom-nav';
    bottom.setAttribute('aria-label', 'Main');
    bottom.innerHTML =
      '<button type="button" class="sm-nav-tab" data-sm-nav="home"><span class="sm-tab-icon" aria-hidden="true">⌂</span><span>Home</span></button>' +
      '<button type="button" class="sm-nav-tab" data-sm-nav="quiz"><span class="sm-tab-icon" aria-hidden="true">▣</span><span>Quiz</span></button>' +
      '<button type="button" class="sm-nav-tab" data-sm-nav="browse"><span class="sm-tab-icon" aria-hidden="true">▦</span><span>Browse</span></button>' +
      '<button type="button" class="sm-nav-tab" data-sm-nav="progress"><span class="sm-tab-icon" aria-hidden="true">▤</span><span>Progress</span></button>' +
      '<button type="button" class="sm-nav-tab" data-sm-nav="builder"><span class="sm-tab-icon" aria-hidden="true">✎</span><span>Builder</span></button>';
    document.body.appendChild(bottom);

    const oldSearch = $('dashboardSearch');
    const searchInput = $('smSearchInput');
    if (oldSearch && searchInput) {
      searchInput.value = oldSearch.value;
      searchInput.addEventListener('input', () => {
        oldSearch.value = searchInput.value;
        oldSearch.dispatchEvent(new Event('input', { bubbles: true }));
      });
      searchInput.addEventListener('click', () => oldSearch.click());
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          oldSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      });
    }
    const themeButton = oldTop.querySelector('[data-theme-toggle]');
    $('smThemeToggle')?.addEventListener('click', () => themeButton?.click());

    // Keep the embedded Test Bank Builder in sync, including when its iframe is
    // created lazily after the user opens the Builder view.
    let builderFrame = null;
    const syncBuilderTheme = () => {
      const frame = $('smBuilderFrame');
      if (!frame || !frame.contentWindow) return;
      if (frame !== builderFrame) {
        builderFrame = frame;
        builderFrame.addEventListener('load', syncBuilderTheme);
      }
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      builderFrame.contentWindow.postMessage({ type: 'studymats-theme', theme }, window.location.origin);
    };
    try {
      const themeObserver = new MutationObserver(syncBuilderTheme);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
      const frameObserver = new MutationObserver(() => {
        const frame = $('smBuilderFrame');
        if (frame && frame !== builderFrame) syncBuilderTheme();
      });
      frameObserver.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('pageshow', syncBuilderTheme);
      window.addEventListener('message', event => {
        const frame = $('smBuilderFrame');
        if (!frame || event.source !== frame.contentWindow ||
            !event.data || event.data.type !== 'studymats-builder-ready') return;
        syncBuilderTheme();
      });
      syncBuilderTheme();
    } catch (_) {
      syncBuilderTheme();
    }

    const profileMenu = $('smProfileMenu');
    const profileButton = $('smProfileButton');
    const updateProfile = () => {
      const p = profile();
      const name = p && p.showName !== false && typeof p.name === 'string' ? p.name.trim() : '';
      const nameEl = $('smProfileName');
      const avatarEl = $('smProfileAvatar');
      if (nameEl) nameEl.textContent = name || 'Profile';
      if (avatarEl) avatarEl.textContent = (name ? Array.from(name)[0] : 'S').toLocaleUpperCase();
      const welcomeName = $('smWelcomeName');
      if (welcomeName) welcomeName.textContent = name ? 'Hi, ' + name : 'Hi there';
    };
    const closeProfile = () => {
      if (profileMenu) profileMenu.hidden = true;
      profileButton?.setAttribute('aria-expanded', 'false');
    };
    profileButton?.addEventListener('click', e => {
      e.stopPropagation();
      if (!profileMenu) return;
      profileMenu.hidden = !profileMenu.hidden;
      profileButton.setAttribute('aria-expanded', String(!profileMenu.hidden));
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.sm-nav-actions')) closeProfile();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeProfile();
    });
    $('smEditName')?.addEventListener('click', () => {
      closeProfile();
      $('dashProfileButton')?.click();
    });
    document.querySelectorAll('[data-sm-changelog]').forEach(b =>
      b.addEventListener('click', () => {
        closeProfile();
        const cm = $('changelogModal');
        if (cm) {
          cm.hidden = false;
          cm.classList.add('is-open');
          cm.querySelector('[data-close-changelog]')?.focus();
        }
      })
    );

    const backupModal = document.createElement('div');
    backupModal.className = 'sm-modal';
    backupModal.id = 'smBackupModal';
    backupModal.hidden = true;
    backupModal.innerHTML =
      '<section class="sm-modal-dialog sm-backup-sheet" role="dialog" aria-modal="true" aria-labelledby="smBackupTitle" tabindex="-1">' +
        '<header class="sm-modal-header">' +
          '<h2 id="smBackupTitle">Backup & portability</h2>' +
          '<button class="sm-modal-close" type="button" aria-label="Close backup">×</button>' +
        '</header>' +
        '<div id="smBackupHost"></div>' +
      '</section>';
    document.body.appendChild(backupModal);
    const backupPanel = $('backupPanel');
    if (backupPanel) {
      const host = $('smBackupHost');
      host?.appendChild(backupPanel);
      backupPanel.hidden = false;
      const heading = backupPanel.querySelector('.dash-panel-heading');
      if (heading) heading.style.display = 'none';
    }
    const openBackup = () => {
      closeProfile();
      backupModal.hidden = false;
      backupModal.querySelector('.sm-modal-close')?.focus();
    };
    const closeBackup = () => { backupModal.hidden = true; };
    $('smOpenBackup')?.addEventListener('click', openBackup);
    backupModal.querySelector('.sm-modal-close')?.addEventListener('click', closeBackup);
    backupModal.addEventListener('click', e => { if (e.target === backupModal) closeBackup(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !backupModal.hidden) closeBackup();
    });

    const dashboard = $('studyDashboard');
    const welcome = document.createElement('section');
    welcome.className = 'sm-page sm-welcome';
    welcome.id = 'smHomeView';
    const greet = greetings[Math.floor(Math.random() * greetings.length)];
    welcome.innerHTML =
      '<h1 id="smWelcomeName">Hi there</h1>' +
      '<p id="smWelcomePrompt"></p>' +
      '<div class="sm-welcome-actions">' +
        '<button class="sm-primary-action primary" id="smStartQuiz" type="button">Start Quiz <span aria-hidden="true">→</span></button>' +
        '<button class="sm-primary-action" id="smCheckProgress" type="button">Check Your Progress</button>' +
        '<span class="sm-streak" id="smStreak" aria-live="polite">Study streak · —</span>' +
      '</div>';
    welcome.querySelector('#smWelcomePrompt').textContent = greet;

    const views = document.createElement('div');
    views.id = 'smAppViews';
    const progress = document.createElement('section');
    progress.className = 'sm-page sm-progress-view sm-view';
    progress.id = 'smProgressView';
    progress.hidden = true;
    progress.innerHTML = '';

    const builder = document.createElement('section');
    builder.className = 'sm-builder-view sm-view';
    builder.id = 'smBuilderView';
    builder.hidden = true;
    builder.innerHTML =
      '<div class="sm-builder-toolbar">' +
        '<button type="button" class="sm-primary-action" id="smBuilderHome">← Back</button>' +
        '<span>Test Bank Builder</span>' +
      '</div>' +
      '<iframe id="smBuilderFrame" title="StudyMats Test Bank Builder" src="test-bank-builder-v2.html"></iframe>';

    const metricGrid = document.createElement('section');
    metricGrid.className = 'sm-metric-grid';
    metricGrid.setAttribute('aria-label', 'Study metrics');
    metricGrid.innerHTML =
      '<button class="sm-metric-tile" type="button" data-sm-metric="answered"><span>Answered</span><strong>—</strong></button>' +
      '<button class="sm-metric-tile" type="button" data-sm-metric="accuracy"><span>Accuracy</span><strong>—</strong></button>' +
      '<button class="sm-metric-tile" type="button" data-sm-metric="completed"><span>Completed</span><strong>—</strong></button>' +
      '<button class="sm-metric-tile" type="button" data-sm-metric="progress"><span>Avg progress</span><strong>—</strong></button>';

    const oldWelcome = dashboard.querySelector('.dash-welcome');
    if (oldWelcome) oldWelcome.hidden = true;

    // The original branding and Browse shortcut belong to Home, not to the
    // shared wrapper. Reuse these existing nodes so other in-app views (notably
    // Progress and Builder) cannot accidentally show Home content underneath.
    const homeBrand = wrapper.querySelector(':scope > .site-header');
    const homeBrowseShortcut = wrapper.querySelector(':scope > .hub-year-dropdown');
    // The welcome screen is intentionally minimal; keep legacy branding in the
    // shared DOM for compatibility, but do not show a second logo/title there.
    if (homeBrand) homeBrand.hidden = true;
    if (homeBrowseShortcut) welcome.appendChild(homeBrowseShortcut);

    const subjectDropdown = $('subjectProgressDropdown');
    const activityPanel = dashboard.querySelector('.dash-activity-panel');
    const donuts = $('dashDonuts');
    const yearRow = wrapper.querySelector(':scope > .hub-year-row');
    const stats = $('dashStats') || document.createElement('div');
    stats.id = 'dashStats';
    stats.classList.add('dash-stats');

    // Dashboard order (mockup): heatmap → daily stats → metrics → year → subjects
    if (activityPanel) {
      activityPanel.classList.add('sm-rhythm-card');
      const heading = activityPanel.querySelector('.dash-panel-heading');
      if (heading) {
        const h2 = heading.querySelector('h2');
        if (h2) h2.hidden = true;
        heading.classList.add('sm-rhythm-heading');
      }
      progress.appendChild(activityPanel);
    }
    progress.appendChild(metricGrid);
    if (yearRow) {
      yearRow.classList.add('sm-progress-years');
      progress.appendChild(yearRow);
    }
    progress.appendChild(stats);
    if (donuts) progress.appendChild(donuts);
    if (subjectDropdown) {
      subjectDropdown.classList.add('sm-subject-card');
      subjectDropdown.open = false;
      subjectDropdown.removeAttribute('open');
      progress.appendChild(subjectDropdown);
    }

    wrapper.insertBefore(welcome, oldTop.nextSibling);
    wrapper.insertBefore(views, welcome.nextSibling);
    views.append(progress, builder);

    dashboard.hidden = true;
    dashboard.setAttribute('hidden', '');
    dashboard.style.setProperty('display', 'none', 'important');
    dashboard.setAttribute('aria-hidden', 'true');

    const rankModal = document.createElement('div');
    rankModal.className = 'sm-modal';
    rankModal.id = 'smRankingModal';
    rankModal.hidden = true;
    rankModal.innerHTML =
      '<section class="sm-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="smRankingTitle" tabindex="-1">' +
        '<header class="sm-modal-header">' +
          '<h2 id="smRankingTitle">Subject rankings</h2>' +
          '<button class="sm-modal-close" type="button" aria-label="Close rankings">×</button>' +
        '</header>' +
        '<div id="smRankingContent"></div>' +
      '</section>';
    document.body.appendChild(rankModal);
    const showRank = () => {
      rankModal.hidden = false;
      rankModal.querySelector('.sm-modal-close')?.focus();
    };
    const closeRank = () => { rankModal.hidden = true; };
    rankModal.querySelector('.sm-modal-close')?.addEventListener('click', closeRank);
    rankModal.addEventListener('click', e => { if (e.target === rankModal) closeRank(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !rankModal.hidden) closeRank();
    });

    const desktopSidebar = document.querySelector('.desktop-sidebar');
    const sidebarDestinations = [
      ['.sidebar-link[href="#top"]', 'home'],
      ['.sidebar-link[href="quiz.html"]', 'quiz'],
      ['.sidebar-link[href="#hubSubjectList"]', 'browse'],
      ['.sidebar-link[href="#studyDashboard"]', 'progress'],
      ['.sidebar-link[href="test-bank-builder-v2.html"]', 'builder']
    ];
    const setSidebarActive = which => {
      sidebarDestinations.forEach(([selector, view]) => {
        const link = desktopSidebar?.querySelector(selector);
        if (!link) return;
        const active = view === which;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    };

    const setView = which => {
      welcome.hidden = which !== 'home';
      progress.hidden = which !== 'progress';
      builder.hidden = which !== 'builder';
      dashboard.hidden = true;
      dashboard.setAttribute('hidden', '');
      dashboard.style.setProperty('display', 'none', 'important');
      bottom.querySelectorAll('[data-sm-nav]').forEach(b => {
        if (b.dataset.smNav === 'quiz' || b.dataset.smNav === 'browse') {
          b.setAttribute('aria-current', 'false');
        } else {
          const active = b.dataset.smNav === which;
          b.setAttribute('aria-current', active ? 'page' : 'false');
        }
      });
      body.dataset.smView = which;
      setSidebarActive(which);
      if (which === 'progress') {
        renderMetrics();
        // Keep subject list collapsed by default each visit on phone
        const sd = $('subjectProgressDropdown');
        if (sd && window.matchMedia('(max-width: 767px)').matches) {
          sd.open = false;
          sd.removeAttribute('open');
        }
      }
      window.scrollTo({
        top: 0,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    };

    const openQuiz = () => {
      setSidebarActive('quiz');
      const trigger = document.querySelector('[data-mobile-quiz]');
      if (trigger) trigger.click();
      else $('smStartQuiz')?.click();
    };
    const openBrowse = () => {
      setSidebarActive('browse');
      const trigger = document.querySelector('[data-open-subject-browser]') ||
        document.querySelector('[data-sidebar-subjects]');
      if (trigger) trigger.click();
    };

    // Keep desktop navigation inside the same in-page application shell as
    // mobile navigation. These links must not navigate away from the shared
    // stateful shell or leave its active item out of sync with the visible view.
    sidebarDestinations.forEach(([selector, view]) => {
      const link = desktopSidebar?.querySelector(selector);
      if (!link) return;
      link.addEventListener('click', event => {
        event.preventDefault();
        if (view === 'home') setView('home');
        else if (view === 'quiz') openQuiz();
        else if (view === 'browse') openBrowse();
        else setView(view);
      });
    });

    bottom.querySelector('[data-sm-nav="home"]')?.addEventListener('click', () => setView('home'));
    bottom.querySelector('[data-sm-nav="quiz"]')?.addEventListener('click', openQuiz);
    bottom.querySelector('[data-sm-nav="browse"]')?.addEventListener('click', openBrowse);
    bottom.querySelector('[data-sm-nav="progress"]')?.addEventListener('click', () => setView('progress'));
    bottom.querySelector('[data-sm-nav="builder"]')?.addEventListener('click', () => setView('builder'));
    $('smBuilderHome')?.addEventListener('click', () => setView('home'));
    topbar.querySelector('.sm-nav-brand')?.addEventListener('click', e => {
      e.preventDefault();
      setView('home');
    });
    $('smStartQuiz')?.addEventListener('click', openQuiz);
    $('smCheckProgress')?.addEventListener('click', () => setView('progress'));

    const streak = () => {
      const data = safeParse(localStorage.getItem(ACTIVITY_KEY), {});
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const key = d =>
        d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      let n = 0;
      const d = new Date(today);
      if (!(Array.isArray(data[key(d)]) && data[key(d)].length)) d.setDate(d.getDate() - 1);
      while (Array.isArray(data[key(d)]) && data[key(d)].length) {
        n++;
        d.setDate(d.getDate() - 1);
      }
      return n;
    };
    const refreshStreak = () => {
      const el = $('smStreak');
      if (!el) return;
      const n = streak();
      el.textContent = n
        ? ('🔥 ' + n + ' day' + (n === 1 ? '' : 's') + ' streak')
        : 'Study streak · No activity yet';
    };

    let rankData = [];
    const loadRankData = async () => {
      try {
        const catalog = await fetch('subjects.json', { cache: 'no-cache' }).then(r => {
          if (!r.ok) throw Error();
          return r.json();
        });
        return await Promise.all(
          catalog.map(async s => {
            const qs = await fetch(s.data, { cache: 'no-cache' }).then(r => {
              if (!r.ok) throw Error();
              return r.json();
            });
            const saved = safeParse(localStorage.getItem(PROGRESS_PREFIX + encodeURIComponent(s.id)), {});
            const answers = saved.answers && typeof saved.answers === 'object' ? saved.answers : {};
            const revealed = saved.revealed && typeof saved.revealed === 'object' ? saved.revealed : {};
            const ids = new Set(qs.map(q => String(q.id)));
            const validAnswers = Object.keys(answers).filter(id => ids.has(String(id)));
            const completed = new Set([
              ...validAnswers,
              ...Object.keys(revealed).filter(id => ids.has(String(id)))
            ]);
            const scored = validAnswers.filter(id =>
              Number.isInteger(qs.find(q => String(q.id) === String(id))?.correctAnswer)
            );
            const correct = scored.filter(
              id => answers[id] === qs.find(q => String(q.id) === String(id)).correctAnswer
            ).length;
            return {
              name: s.name,
              answered: validAnswers.length,
              completed: completed.size,
              accuracy: scored.length ? Math.round((correct / scored.length) * 100) : null,
              progress: qs.length ? Math.round((completed.size / qs.length) * 100) : null,
              questions: qs.length,
              active: completed.size > 0
            };
          })
        );
      } catch {
        return [];
      }
    };

    async function renderMetrics() {
      rankData = await loadRankData();
      const sums = {
        answered: rankData.reduce((n, s) => n + s.answered, 0),
        completed: rankData.reduce((n, s) => n + s.completed, 0)
      };
      const scored = rankData.filter(s => s.accuracy !== null);
      const accuracyN = rankData.reduce((n, s) => n + (s.accuracy === null ? 0 : s.accuracy), 0);
      const validProgress = rankData.filter(s => s.progress !== null);
      const vals = {
        answered: sums.answered,
        completed: sums.completed,
        progress: validProgress.length
          ? Math.round(validProgress.reduce((n, s) => n + s.progress, 0) / validProgress.length) + '%'
          : '—',
        accuracy: scored.length ? Math.round(accuracyN / scored.length) + '%' : '—'
      };
      metricGrid.querySelectorAll('[data-sm-metric]').forEach(b => {
        const strong = b.querySelector('strong');
        if (strong) strong.textContent = vals[b.dataset.smMetric];
      });
    }

    metricGrid.querySelectorAll('[data-sm-metric]').forEach(b =>
      b.addEventListener('click', async () => {
        if (!rankData.length) await renderMetrics();
        const metric = b.dataset.smMetric;
        const labels = {
          answered: 'Questions answered',
          completed: 'Questions completed',
          accuracy: 'Answer accuracy',
          progress: 'Average subject progress'
        };
        const sorted = [...rankData]
          .filter(s =>
            metric === 'accuracy'
              ? s.accuracy !== null
              : metric === 'progress'
                ? s.progress !== null
                : s[metric] > 0
          )
          .sort((a, c) => Number(c[metric]) - Number(a[metric]));
        const title = $('smRankingTitle');
        if (title) title.textContent = 'Top subjects · ' + labels[metric];
        const host = $('smRankingContent');
        if (host) {
          host.innerHTML = sorted.length
            ? '<ol class="sm-rank-list">' +
                sorted.slice(0, 12).map(s =>
                  '<li><strong>' + s.name + '</strong><span>' +
                  (metric === 'accuracy' || metric === 'progress' ? s[metric] + '%' : s[metric].toLocaleString()) +
                  '</span></li>'
                ).join('') +
              '</ol>'
            : '<p class="sm-empty">There is not enough saved data to rank subjects for this metric yet.</p>';
        }
        showRank();
      })
    );

    updateProfile();
    refreshStreak();
    setView('home');
    window.addEventListener('storage', () => {
      updateProfile();
      refreshStreak();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
