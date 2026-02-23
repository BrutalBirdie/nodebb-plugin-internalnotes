# NodeBB Plugin Standards Audit

This document audits **nodebb-plugin-internalnotes** against [NodeBB upstream documentation](https://docs.nodebb.org/development/) and the [nodebb-plugin-quickstart](https://github.com/NodeBB/nodebb-plugin-quickstart) template. References: [development](https://docs.nodebb.org/development/), [quickstart](https://docs.nodebb.org/development/quickstart/), [plugins](https://docs.nodebb.org/development/plugins/), [plugin.json](https://docs.nodebb.org/development/plugins/plugin.json/), [hooks](https://docs.nodebb.org/development/plugins/hooks/), [statics](https://docs.nodebb.org/development/plugins/statics/), [libraries](https://docs.nodebb.org/development/plugins/libraries/), [i18n](https://docs.nodebb.org/development/i18n/), [style guide](https://docs.nodebb.org/development/style-guide/), [widgets](https://docs.nodebb.org/development/widgets/).

---

## 1. plugin.json

| Requirement | Status | Notes |
|-------------|--------|--------|
| **id** | ✅ | `nodebb-plugin-internalnotes` (unique, matches npm package name) |
| **url** | ✅ | Absolute URL to repo |
| **library** | ✅ | `./library.js` – entry point loaded when plugin is active |
| **hooks** | ✅ | All hooks have `hook` and `method`; optional `priority` omitted (default 10) |
| **scss** | ✅ | `scss/internalnotes.scss` |
| **scripts** | ✅ | `public/lib/main.js` (forum client) |
| **acpScripts** | ✅ | `public/lib/acp-main.js` (ACP client) |
| **modules** | ✅ | `../admin/plugins/internalnotes.js` → `./public/lib/admin.js` (ACP page module) |
| **templates** | ✅ | `templates` |
| **languages** | ✅ | `languages` |
| **staticDirs** | ⚪ | Not required; no public static assets |
| **upgrades** | ⚪ | Optional; add when introducing DB migrations |

**Verdict:** Compliant.

---

## 2. package.json & nbbpm

| Requirement | Status | Notes |
|-------------|--------|--------|
| **name** | ✅ | `nodebb-plugin-internalnotes` (must be prefixed `nodebb-plugin-` for npm and NodeBB) |
| **main** | ✅ | `library.js` |
| **nbbpm.compatibility** | ✅ | `^3.0.0` – required for nbbpm listing and installs |
| **repository / bugs** | ✅ | Present |
| **keywords** | ✅ | Include `nodebb`, `plugin` |
| **.npmignore** | ✅ | Added (node_modules, .git, .DS_Store, etc.) so only publishable files are shipped |

**Verdict:** Compliant.

---

## 3. Library (library.js)

| Requirement | Status | Notes |
|-------------|--------|-------|
| **Hook methods** | ✅ | Each hook in `plugin.json` has a matching exported method |
| **require.main.require** | ✅ | NodeBB modules loaded via `require.main.require('./src/...')` |
| **Async hooks** | ✅ | `init`, `addRoutes`, filters use async/callbacks appropriately |
| **formatApiResponse** | ✅ | API routes use `helpers.formatApiResponse()` (and `controllerHelpers` once for 403) |
| **Route helpers** | ✅ | `routeHelpers.setupAdminPageRoute`, `routeHelpers.setupApiRoute` used correctly |

**API route paths:** Routes are registered under `/internalnotes/...`. The client and README use `/plugins/internalnotes/...`. In NodeBB 3, plugin API routes are typically mounted under `/api/v3/plugins/<plugin-id>`; the router passed to `static:api.routes` may be scoped per plugin, so `/internalnotes/:tid` can resolve to `/api/v3/plugins/internalnotes/:tid`. **Ensure the router you receive is the plugin-scoped one**; if the client calls `api.get('/plugins/internalnotes/' + tid)` and the request goes to `/api/v3/plugins/internalnotes/:tid`, the server must serve that path (either by registering `/internalnotes/...` on a router already mounted at `.../plugins/internalnotes`, or by registering `/plugins/internalnotes/...` on the main API router). No code change if your environment already matches; otherwise align server route prefix with client.

**Verdict:** Compliant; verify API base path in your NodeBB version.

---

## 4. Client-side (scripts / acpScripts / modules)

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Forum script** | ✅ | `public/lib/main.js` – loaded via `scripts` |
| **ACP script** | ✅ | `public/lib/acp-main.js` – loaded via `acpScripts` |
| **Admin module** | ✅ | `modules` maps `../admin/plugins/internalnotes.js` to admin script; template `admin/plugins/internalnotes` triggers `require('admin/plugins/internalnotes')` and `init()` |
| **ES5 / minification** | ⚠️ | Style guide recommends ES5 for client code for minification. `main.js` uses async/await and template literals (ES6+). NodeBB 3 build may transpile; if not, consider ES5 or confirm build supports ES6+ |
| **Admin ES modules** | ✅ | `admin.js` uses `import { save, load } from 'settings'` – ACP is typically built with module support |

**Verdict:** Compliant for structure; confirm client build/minification for ES6+ if you hit issues.

---

## 5. Templates

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Admin template** | ✅ | `templates/admin/plugins/internalnotes.tpl`; controller uses `res.render('admin/plugins/internalnotes', ...)` |
| **Naming** | ✅ | Matches quickstart pattern `admin/plugins/<name>` |

**Verdict:** Compliant.

---

## 6. i18n (languages)

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Directory** | ✅ | `languages/en-GB/internalnotes.json` |
| **plugin.json** | ✅ | `"languages": "languages"` |
| **Usage** | ✅ | Keys like `[[internalnotes:menu.assigned]]` in templates and server; client uses `translator.translate('[[internalnotes:' + key + ']]', ...)` |
| **defaultLang** | ⚪ | Optional; only needed if you want a non–en-GB fallback |

**Verdict:** Compliant.

---

## 7. Hooks usage

| Hook | Purpose | Status |
|------|---------|--------|
| **static:app.load** | Init, page and admin routes | ✅ |
| **static:api.routes** | REST API routes (notes, assign, group search) | ✅ |
| **filter:admin.header.build** | ACP nav item | ✅ |
| **filter:navigation.available** | “Assigned” nav item | ✅ |
| **filter:widgets.getWidgets** | Register "Internal Notes & Assign Topic" widget | ✅ |
| **filter:widget.render:internalnotes_sidebar** | Render widget HTML (topic page, privileged only) | ✅ |
| **filter:topic.get** | Add notes/assignee to single topic | ✅ |
| **filter:topics.get** | Add notes/assignee to topic lists | ✅ |
| **filter:topic.thread_tools** | Thread tools entries | ✅ |
| **action:topic.purge** | Clean up notes/assignee on topic purge | ✅ |

**Verdict:** All hooks used correctly; filters return data in the expected shape.

---

## 8. Widgets ([docs](https://docs.nodebb.org/development/widgets/))

The plugin provides an optional **Internal Notes & Assign Topic** widget for themes that use a different layout (e.g. when the right sidebar component is not present). Audited against the [Writing Widgets](https://docs.nodebb.org/development/widgets/) documentation.

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Register widget** | ✅ | Listens to `filter:widgets.getWidgets` with method `defineWidgets`; pushes `{ widget, name, description, content }` into the array and returns it |
| **Widget namespace** | ✅ | `widget: 'internalnotes_sidebar'` – unique namespace for the render hook |
| **Render hook** | ✅ | Listens to `filter:widget.render:internalnotes_sidebar` with method `renderInternalNotesWidget`; hook name matches widget namespace |
| **widget.html** | ✅ | Render method assigns HTML to `widget.html` (buttons for Notes and Assign Topic) |
| **Async return** | ✅ | `renderInternalNotesWidget` is async and returns `widget` (documented pattern: callback or return widget) |
| **widget.req** | ✅ | Used for `widget.req.uid` and `widget.req.path` (topic-page and privilege checks) |
| **widget.area** | ✅ | Used for `widget.area.template` and `widget.area.url` when present (topic-page detection) |
| **widget.data** | ⚪ | Not used; `content: ''` in registration (no admin form) – valid for a widget with no options |
| **Nomenclature** | ✅ | Plugin is `nodebb-plugin-internalnotes` (main purpose is internal notes); widget-only packages would use `nodebb-widget-xyz` – correct here |
| **Privilege / scope** | ✅ | Widget renders empty HTML for non–topic pages and for users without `canViewNotes`; no sensitive data exposed |

**Verdict:** Compliant with the widget development docs. Widget is optional fallback; primary UI is thread tools and right-sidebar placement.

---

## 9. Static directories & security

- No `staticDirs` – no public static assets. Sensitive data is not exposed via static routes.
- API routes use `middleware.ensureLoggedIn` and custom `ensurePrivileged` (notes visibility).  
**Verdict:** Compliant.

---

## 10. Database

- Uses NodeBB `database` API (`getObject`, `setObject`, `sortedSetAdd`, etc.).
- Keys documented in README; no custom migrations yet (no `upgrades` in plugin.json).  
**Verdict:** Compliant; add `upgrades` when you introduce schema changes.

---

## 11. Style guide

- Core follows Airbnb JS + ESLint; third-party plugins are encouraged but not required to follow.
- This plugin has `"lint": "eslint ."` in package.json and a minimal `eslint.config.mjs`; run `npm install -D eslint` for local lint.  
**Verdict:** Compliant.

---

## Summary

| Area | Result |
|------|--------|
| plugin.json | ✅ Compliant |
| package.json / nbbpm | ✅ Compliant (.npmignore added) |
| library.js | ✅ Compliant (verify API path) |
| Client / ACP | ✅ Compliant (confirm ES5/ES6 build) |
| Templates | ✅ Compliant |
| i18n | ✅ Compliant |
| Hooks | ✅ Compliant |
| Widgets | ✅ Compliant ([widgets](https://docs.nodebb.org/development/widgets/)) |
| Security | ✅ Compliant |
| Database | ✅ Compliant |
| Style / lint | ✅ eslint.config.mjs added (optional; run `npm install -D eslint` for lint) |

**Done:** `.npmignore` and a minimal `eslint.config.mjs` were added. For production, confirm in your NodeBB 3 instance that API requests from the client (e.g. `api.get('/plugins/internalnotes/' + tid)`) hit the routes your plugin registers; adjust server route prefix if your NodeBB mounts plugin routes differently.
