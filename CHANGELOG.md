# Changelog

## 2026-10-24
- Fixed the dashboard At a Glance display by forcing a fresh dashboard script and refreshing the service-worker cache, preventing stale cached dashboard code from leaving the section empty.

Notable user-facing changes to StudyMats. Dates reflect repository updates; entries describe the current development branch and may not yet be published to the default branch.

## 2026-10-24

### Test-bank selection (in progress)
- Added a subject-level bank picker for current JSON banks, legacy HTML reviewers, and user-imported JSON banks.
- Added browser-local import storage with subject-only or shared-subject assignment; imports do not modify repository files or overwrite original banks.
- Quiz launches can use selected imported banks and keep progress separate by bank selection.

### Dashboard and navigation
- Removed the extra “Keep Your Momentum” kicker to reduce excess space above Daily Study Rhythm.
- Added a compact, dismissible “What’s changed” dashboard notice. Dismissal is remembered on the current browser/device.
- Added a persistent “What’s changed” entry in the sidebar so release notes remain accessible after the notice is dismissed.
- Tightened sidebar navigation spacing while preserving the sidebar-owned collapse control. Mobile continues to use the bottom navigation rather than the desktop sidebar.

### Quiz
- Set dark mode as the quiz page's default theme.
- Refined dark quiz surfaces toward true black and cleaned up question metadata spacing.
- Added configurable quiz timing, pause/reset controls, +15/+30/+60-minute shortcuts, a low-time warning, and a time-up state.

### Test Bank Builder
- Improved the builder's responsive column sizing, panel overflow handling, and narrow-screen stacking.
- The builder remains a client-side drafting tool: importing/exporting JSON does not directly overwrite repository question banks.

### Installability
- Added PWA manifest and service-worker support for installable app shortcuts and a lightweight cached app shell.
- Offline behavior is limited; subject/question data may still require a network connection.

### Existing study workflow improvements
- Added subject-level progress overview and activity tracking on the dashboard.
- Improved test-bank creation, editing, source-question reuse, JSON validation/import, and export workflows.

## 2026-09-07
- Fixed subject catalog loading and added the normalized Preventive Medicine question bank.
- Improved mobile theme toggles, viewport backgrounds, and quiz selector/score-card layout.
