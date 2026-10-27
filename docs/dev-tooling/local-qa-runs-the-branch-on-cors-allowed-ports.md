# 🎯 Local QA runs the branch on CORS-allowed ports

## 💡 Convention

Browser QA of a worktree runs **that worktree's** code against its **own** local database, on ports the backend already accepts:

- **Backend:** any free port (e.g. `8017`), started with `MONGODB_URL` pointing at the compose Mongo (`admin:password123@localhost:27017/?authSource=admin`) and a throwaway `DATABASE_NAME` (`spainaikikai_qa_<topic>`) seeded with invented data, dropped when QA ends.
- **Admin web:** port `5174` (or `5173`) with `VITE_API_URL` pointing at that backend. Card app as Expo web: port `8083`. Those are the origins `src/app.py` allows by CORS; any other port gets blocked calls that look like a broken backend.
- **Card app in dev calls `http://localhost:8000/api/v1` hard-coded.** Port 8000 is often taken by another session. After opening the app, patch `window.fetch` and `XMLHttpRequest.prototype.open` in the page to swap `localhost:8000` for your backend port, and re-apply after every reload (agent-browser routes cannot redirect).
- **Expo with `CI=1` does not hot-reload.** After changing app code, stop and restart `expo start --web --clear`; a screenshot before that shows the old screen.
- **Restart the backend after backend commits**: uvicorn runs without `--reload`, so QA otherwise tests stale code.
- **No SMTP locally.** Read set-password links from the QA database (`password_reset_tokens`) instead of waiting for mail.
- The shell is zsh with `noclobber`: overwrite logs with `>|`, or the command fails before starting.

## 🏆 Benefits

- 2026-10-26/27: QA runs were lost to ports already in use, CORS-blocked origins, a frontend pointing at the wrong backend, a stale Expo bundle and a stale backend; each looked like a bug in the branch.
- A dedicated database means agents can create and deregister freely without touching anyone's data.

## 👀 Examples

### ✅ Good: branch backend on its own DB, panel on an allowed port

```bash
MONGODB_URL="mongodb://admin:password123@localhost:27017/?authSource=admin" \
DATABASE_NAME=spainaikikai_qa_card SENTRY_DSN= \
poetry run uvicorn src.main:app --port 8017 >| /tmp/qa-backend.log 2>&1

VITE_API_URL=http://localhost:8017 npx vite --port 5174 --strictPort
```

### ❌ Bad: a port CORS rejects, and the default database

```bash
npx vite --port 5183      # every API call blocked by CORS
poetry run uvicorn src.main:app --port 8017   # uses backend/.env database
```

## 🧐 Real world examples

- [`src/app.py`](../../backend/src/app.py) (CORS origins)
- [`mobile/src/core/api-client.ts`](../../mobile/src/core/api-client.ts) (hard-coded dev URL)

## 🔗 Related agreements

- [Development commands](development-commands.md)
- [No production data in the repository](../testing/no-production-data.md)
