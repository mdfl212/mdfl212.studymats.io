/*
 * Shared StudyMats theme controls.
 * Theme state lives on <html> so every course can use the same CSS contract.
 */
(function () {
    const STORAGE_KEY = 'studymats-theme';
    const THEMES = ['light', 'dark'];

    function getStoredTheme() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return THEMES.includes(stored) ? stored : null;
        } catch (error) {
            return null;
        }
    }

    function preferredTheme() {
        return window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    function updateThemeControl(theme) {
        document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
            const isDark = theme === 'dark';
            button.setAttribute('aria-pressed', String(isDark));
            button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            const label = button.querySelector('[data-theme-label]');
            if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
            const icon = button.querySelector('[data-theme-icon]');
            if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        });
    }

    function setTheme(theme, persist) {
        const nextTheme = THEMES.includes(theme) ? theme : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        if (document.body) document.body.setAttribute('data-theme', nextTheme);
        if (persist !== false) {
            try {
                localStorage.setItem(STORAGE_KEY, nextTheme);
            } catch (error) {
                // Private browsing can disable storage; the visual toggle still works.
            }
        }
        updateThemeControl(nextTheme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
    }

    function addThemeControl() {
        if (document.querySelector('.theme-toggle, .dark-toggle, [data-theme-toggle]')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'site-theme-toggle';
        button.setAttribute('data-theme-toggle', '');
        button.innerHTML = '<span data-theme-icon aria-hidden="true">🌙</span><span data-theme-label>Dark mode</span>';
        button.addEventListener('click', toggleTheme);
        document.body.appendChild(button);
    }

    function init() {
        document.querySelectorAll('.theme-toggle, .dark-toggle').forEach(function (button) {
            button.setAttribute('data-theme-toggle', '');
            button.addEventListener('click', toggleTheme);
        });
        const initial = getStoredTheme() ||
            document.documentElement.getAttribute('data-theme') ||
            preferredTheme();
        setTheme(initial, false);
        addThemeControl();
        updateThemeControl(initial);
    }

    window.setTheme = setTheme;
    window.toggleTheme = toggleTheme;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
