# 🎯 Publishing the card app update

## 💡 Convention

Card app (`mobile/`) changes reach phones with an over-the-air update, published **after** the push and **from the code on `origin/main`**:

1. Push `main` first, so the API the app needs is (or will be) deployed.
2. Create a detached worktree of `origin/main`, `npm ci` in its `mobile/`, typecheck, then
   `npx eas-cli update --channel production --platform android --message "<what changes>" --non-interactive`.
3. Remove the temporary worktree.
4. Check it with `npx eas-cli update:list --branch production --limit 2`.

Only Android is published (runtime `1.0.0`). A phone downloads the update when it opens the app and applies it on the next start: tell clients to close the app fully and reopen it.

## 🏆 Benefits

- 2026-10-27: while publishing, the main checkout had been switched to another session's branch; publishing from it would have shipped that branch. A worktree of `origin/main` ships exactly what was pushed.
- Publishing after the push avoids an app calling an endpoint the server does not have yet.

## 👀 Examples

### ✅ Good: from a worktree of what was pushed

```bash
git worktree add .claude/worktrees/eas-main origin/main --detach
cd .claude/worktrees/eas-main/mobile && npm ci && npx tsc --noEmit
npx eas-cli update --channel production --platform android --message "Activa tu carné desde la app" --non-interactive
```

### ❌ Bad: from whatever the shared checkout holds

```bash
cd ~/Projects/react-fastapi-spainaikikai-admin/mobile && npx eas-cli update ...
```

## 🧐 Real world examples

- [`mobile/app.json`](../../mobile/app.json) (`updates.url`, runtime)

## 🔗 Related agreements

- [GitHub account for pushing](github-account.md)
- [Integrating a finished branch](../git/integrating-a-finished-branch.md)
