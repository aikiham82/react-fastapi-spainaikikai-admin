# 🎯 Development commands

## 💡 Convention

Every command runs from its own workspace. There is no root-level task runner.

### Database

```bash
docker compose up -d        # MongoDB on port 27017
```

### Backend (from `backend/`)

```bash
poetry install                              # install dependencies
poetry run uvicorn src.main:app --reload    # dev server on port 8000

poetry run pytest                           # full suite with coverage gate
poetry run pytest -m unit                   # unit tests only
poetry run pytest -m integration            # integration tests only
poetry run pytest -m "not slow"             # skip slow tests
poetry run pytest tests/test_domain_entities.py
poetry run pytest -k "test_user"            # tests matching a pattern

poetry add <package>                        # add a dependency
poetry add --group dev <package>            # add a dev dependency
```

### Frontend (from `frontend/`)

```bash
npm install
npm run dev              # dev server on port 5173
npm run build            # tsc -b && vite build
npm run lint             # eslint
npm run test             # vitest
npm run test:coverage
npm run preview
```

### Mobile (from `mobile/`)

```bash
npm install
npm run start            # expo start
npm run android
npm run ios
```

### Before committing

```bash
cd backend  && poetry run pytest
cd frontend && npm run lint && npm run build && npm run test
```

Ports: backend `8000`, frontend `5173`, MongoDB `27017`.

## 🏆 Benefits

- One place to look up a command, instead of reconstructing it from three config files.
- The pre-commit block is the definition of "green", so "it works on my machine" has a shared meaning.
- Naming the ports avoids the recurring confusion of a service appearing to be down when it is listening elsewhere.

## 👀 Examples

### ✅ Good: run the backend suite from its workspace

```bash
cd backend && poetry run pytest -m unit
```

### ❌ Bad: run it from the repository root

```bash
pytest -m unit    # no Poetry environment active, wrong rootdir, no coverage config
```

## 🧐 Real world examples

- [`backend/pytest.ini`](../../backend/pytest.ini): coverage gate and markers.
- [`frontend/package.json`](../../frontend/package.json): the npm scripts above.
- [`docker-compose.yml`](../../docker-compose.yml): the MongoDB service.

## 🔗 Related agreements

- [`../architecture/project-layout.md`](../architecture/project-layout.md)
- [`../testing/testing-strategy.md`](../testing/testing-strategy.md)
