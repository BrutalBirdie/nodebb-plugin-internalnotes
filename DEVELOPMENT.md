# Development

## Local development setup

```bash
cd /path/to/nodebb
npm link /path/to/nodebb-plugin-internalnotes
./nodebb build
./nodebb dev
```

## Standards and linting

- The plugin follows [NodeBB plugin standards](https://docs.nodebb.org/development/plugins/); see [NODEBB_STANDARDS_AUDIT.md](NODEBB_STANDARDS_AUDIT.md) for a full audit.
- Lint: `npm run lint` (ESLint).

## Publishing to npm

A GitHub Action (`.github/workflows/publish-npm.yml`) runs lint and publishes to [npm](https://www.npmjs.com/~brutalbirdie) when:

- A **release** is published on GitHub, or
- The workflow is run manually (**Actions → Lint and publish to npm → Run workflow**).

**One-time setup:** In this repo, go to **Settings → Secrets and variables → Actions** and add a secret named `NPM_TOKEN` with an [npm access token](https://www.npmjs.com/settings/brutalbirdie/tokens) (Automation type is recommended). The workflow will only publish if `npm run lint` passes.
