# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.1] - 2025-02-23

### Added

- **Widget "Internal Notes & Assign Topic"** — Add the Internal Notes and Assign Topic buttons via **ACP > Appearance > Widgets** (e.g. to Global Sidebar) for themes that use a different layout. The widget only renders on topic pages.
- **Right sidebar placement** — Internal Notes and Assign Topic buttons are now injected into the far-right sidebar (`component="sidebar/right"`) at the bottom. When the sidebar is collapsed they show as icon-only; when expanded, icon and label. This placement is only tested with the default theme [nodebb-theme-harmony v2.1.36](https://github.com/NodeBB/nodebb-theme-harmony/tree/v2.1.36).
- **Translatable "Close"** — Notes panel close control uses a dedicated "Close" button with the new language key `close`.

### Changed

- **Button position** — Buttons no longer appear in the topic thread tools menu; they are shown in the right sidebar (or via the new widget). This matches the thin vertical sidebar used for notifications, search, drafts, and chat.
- **Notes panel close** — Close control moved from a small header link to a visible "Close" button next to "Add Note" in the notes panel for clearer UX.
- **Docs** — README simplified; detailed setup and technical info moved to DEVELOPMENT.md and TECHNICAL.md. NodeBB 3.x references removed from README.

## [1.0.0] - (initial release)

### Added

- Internal staff notes on topics (add, view, delete)
- Topic assignment (user or group) with notifications for assigned groups
- "Assign to myself" quick action
- Permission-based visibility (admin; optional global/category moderators)
- Right sidebar placement for Internal Notes and Assign Topic buttons
- Admin settings: allow global moderators, allow category moderators
- Widget fallback for themes without right sidebar
