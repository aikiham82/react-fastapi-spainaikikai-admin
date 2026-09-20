# 🎯 Project layout

## 💡 Convention

The repository holds three independent workspaces, each with its own toolchain and its own dependency file. There is no root package manager tying them together.

```
backend/     FastAPI + Motor (MongoDB), Poetry, hexagonal architecture
frontend/    React 19 + TypeScript + Vite, npm, feature-based architecture
mobile/      Expo (React Native) member licence app, npm
```

Entry points worth knowing:

| Path | Role |
|---|---|
| [`backend/src/app.py`](../../backend/src/app.py) | FastAPI application factory |
| [`backend/src/main.py`](../../backend/src/main.py) | Backend application entry point |
| [`backend/pytest.ini`](../../backend/pytest.ini) | Test configuration, markers and the coverage gate |
| [`frontend/src/main.tsx`](../../frontend/src/main.tsx) | React application entry point |
| [`frontend/vite.config.ts`](../../frontend/vite.config.ts) | Vite and Vitest configuration |
| [`mobile/app.json`](../../mobile/app.json) | Expo application configuration |
| [`docker-compose.yml`](../../docker-compose.yml) | Local MongoDB |

Harness directories, which hold instructions rather than shipped code:

| Path | Role |
|---|---|
| `AGENTS.md` | Entry point for any agent. `CLAUDE.md` is a symlink to it. |
| `docs/` | One document per convention, indexed from `AGENTS.md`. |
| `.agents/plans/` | Implementation plans, one dated folder each. |
| `.claude/sessions/` | Live feature session context files. |
| `.claude/agents/` | Project-local subagent definitions. |

## 🏆 Benefits

- Each workspace builds, tests and deploys on its own, so a frontend change cannot break the backend build.
- A newcomer knows which directory to open from the nature of the task alone.
- Keeping the harness directories listed here means instruction files are discoverable rather than folklore.

## 👀 Examples

### ✅ Good: running a command from its workspace

```bash
cd backend && poetry run pytest
cd frontend && npm run lint
```

### ❌ Bad: assuming a root-level toolchain

```bash
npm test          # there is no root package.json
pytest            # needs the Poetry environment in backend/
```

## 🧐 Real world examples

- [`backend/pyproject.toml`](../../backend/pyproject.toml)
- [`frontend/package.json`](../../frontend/package.json)
- [`mobile/package.json`](../../mobile/package.json)

## 🔗 Related agreements

- [`backend-hexagonal.md`](backend-hexagonal.md)
- [`frontend-features.md`](frontend-features.md)
- [`../dev-tooling/development-commands.md`](../dev-tooling/development-commands.md)
