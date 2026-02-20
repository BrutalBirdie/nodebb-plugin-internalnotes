# nodebb-plugin-internalnotes

A NodeBB plugin that adds **internal staff notes** and **topic assignment** to forum topics. Notes and assignments are only visible to privileged users (administrators, global moderators, and optionally category moderators). They are completely invisible to everyone else.

## Features

- **Internal Notes** — Add, view, and delete private notes on any topic. Notes are stored per-topic and include the author and timestamp.
- **Topic Assignment (User or Group)** — Assign a topic to a specific user or an entire group. All members of an assigned group receive a notification.
- **"Assign to myself"** — The first option in the assignment modal lets the current user instantly assign the topic to themselves.
- **Permission-based visibility** — Notes, assignment badges, and the thread tool buttons are completely invisible to regular users. Only admins, global mods, and (optionally) category mods can see them. No DOM elements are rendered for unprivileged users.
- **Thread Tools integration** — "Internal Notes" and "Assign Topic" options appear in the topic thread tools dropdown for privileged users only.
- **Admin settings page** — Configure whether category moderators can access notes (ACP > Plugins > Internal Notes).

## Installation

```bash
cd /path/to/nodebb
npm install nodebb-plugin-internalnotes
```

Then activate the plugin from the **Admin Control Panel > Extend > Plugins**.

### For development

```bash
cd /path/to/nodebb
npm link /path/to/nodebb-plugin-internalnotes
./nodebb build
./nodebb dev
```

## Configuration

Navigate to **ACP > Plugins > Internal Notes & Assignments** to configure:

- **Allow category moderators** — Enable this to let category moderators (not just admins and global mods) view and manage internal notes and assignments.

## Usage

1. Navigate to any topic as an admin or moderator.
2. Open the **Thread Tools** dropdown (the wrench icon).
3. Click **Internal Notes** to open the notes side panel, or **Assign Topic** to assign the topic.

### Notes panel

- View all existing notes for the topic
- Add new notes (supports Ctrl+Enter to submit)
- Delete notes
- See current assignee (user or group) and unassign

### Assignment modal

- **Assign to myself** — one-click self-assignment (first option)
- **User tab** — search and select any user by username
- **Group tab** — search and select any group by name

## Database Keys

| Key | Type | Description |
|-----|------|-------------|
| `internalnote:<noteId>` | Hash | Individual note (noteId, tid, uid, content, timestamp) |
| `internalnotes:tid:<tid>` | Sorted Set | Note IDs for a topic (score = timestamp) |
| `topic:<tid>` → `assignee` | Object Field | UID (for user) or group name (for group) |
| `topic:<tid>` → `assigneeType` | Object Field | `"user"` or `"group"` |
| `global` → `nextInternalNoteId` | Object Field | Auto-incrementing note ID counter |

## API Endpoints

All endpoints require authentication and privileged access.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v3/plugins/internalnotes/:tid` | Get all notes for a topic |
| `POST` | `/api/v3/plugins/internalnotes/:tid` | Create a note (`{ content }`) |
| `DELETE` | `/api/v3/plugins/internalnotes/:tid/:noteId` | Delete a note |
| `GET` | `/api/v3/plugins/internalnotes/:tid/assign` | Get topic assignee |
| `PUT` | `/api/v3/plugins/internalnotes/:tid/assign` | Assign topic (`{ type: "user"\|"group", id: uid\|groupName }`) |
| `DELETE` | `/api/v3/plugins/internalnotes/:tid/assign` | Unassign topic |
| `GET` | `/api/v3/plugins/internalnotes/groups/search?query=...` | Search groups by name |

## Compatibility

NodeBB v3.x

## License

MIT
