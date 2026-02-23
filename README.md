[![Lint and publish to npm](https://github.com/BrutalBirdie/nodebb-plugin-internalnotes/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/BrutalBirdie/nodebb-plugin-internalnotes/actions/workflows/publish-npm.yml) [![Draft release on tag](https://github.com/BrutalBirdie/nodebb-plugin-internalnotes/actions/workflows/draft-release.yml/badge.svg)](https://github.com/BrutalBirdie/nodebb-plugin-internalnotes/actions/workflows/draft-release.yml)
---

# nodebb-plugin-internalnotes

A NodeBB plugin that adds **internal staff notes** and **topic assignment** to forum topics. By default only administrators can see and manage notes and assignments; you can optionally allow global moderators and/or category moderators in the plugin settings. They are completely invisible to everyone else.

**Version:** 1.0.2 · **NodeBB:** 4.x (tested on 4.8.1)

## Features

- **Internal Notes** — Add, view, and delete private notes on any topic. Notes are stored per-topic and include the author and timestamp.
- **Topic Assignment (User or Group)** — Assign a topic to a specific user or an entire group. All members of an assigned group receive a notification.
- **"Assign to myself"** — The first option in the assignment modal lets the current user instantly assign the topic to themselves.
- **Permission-based visibility** — Notes, assignment badges, and the thread tool buttons are completely invisible to regular users. By default only admins can see them; you can enable global moderators and/or category moderators in the plugin settings. No DOM elements are rendered for unprivileged users.
- **Right sidebar placement** — On topic pages, "Internal Notes" and "Assign Topic" buttons are shown in the far-right sidebar (`component="sidebar/right"`). A widget is also available for themes that use a different layout.
- **Admin settings page** — Configure who can access notes: allow global moderators and/or category moderators (ACP > Plugins > Internal Notes & Assignments).

## Installation

```bash
cd /path/to/nodebb
npm install nodebb-plugin-internalnotes
```

Then activate the plugin from the **Admin Control Panel > Extend > Plugins**.

**Where the buttons appear:** On topic pages, the **Internal Notes** and **Assign Topic** buttons are automatically placed in the far-right sidebar (the thin vertical bar on the right edge of the page). No widget setup is required. If your theme does not have this component, you can add the **Internal Notes & Assign Topic** widget to the Global Sidebar in **ACP > Appearance > Widgets** as a fallback.

## Configuration

Navigate to **ACP > Plugins > Internal Notes & Assignments** to configure:

- **Allow global moderators** — Enable to let global moderators view and manage internal notes and assignments (default: off; only admins have access).
- **Allow category moderators** — Enable to let category moderators view and manage internal notes in their categories (default: off).

## Usage

1. Navigate to any topic as a user who has access (admin, or global/category moderator if enabled in settings).
2. In the **far-right sidebar** (the vertical bar on the right edge of the page), click **Internal Notes** to open the notes side panel, or **Assign Topic** to assign the topic.

### Notes panel

- View all existing notes for the topic
- Add new notes (supports Ctrl+Enter to submit)
- Delete notes
- See current assignee (user or group) and unassign

### Assignment modal

- **Assign to myself** — one-click self-assignment (first option)
- **User tab** — search and select any user by username
- **Group tab** — search and select any group by name

## Compatibility

NodeBB v4.x. Tested on NodeBB 4.8.1.

The right-sidebar button placement (injection into `component="sidebar/right"`) is only tested with the default theme **nodebb-theme-harmony** [v2.1.36](https://github.com/NodeBB/nodebb-theme-harmony/tree/v2.1.36). Other themes may need the **Internal Notes & Assign Topic** widget in ACP > Appearance > Widgets.

## For developers

- **[DEVELOPMENT.md](DEVELOPMENT.md)** — Local setup, linting, and publishing to npm.
- **[TECHNICAL.md](TECHNICAL.md)** — Database keys and API endpoints.

## License

MIT
