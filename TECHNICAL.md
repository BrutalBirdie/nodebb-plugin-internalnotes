# Technical reference

## Database keys

| Key | Type | Description |
|-----|------|-------------|
| `internalnote:<noteId>` | Hash | Individual note (noteId, tid, uid, content, timestamp) |
| `internalnotes:tid:<tid>` | Sorted Set | Note IDs for a topic (score = timestamp) |
| `topic:<tid>` → `assignee` | Object Field | UID (for user) or group name (for group) |
| `topic:<tid>` → `assigneeType` | Object Field | `"user"` or `"group"` |
| `topic:<tid>` → `assigneeStatus` | Object Field | `"open"` or `"resolved"` (reset to `"open"` on (re)assign) |
| `topic:<tid>` → `assigneeResolvedBy` | Object Field | UID that marked the assignment resolved |
| `topic:<tid>` → `assigneeResolvedAt` | Object Field | Timestamp when the assignment was marked resolved |
| `uid:<uid>:assignedTids` | Sorted Set | Topics assigned to a user (score = assignment time) |
| `group:<name>:assignedTids` | Sorted Set | Topics assigned to a group (score = assignment time) |
| `internalnotes:staleReminders` → `lastRun` | Object Field | Local date (`YYYY-MM-DD`) of the last reminder run |
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
| `PUT` | `/api/v3/plugins/internalnotes/:tid/status` | Set assignment status (`{ status: "open"\|"resolved" }`) |
| `GET` | `/api/v3/plugins/internalnotes/assignable-users` | Users available in the quick-select list |
| `GET` | `/api/v3/plugins/internalnotes/groups/search?query=...` | Search groups by name |
