# Technical reference

## Database keys

| Key | Type | Description |
|-----|------|-------------|
| `internalnote:<noteId>` | Hash | Individual note (noteId, tid, uid, content, timestamp) |
| `internalnotes:tid:<tid>` | Sorted Set | Note IDs for a topic (score = timestamp) |
| `topic:<tid>` → `assignee` | Object Field | UID (for user) or group name (for group) |
| `topic:<tid>` → `assigneeType` | Object Field | `"user"` or `"group"` |
| `global` → `nextInternalNoteId` | Object Field | Auto-incrementing note ID counter |

## API endpoints

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
